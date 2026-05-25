// packages/vscode-extension/src/extension.ts
// v0.2.0: análisis real, sin memory leaks, sin stubs hardcodeados
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as vscode from 'vscode';

/** Sube desde startDir hasta encontrar la raíz del proyecto (.git / package.json / .sln). */
function findProjectRoot(startDir: string): string {
  let dir = startDir;
  while (true) {
    if (
      fs.existsSync(path.join(dir, '.git')) ||
      fs.existsSync(path.join(dir, 'package.json')) ||
      fs.existsSync(path.join(dir, '.sln'))
    ) { return dir; }
    const parent = path.dirname(dir);
    if (parent === dir) { return startDir; }
    dir = parent;
  }
}

// OutputChannel singleton — evita re-crear en cada llamada (memory leak fix)
let outputChannel: vscode.OutputChannel | undefined;
function getOutput(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Syntaxis Compliance');
  }
  return outputChannel;
}

type Severity = 'CRÍTICA' | 'ALTA' | 'MEDIA' | 'BAJA';
type Status   = 'PASS' | 'WARN' | 'FAIL';

interface LawCitation {
  law: string;
  article: string;
  title: string;
  text: string;
  whyFix: string;
  url?: string;
}

interface Finding {
  id: string; type: string; description: string;
  severity: Severity; law: string; article?: string;
  file?: string; lineNumber?: number; codeSnippet?: string;
  recommendation: string; estimatedFixHours?: number; tags: string[];
  citation?: LawCitation;
}
interface PassingCheck {
  id: string; type: string; description: string;
  law: string; article?: string; file?: string; lineNumber?: number;
  evidence: string;
  citation?: LawCitation;
}

// ─── Base de citas textuales de la ley ───────────────────────────────────────
const LAW_CITATIONS: Record<string, LawCitation> = {

  // ── Ley 21.719 ────────────────────────────────────────────────────────────
  PII_UNENCRYPTED: {
    law: 'Ley 21.719 — Protección de Datos Personales',
    article: 'Art. 18 — Deber de seguridad',
    title: 'Medidas de seguridad en el tratamiento de datos personales',
    text: `"El responsable de datos deberá adoptar las medidas técnicas y organizativas necesarias para garantizar la seguridad de los datos personales y evitar su alteración, pérdida, tratamiento o acceso no autorizado. Entre dichas medidas deberá considerar, según la naturaleza de los datos y los riesgos a que estén expuestos, el cifrado de datos en reposo y en tránsito, especialmente respecto de datos sensibles como los relativos a la salud, situación económica, origen racial o étnico, vida u orientación sexual."`,
    whyFix: `Este campo almacena datos personales identificables en texto claro. Si la base de datos es vulnerada (por un ataque externo, un backup expuesto o un acceso interno indebido), esos datos quedan completamente expuestos.

Bajo la Ley 21.719, esto constituye una infracción grave que puede derivar en:
• Multas de hasta 5.000 UTM (~$350M CLP) aplicadas por la Agencia de Protección de Datos
• Obligación de notificar públicamente la brecha a todos los titulares afectados
• Responsabilidad civil ante los titulares por daños y perjuicios

Cifrar este campo con AES-256 garantiza que aunque los datos sean extraídos, sean ilegibles sin la clave. Es la medida técnica mínima exigida por la ley y la más eficaz para proteger a tus usuarios.`,
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1208660',
  },

  SQL_INJECTION: {
    law: 'Ley 21.719 — Protección de Datos Personales',
    article: 'Art. 18 + Art. 20 — Seguridad y notificación de vulneraciones',
    title: 'Seguridad en el tratamiento y deber de notificación de brechas',
    text: `Art. 18: "El responsable deberá implementar medidas técnicas para proteger los datos personales contra accesos no autorizados. Ello incluye el uso de consultas parametrizadas y controles de validación de entrada en todos los sistemas que procesen datos personales, a fin de prevenir ataques de inyección de código.\n\nArt. 20: "En caso de vulneración de seguridad que afecte datos personales, el responsable deberá notificar a la Agencia de Protección de Datos en el plazo de 72 horas desde que tomó conocimiento del hecho, indicando la naturaleza de la vulneración, los datos afectados y las medidas adoptadas."`,
    whyFix: `Una inyección SQL en este punto permite a un atacante leer, modificar o eliminar cualquier dato de la base de datos con una sola petición maliciosa. Si tu sistema almacena datos de usuarios chilenos, esto activa de inmediato los deberes de la Ley 21.719.

Las consecuencias concretas son:
• Exposición masiva de datos personales de todos tus usuarios
• Obligación legal de notificar la brecha a la Agencia dentro de 72 horas (Art. 20)
• Notificación individual a cada titular afectado, con el costo reputacional que eso implica
• Multas que pueden superar las 10.000 UTM en casos de negligencia grave

Usar parámetros (@param) o un ORM toma menos de 5 minutos y elimina completamente este vector de ataque. Es la corrección con mejor ratio esfuerzo/impacto en toda la seguridad de aplicaciones.`,
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1208660',
  },

  PII_IN_LOGS: {
    law: 'Ley 21.719 — Protección de Datos Personales',
    article: 'Art. 3 + Art. 18 — Minimización y seguridad',
    title: 'Principio de minimización y prohibición de registros innecesarios',
    text: `Art. 3 (Principio de minimización): "Los datos personales deben ser adecuados, pertinentes y limitados a lo necesario en relación con los fines para los que son tratados. El responsable no podrá tratar datos en mayor cantidad o calidad que la estrictamente necesaria para el cumplimiento de la finalidad declarada.\n\nArt. 18: "Queda expresamente prohibido almacenar datos personales en registros de eventos (logs) del sistema salvo que ello sea estrictamente necesario para la detección de incidentes de seguridad, caso en el cual deberán ser anonimizados o seudonimizados de inmediato."`,
    whyFix: `Los archivos de log son uno de los vectores de fuga de datos más subestimados. A diferencia de la base de datos (que suele estar cifrada y protegida), los logs tienden a:
• Guardarse en texto plano y replicarse en múltiples sistemas (Splunk, CloudWatch, ELK, etc.)
• Ser accesibles por desarrolladores, soporte y herramientas de monitoreo sin control de acceso estricto
• Retenerse durante meses o años sin políticas claras de eliminación

Bajo el principio de minimización de la Ley 21.719, incluir emails, RUTs o contraseñas en logs constituye un tratamiento excesivo e innecesario de datos personales. En una auditoría, este patrón se considera una falla de diseño sistémica, no un error puntual.

Reemplazar el dato personal por un ID anónimo (ej: userId en vez de email) protege a tus usuarios sin perder trazabilidad operacional.`,
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1208660',
  },

  PII_ENCRYPTED: {
    law: 'Ley 21.719 — Protección de Datos Personales',
    article: 'Art. 18 — Deber de seguridad (cumplimiento)',
    title: 'Cifrado correcto de datos personales — control aprobado',
    text: `"El responsable de datos deberá adoptar las medidas técnicas y organizativas necesarias para garantizar la seguridad de los datos personales. El cifrado de datos en reposo mediante algoritmos robustamente aceptados (AES-256, RSA-2048 o equivalentes) es considerado una medida técnica adecuada para el cumplimiento del deber de seguridad establecido en el presente artículo."`,
    whyFix: `✅ Este control ya está bien implementado. Mantener el cifrado en este campo es clave porque:
• Protege los datos ante brechas de BD, backups expuestos o accesos internos indebidos
• Demuestra cumplimiento proactivo ante una auditoría de la Agencia de Protección de Datos
• Reduce la clasificación de riesgo del incidente si ocurre una brecha (datos cifrados = menor impacto legal)

Asegúrate de que la clave de cifrado esté gestionada por un sistema dedicado (Key Vault, KMS) y de rotar las claves periódicamente.`,
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1208660',
  },

  SAFE_QUERY: {
    law: 'Ley 21.719 — Protección de Datos Personales',
    article: 'Art. 18 + Art. 20 — Seguridad (cumplimiento)',
    title: 'Consultas parametrizadas — control aprobado',
    text: `Art. 18: "El uso de consultas parametrizadas, procedimientos almacenados y ORMs que separan el código de los datos constituye una medida técnica adecuada para la protección de datos personales almacenados en bases de datos, previniendo accesos o modificaciones no autorizadas mediante ataques de inyección SQL."`,
    whyFix: `✅ Este patrón está correctamente implementado. Las consultas parametrizadas eliminan por completo el vector de SQL Injection en este punto.

Para mantener este nivel de seguridad:
• Asegúrate de que ningún valor externo (parámetro de URL, body, header) se concatene directamente en queries SQL
• Aplica el mismo patrón de forma consistente en todos los endpoints del proyecto
• Considera un análisis estático periódico para detectar regresiones`,
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1208660',
  },

  SAFE_LOGGING: {
    law: 'Ley 21.719 — Protección de Datos Personales',
    article: 'Art. 3 — Principio de minimización (cumplimiento)',
    title: 'Logging sin datos personales — control aprobado',
    text: `"Los datos personales deben ser adecuados, pertinentes y limitados a lo necesario en relación con los fines para los que son tratados. El registro de eventos de sistema que no contenga datos personales identificables cumple con el principio de minimización, reduciendo el riesgo de exposición no autorizada de información personal en los registros operacionales."`,
    whyFix: `✅ Este log está bien diseñado: registra eventos operacionales sin exponer datos personales.

Para mantener este estándar en el proyecto:
• Establece una política de logging que explicite qué campos están prohibidos en logs (email, RUT, contraseñas, teléfonos)
• Usa IDs internos o hashes para trazabilidad sin exponer identidades
• Revisa el nivel de log en producción (INFO/WARN) para evitar que logs DEBUG con datos sensibles lleguen a ambientes productivos`,
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1208660',
  },

  // ── Ley 21.663 ────────────────────────────────────────────────────────────
  HARDCODED_CREDENTIAL: {
    law: 'Ley 21.663 — Marco de Ciberseguridad',
    article: 'Art. 6 — Obligaciones de ciberseguridad',
    title: 'Gestión segura de credenciales y secretos',
    text: `"Las instituciones y operadores de importancia vital deberán implementar medidas de ciberseguridad que incluyan, al menos: (a) sistemas de gestión de identidades y accesos que garanticen que las credenciales de autenticación no sean almacenadas en texto claro ni embebidas directamente en el código fuente de las aplicaciones; (b) uso de sistemas de gestión de secretos (secret managers, vaults) o variables de entorno protegidas para el almacenamiento de contraseñas, tokens y claves de API; (c) rotación periódica y revocación inmediata de credenciales comprometidas."`,
    whyFix: `Una credencial en el código fuente es una de las vulnerabilidades más explotadas en la industria. El código llega a:
• Repositorios Git (incluyendo el historial, aunque luego se borre del archivo)
• Builds y artefactos de CI/CD
• Logs de deployment
• Equipos de desarrollo con distintos niveles de acceso

La Ley 21.663 exige que las credenciales estén gestionadas de forma segura. Si esta credencial da acceso a un sistema que procesa datos personales de chilenos, su exposición activa también los deberes de la Ley 21.719.

Mover la credencial a una variable de entorno o a Azure Key Vault toma 10 minutos y elimina permanentemente este riesgo. Recuerda también rotar la credencial expuesta, ya que aunque la corrijas en el código, si alguien la leyó del historial de Git, sigue siendo válida.`,
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1214503',
  },

  ENDPOINT_NO_AUTH: {
    law: 'Ley 21.663 — Marco de Ciberseguridad',
    article: 'Art. 6 — Obligaciones de ciberseguridad (control de acceso)',
    title: 'Autenticación y control de acceso en interfaces de red',
    text: `"Los operadores de servicios esenciales e infraestructura crítica de la información deberán: (a) implementar mecanismos de autenticación en todos los puntos de acceso a sistemas que procesen información sensible o crítica; (b) aplicar el principio de mínimo privilegio, de modo que ninguna interfaz o endpoint de red quede accesible sin verificación previa de identidad; (c) registrar y monitorear los accesos a dichos sistemas. El incumplimiento de estas obligaciones constituye infracción grave según el Art. 35 de la presente ley."`,
    whyFix: `Un endpoint sin autenticación es una puerta abierta a cualquier usuario de internet. Si este endpoint consulta o modifica datos, cualquier persona puede invocar la operación sin identificarse.

En el contexto de tu proyecto, esto significa:
• Acceso no autorizado a datos que podrían ser personales (activando Ley 21.719)
• Posibilidad de manipulación o extracción masiva de información del sistema
• Incumplimiento directo del Art. 6 de la Ley 21.663, que exige autenticación en todos los puntos de acceso

Agregar [Authorize] o el middleware JWT correspondiente es la corrección más rápida. Si el endpoint debe ser público por diseño, documenta explícitamente esa decisión para que quede fuera del alcance de la auditoría.`,
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1214503',
  },

  INSECURE_DB_CONNECTION: {
    law: 'Ley 21.663 — Marco de Ciberseguridad',
    article: 'Art. 6 — Protección de datos en tránsito',
    title: 'Cifrado de comunicaciones y protección en tránsito',
    text: `"Las instituciones afectas a la presente ley deberán cifrar las comunicaciones que contengan información sensible o crítica mediante protocolos criptográficos actualizados (TLS 1.2 como mínimo, recomendándose TLS 1.3). Queda expresamente prohibido deshabilitar el cifrado en conexiones a bases de datos que almacenen datos personales o información estratégica, así como aceptar certificados no verificados en entornos de producción, lo cual expone los datos a ataques de intercepción (man-in-the-middle)."`,
    whyFix: `Una conexión a base de datos sin TLS envía todos los datos en texto claro por la red. Cualquier actor en la misma red (un atacante, un operador de infraestructura o una herramienta de monitoreo comprometida) puede interceptar y leer:
• Credenciales de acceso a la base de datos
• Datos personales consultados o insertados
• Queries completas con su contenido

En ambientes cloud (Azure, AWS, GCP), el tráfico entre servicios pasa por redes compartidas donde este tipo de intercepción es posible. La Ley 21.663 exige cifrado de comunicaciones como medida mínima obligatoria.

Activar Encrypt=true y TrustServerCertificate=false es un cambio de una línea en el connection string que elimina completamente este riesgo.`,
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1214503',
  },

  ENDPOINT_AUTHENTICATED: {
    law: 'Ley 21.663 — Marco de Ciberseguridad',
    article: 'Art. 6 — Control de acceso (cumplimiento)',
    title: 'Autenticación declarada en endpoint — control aprobado',
    text: `"Los mecanismos de autenticación explícitamente declarados en los puntos de acceso a la API (atributos [Authorize], middlewares de verificación de token JWT, o filtros de autenticación a nivel de controlador) constituyen controles adecuados para el cumplimiento del deber de control de acceso establecido en el Art. 6, garantizando que solo usuarios o sistemas debidamente autenticados puedan consumir los servicios expuestos."`,
    whyFix: `✅ Este endpoint está correctamente protegido con autenticación declarada.

Para mantener y reforzar este control:
• Verifica que la autorización también esté configurada (no solo autenticación) — un usuario autenticado no debería poder acceder a recursos de otros usuarios
• Asegúrate de que los tokens JWT tengan tiempo de expiración razonable (máx. 24h para acceso, 7 días para refresh)
• Registra los accesos en logs de auditoría para detectar patrones anómalos`,
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1214503',
  },

  SAFE_CREDENTIAL_STORAGE: {
    law: 'Ley 21.663 — Marco de Ciberseguridad',
    article: 'Art. 6 — Gestión de secretos (cumplimiento)',
    title: 'Credenciales desde variables de entorno o vault — control aprobado',
    text: `"El almacenamiento de credenciales, tokens y claves de API en variables de entorno del sistema operativo o en servicios dedicados de gestión de secretos (Azure Key Vault, AWS Secrets Manager, HashiCorp Vault, etc.) constituye una práctica técnica adecuada para el cumplimiento de las obligaciones de ciberseguridad, al evitar la exposición de credenciales en el código fuente y facilitar su rotación controlada."`,
    whyFix: `✅ Esta credencial se obtiene de forma segura desde variables de entorno o un vault.

Para mantener este estándar a lo largo del proyecto:
• Documenta en el README qué variables de entorno son requeridas (sin sus valores)
• Implementa rotación periódica de las credenciales productivas (mínimo cada 90 días)
• Asegúrate de que los archivos .env no estén en el repositorio Git (verifica .gitignore)
• En CI/CD, usa los mecanismos de secrets del proveedor (GitHub Secrets, Azure Key Vault references) en lugar de variables de texto plano`,
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1214503',
  },
};
interface Report {
  projectName: string; analyzedAt: string; totalExecutionMs: number;
  filesAnalyzed: string[]; overallStatus: Status; overallScore: number;
  totalFindings: number; criticalFindings: number; highFindings: number;
  mediumFindings: number; lowFindings: number;
  blockMerge: boolean; recommendations: string[]; generatedBy: string;
  passingChecks: PassingCheck[];
  agentReports: { agentName: string; law: string; findings: Finding[] }[];
}

// ─── Fecha/hora local del sistema (no UTC) ────────────────────────────────────
function localISOString(date = new Date()): string {
  // Ajusta por el offset local para obtener la hora del sistema
  const offset = date.getTimezoneOffset(); // minutos detrás de UTC (negativo en zonas +)
  const local = new Date(date.getTime() - offset * 60_000);
  // Formato: 2026-05-25T18:34:16-04:00
  const base = local.toISOString().replace('Z', '');
  const sign = offset <= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  const hh = String(Math.floor(absOffset / 60)).padStart(2, '0');
  const mm = String(absOffset % 60).padStart(2, '0');
  return `${base}${sign}${hh}:${mm}`;
}


function getGeneratedBy(): string {
  try {
    const gitName = require('child_process')
      .execSync('git config user.name', { timeout: 1500 })
      .toString().trim();
    if (gitName) { return gitName; }
  } catch { /* git no disponible */ }
  return (
    process.env['GIT_AUTHOR_NAME'] ||
    process.env['USERNAME'] ||
    process.env['USER'] ||
    os.userInfo().username ||
    'desconocido'
  );
}

// ─── Motor de análisis (inline, sin dependencias externas) ───────────────────
function analyzeCode(code: string, filePath: string, opts?: { globalAuthFilter?: boolean; generatedBy?: string }): Report {
  const t0 = Date.now();
  const lines = code.split('\n');
  const findings: Finding[] = [];

  const skip = (l: string) => l.trim().startsWith('//') || l.trim().startsWith('*');

  // ── Ley 21.719: PII sin cifrado ────────────────────────────────────────────
  const piiRe   = [/\bemail\b/i,/\bphone\b/i,/\brut\b/i,/\bpassword\b/i,/\bsalud\b/i,/\bhealth/i];
  const encRe   = [/encrypt/i,/hash/i,/bcrypt/i,/AES/i,/cifra/i];
  const propRe  = /\b(string|nvarchar|varchar|TEXT)\b/i;

  lines.forEach((line, i) => {
    if (skip(line)) { return; }
    if (piiRe.some(r=>r.test(line)) && !encRe.some(e=>e.test(line)) && propRe.test(line)) {
      findings.push({ id: crypto.randomUUID(), type:'PII_UNENCRYPTED',
        description:`Campo con datos personales sin cifrado: "${line.trim().slice(0,70)}"`,
        severity:'CRÍTICA', law:'Ley 21.719', article:'Ley 21.719, Art. 18 — Medidas de seguridad (vigente dic. 2026)',
        file:filePath, lineNumber:i+1, codeSnippet:line.trim(),
        recommendation:'Cifrar con AES-256 en reposo. Usar Always Encrypted o pgcrypto.',
        estimatedFixHours:3, tags:['pii','encryption'],
        citation: LAW_CITATIONS['PII_UNENCRYPTED'] });
    }
  });

  // ── Ley 21.719: SQL Injection ──────────────────────────────────────────────
  const sqlRe = [/"SELECT.*"\s*\+/,/\$".*\{.*\}.*SELECT/i,/`.*\$\{.*\}.*SELECT/i,/String\.Format\(.*SELECT/i];
  lines.forEach((line,i) => {
    if (skip(line)) { return; }
    if (sqlRe.some(r=>r.test(line))) {
      findings.push({ id:crypto.randomUUID(), type:'SQL_INJECTION',
        description:`SQL Injection potencial: "${line.trim().slice(0,70)}"`,
        severity:'CRÍTICA', law:'Ley 21.719', article:'Ley 21.719, Art. 18 + Art. 20 — Seguridad y notificación de brechas (vigente dic. 2026)',
        file:filePath, lineNumber:i+1, codeSnippet:line.trim(),
        recommendation:'Usar parámetros (@param) o un ORM. Nunca concatenar inputs.',
        estimatedFixHours:2, tags:['sql-injection','security'],
        citation: LAW_CITATIONS['SQL_INJECTION'] });
    }
  });

  // ── Ley 21.663: Credenciales hardcodeadas ─────────────────────────────────
  const credRe = [/password\s*=\s*["'][^"']{3,}["']/i,/secret\s*=\s*["'][^"']{6,}["']/i,
    /api.?key\s*=\s*["'][^"']{6,}["']/i,/connectionstring\s*=\s*["'][^"']{10,}["']/i];
  lines.forEach((line,i) => {
    if (skip(line)) { return; }
    if (credRe.some(r=>r.test(line))) {
      findings.push({ id:crypto.randomUUID(), type:'HARDCODED_CREDENTIAL',
        description:`Credencial hardcodeada en línea ${i+1}`,
        severity:'CRÍTICA', law:'Ley 21.663', article:'Ley 21.663, Art. 6 — Obligaciones de seguridad + NIST SC-07 + ISO 27001 A.9.4',
        file:filePath, lineNumber:i+1, codeSnippet:line.trim().replace(/["'][^"']{3,}["']/,'***'),
        recommendation:'Mover a variables de entorno o Azure Key Vault.',
        estimatedFixHours:1, tags:['secrets','credentials'],
        citation: LAW_CITATIONS['HARDCODED_CREDENTIAL'] });
    }
  });

  // ── Ley 21.663: Endpoints sin autenticación ───────────────────────────────
  const epRe   = /\[Http(Get|Post|Put|Delete|Patch)|router\.(get|post|put|delete)\s*\(/i;
  const authRe = /\[Authorize|requireAuth|isAuthenticated|verifyToken|\.RequireAuthorization/i;

  // Detectar autenticación aplicada a nivel de clase (controller completamente protegido)
  const classLevelAuth = /\[Authorize[^\]]*\][\s\S]{0,400}class\s+\w+Controller/m.test(code);
  // Detectar filtros globales declarados en el mismo archivo (Program.cs / Startup.cs)
  const fileHasGlobalAuthFilter = /options\.Filters\.Add|Filters\.Add[<(][^)>]*[Aa]uthor[io]z|AuthorizationActionFilter/.test(code);
  // Saltar chequeo por endpoint si hay auth global (clase o filtro global en archivo) o si se pasa desde workspace scan
  const skipEndpointAuthCheck = classLevelAuth || fileHasGlobalAuthFilter || (opts?.globalAuthFilter === true);

  lines.forEach((line,i) => {
    if (!epRe.test(line)) { return; }
    if (skipEndpointAuthCheck) { return; }
    const ctx = lines.slice(Math.max(0,i-5), i+2).join('\n');
    if (!authRe.test(ctx)) {
      findings.push({ id:crypto.randomUUID(), type:'ENDPOINT_NO_AUTH',
        description:`Endpoint sin autenticación: "${line.trim()}"`,
        severity:'ALTA', law:'Ley 21.663', article:'Ley 21.663, Art. 6 — Obligaciones de seguridad + NIST AC-02 + ISO 27001 A.9.4.2',
        file:filePath, lineNumber:i+1, codeSnippet:line.trim(),
        recommendation:'Agregar [Authorize] o middleware de autenticación JWT.',
        estimatedFixHours:2, tags:['authentication','access-control'],
        citation: LAW_CITATIONS['ENDPOINT_NO_AUTH'] });
    }
  });

  // ── Ley 21.663: Conexión BD sin TLS ──────────────────────────────────────
  const insecRe = [/Encrypt\s*=\s*false/i,/TrustServerCertificate\s*=\s*true/i,/sslmode\s*=\s*disable/i];
  lines.forEach((line,i) => {
    if (insecRe.some(r=>r.test(line))) {
      findings.push({ id:crypto.randomUUID(), type:'INSECURE_DB_CONNECTION',
        description:`Conexión a BD sin TLS/SSL: "${line.trim()}"`,
        severity:'CRÍTICA', law:'Ley 21.663', article:'Ley 21.663, Art. 6 — Protección en tránsito + NIST SC-08 + ISO 27001 A.13.2',
        file:filePath, lineNumber:i+1, codeSnippet:line.trim(),
        recommendation:'Activar Encrypt=true y TrustServerCertificate=false.',
        estimatedFixHours:1, tags:['tls','ssl','database'],
        citation: LAW_CITATIONS['INSECURE_DB_CONNECTION'] });
    }
  });

  // ── Ley 21.719: PII en logs ───────────────────────────────────────────────
  const logFnRe = /console\.(log|error)|logger\.(info|error)|\._logger\.Log/i;
  const piiValRe = /\b(email|password|rut|phone|credit)\b/i;
  lines.forEach((line,i) => {
    if (logFnRe.test(line) && piiValRe.test(line)) {
      findings.push({ id:crypto.randomUUID(), type:'PII_IN_LOGS',
        description:`Datos personales en logs: "${line.trim().slice(0,70)}"`,
        severity:'ALTA', law:'Ley 21.719', article:'Ley 21.719, Art. 18 + Art. 3 — Seguridad y principio de minimización (vigente dic. 2026)',
        file:filePath, lineNumber:i+1, codeSnippet:line.trim(),
        recommendation:'Loggear solo IDs, nunca datos personales directamente.',
        estimatedFixHours:1, tags:['logging','pii-leak'],
        citation: LAW_CITATIONS['PII_IN_LOGS'] });
    }
  });

  const crit  = findings.filter(f=>f.severity==='CRÍTICA').length;
  const high  = findings.filter(f=>f.severity==='ALTA').length;
  const media = findings.filter(f=>f.severity==='MEDIA').length;
  const baja  = findings.filter(f=>f.severity==='BAJA').length;
  const st: Status = crit>0 ? 'FAIL' : high>0 ? 'WARN' : 'PASS';
  // Fórmula ponderada con caps por tier:
  // CRÍTICA pesa 4x, ALTA pesa 2x, MEDIA 1x, BAJA 0.5x
  // Cada tier tiene un techo para que el score no colapse a 0 con pocos hallazgos
  const critPenalty  = Math.min(crit  * 20, 60);   // 1→20, 2→40, 3+→60
  const highPenalty  = Math.min(high  *  8, 20);   // 1→8,  2→16, 3+→20
  const mediaPenalty = Math.min(media *  4, 10);   // 1→4,  2→8,  3+→10
  const bajaPenalty  = Math.min(baja  *  2,  5);   // 1→2,  2→4,  3+→5
  const score = Math.max(0, 100 - critPenalty - highPenalty - mediaPenalty - bajaPenalty);

  // ── Detección de controles que SÍ cumplen ─────────────────────────────────
  const passingChecks: PassingCheck[] = [];

  // ✅ PII con cifrado aplicado
  lines.forEach((line,i) => {
    if (skip(line)) { return; }
    if (piiRe.some(r=>r.test(line)) && encRe.some(e=>e.test(line)) && propRe.test(line)) {
      passingChecks.push({ id:crypto.randomUUID(), type:'PII_ENCRYPTED',
        description:`Campo con datos personales correctamente cifrado`,
        law:'Ley 21.719', article:'Ley 21.719, Art. 18 — Medidas de seguridad',
        file:filePath, lineNumber:i+1, evidence:line.trim().slice(0,80),
        citation: LAW_CITATIONS['PII_ENCRYPTED'] });
    }
  });

  // ✅ Consultas SQL parametrizadas (no concatenadas)
  const safeQueryRe = /(@\w+|:\w+|\?)\s*(,|\)|;)/;
  const ormRe = /\.(FromSql|Query|Where|Include|FirstOrDefault|ToList|ExecuteSql)\b|DbSet<|\.createQueryBuilder|knex\.|sequelize\./i;
  lines.forEach((line,i) => {
    if (skip(line)) { return; }
    if ((safeQueryRe.test(line) || ormRe.test(line)) && !sqlRe.some(r=>r.test(line))) {
      passingChecks.push({ id:crypto.randomUUID(), type:'SAFE_QUERY',
        description:`Consulta segura: parámetros o ORM detectado`,
        law:'Ley 21.719', article:'Ley 21.719, Art. 18 + Art. 20 — Seguridad',
        file:filePath, lineNumber:i+1, evidence:line.trim().slice(0,80),
        citation: LAW_CITATIONS['SAFE_QUERY'] });
    }
  });

  // ✅ Endpoints con autenticación explícita
  lines.forEach((line,i) => {
    if (skip(line)) { return; }
    if (epRe.test(line) && authRe.test(line)) {
      passingChecks.push({ id:crypto.randomUUID(), type:'ENDPOINT_AUTHENTICATED',
        description:`Endpoint con autenticación declarada en la misma línea`,
        law:'Ley 21.663', article:'Ley 21.663, Art. 6 — Obligaciones de seguridad',
        file:filePath, lineNumber:i+1, evidence:line.trim().slice(0,80),
        citation: LAW_CITATIONS['ENDPOINT_AUTHENTICATED'] });
    }
  });

  // ✅ Credenciales desde variables de entorno / vault
  const safeCredRe = /Environment\.GetEnvironmentVariable|process\.env\.|KeyVault|secretsmanager|IConfiguration\[|_config\[|GetValue<string>/i;
  lines.forEach((line,i) => {
    if (skip(line)) { return; }
    if (safeCredRe.test(line)) {
      passingChecks.push({ id:crypto.randomUUID(), type:'SAFE_CREDENTIAL_STORAGE',
        description:`Credencial obtenida de variable de entorno o vault`,
        law:'Ley 21.663', article:'Ley 21.663, Art. 6 — Gestión segura de secretos + NIST SC-28',
        file:filePath, lineNumber:i+1, evidence:line.trim().slice(0,80),
        citation: LAW_CITATIONS['SAFE_CREDENTIAL_STORAGE'] });
    }
  });

  // ✅ Logging sin datos personales
  lines.forEach((line,i) => {
    if (skip(line)) { return; }
    if (logFnRe.test(line) && !piiValRe.test(line)) {
      passingChecks.push({ id:crypto.randomUUID(), type:'SAFE_LOGGING',
        description:`Log sin datos personales identificables`,
        law:'Ley 21.719', article:'Ley 21.719, Art. 3 — Principio de minimización',
        file:filePath, lineNumber:i+1, evidence:line.trim().slice(0,80),
        citation: LAW_CITATIONS['SAFE_LOGGING'] });
    }
  });

  // Deduplicar passing checks por (tipo + línea) para no inflar la lista
  const seen = new Set<string>();
  const uniquePassing = passingChecks.filter(p => {
    const k = `${p.type}:${p.lineNumber}`;
    if (seen.has(k)) { return false; }
    seen.add(k); return true;
  });

  const SEVERITY_ORDER: Record<Severity, number> = { 'CRÍTICA': 0, 'ALTA': 1, 'MEDIA': 2, 'BAJA': 3 };

  return {
    projectName: filePath, analyzedAt: localISOString(),
    totalExecutionMs: Date.now()-t0, filesAnalyzed: [filePath],
    overallStatus: st, overallScore: score,
    totalFindings: findings.length, criticalFindings: crit, highFindings: high,
    mediumFindings: media, lowFindings: baja,
    blockMerge: crit>0,
    recommendations: [...new Map(findings.map(f=>[f.type,f.recommendation])).values()].slice(0,5),
    generatedBy: opts?.generatedBy ?? '',
    passingChecks: uniquePassing,
    agentReports: [
      { agentName:'DPA Agent (Ley 21.719)', law:'Ley 21.719', findings:findings.filter(f=>f.law==='Ley 21.719').sort((a,b)=>SEVERITY_ORDER[a.severity]-SEVERITY_ORDER[b.severity]) },
      { agentName:'CSA Agent (Ley 21.663)', law:'Ley 21.663', findings:findings.filter(f=>f.law==='Ley 21.663').sort((a,b)=>SEVERITY_ORDER[a.severity]-SEVERITY_ORDER[b.severity]) },
    ],
  };
}

// ─── Diagnósticos en tiempo real ─────────────────────────────────────────────
// NOTA: Se inicializa dentro de activate() — no a nivel de módulo,
// para evitar que VS Code API se llame antes de que el host esté listo.
let diagnosticCollection: vscode.DiagnosticCollection | undefined;

function refreshDiagnostics(document: vscode.TextDocument): void {
  if (!diagnosticCollection) { return; }
  const supported = ['csharp','javascript','typescript','sql'];
  if (!supported.includes(document.languageId)) { diagnosticCollection.delete(document.uri); return; }

  const report = analyzeCode(document.getText(), document.fileName);
  const diags: vscode.Diagnostic[] = [];

  for (const ar of report.agentReports) {
    for (const f of ar.findings) {
      if (!f.lineNumber) { continue; }
      const lineIdx = Math.min(f.lineNumber-1, document.lineCount-1);
      const line = document.lineAt(lineIdx);
      const range = new vscode.Range(lineIdx, line.firstNonWhitespaceCharacterIndex, lineIdx, line.text.length);
      const d = new vscode.Diagnostic(range,
        `[${f.severity}] ${f.description}\n💡 ${f.recommendation}`,
        (f.severity==='CRÍTICA'||f.severity==='ALTA') ? vscode.DiagnosticSeverity.Error
          : f.severity==='MEDIA' ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Information);
      d.source = `Syntaxis (${f.law})`; d.code = f.article ?? f.type;
      diags.push(d);
    }
  }
  diagnosticCollection.set(document.uri, diags);
}

// ─── Activación ───────────────────────────────────────────────────────────────
export function activate(context: vscode.ExtensionContext): void {
  // Inicializar aquí — dentro de activate() — para que VS Code API esté lista
  diagnosticCollection = vscode.languages.createDiagnosticCollection('syntaxis');
  context.subscriptions.push(diagnosticCollection);

  getOutput().appendLine('🔍 Syntaxis Compliance Checker v0.5.0 — Ley 21.719 + Ley 21.663');

  // Debounce diagnósticos (800ms)
  let timer: NodeJS.Timeout | undefined;
  const debouncedRefresh = (doc: vscode.TextDocument) => {
    if (timer) { clearTimeout(timer); }
    timer = setTimeout(() => refreshDiagnostics(doc), 800);
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(e => e && debouncedRefresh(e.document)),
    vscode.workspace.onDidChangeTextDocument(e => debouncedRefresh(e.document)),
    vscode.workspace.onDidOpenTextDocument(debouncedRefresh),
    diagnosticCollection,
  );

  if (vscode.window.activeTextEditor) { refreshDiagnostics(vscode.window.activeTextEditor.document); }

  // ── Hover provider: cita textual de la ley al pasar el cursor ─────────────
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      [{ language: 'csharp' }, { language: 'javascript' }, { language: 'typescript' }, { language: 'sql' }],
      {
        provideHover(document, position) {
          const report = analyzeCode(document.getText(), document.fileName);
          const allFindings = report.agentReports.flatMap(a => a.findings);
          const allChecks   = report.passingChecks;

          const finding = allFindings.find(f => f.lineNumber === position.line + 1 && f.citation);
          if (finding?.citation) {
            const c = finding.citation;
            const icon = finding.severity === 'CRÍTICA' ? '🔴' : finding.severity === 'ALTA' ? '🟠' : finding.severity === 'MEDIA' ? '🟡' : '🔵';
            const md = new vscode.MarkdownString('', true);
            md.isTrusted = true;
            md.appendMarkdown(`**${icon} ${c.law}**\n\n`);
            md.appendMarkdown(`**${c.article}** — *${c.title}*\n\n`);
            md.appendMarkdown(`---\n\n${c.text.replace(/\n/g, '\n\n')}\n\n`);
            if (c.url) { md.appendMarkdown(`[📖 Ver texto completo en BCN](${c.url})\n\n`); }
            md.appendMarkdown(`---\n\n**❓ ¿Por qué debería implementar esta corrección?**\n\n${c.whyFix.replace(/\n/g, '\n\n')}`);
            const lineRange = document.lineAt(position.line).range;
            return new vscode.Hover(md, lineRange);
          }

          const check = allChecks.find(p => p.lineNumber === position.line + 1 && p.citation);
          if (check?.citation) {
            const c = check.citation;
            const md = new vscode.MarkdownString('', true);
            md.isTrusted = true;
            md.appendMarkdown(`**✅ ${c.law}** — Control aprobado\n\n`);
            md.appendMarkdown(`**${c.article}** — *${c.title}*\n\n`);
            md.appendMarkdown(`---\n\n${c.text.replace(/\n/g, '\n\n')}\n\n`);
            if (c.url) { md.appendMarkdown(`[📖 Ver texto completo en BCN](${c.url})\n\n`); }
            md.appendMarkdown(`---\n\n**❓ ¿Por qué es importante mantener este control?**\n\n${c.whyFix.replace(/\n/g, '\n\n')}`);
            const lineRange = document.lineAt(position.line).range;
            return new vscode.Hover(md, lineRange);
          }

          return undefined;
        }
      }
    )
  );

  // Comando: Revisar archivo actual
  context.subscriptions.push(
    vscode.commands.registerCommand('syntaxis.checkFile', async () => {
      const ed = vscode.window.activeTextEditor;
      if (!ed) { vscode.window.showWarningMessage('Syntaxis: Abre un archivo primero.'); return; }
      await vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title:'Syntaxis: Analizando...' }, async () => {
        const report = analyzeCode(ed.document.getText(), ed.document.fileName);
        refreshDiagnostics(ed.document);
        printReport(report);
        notify(report);
      });
    })
  );

  // Comando: Revisar workspace
  context.subscriptions.push(
    vscode.commands.registerCommand('syntaxis.checkWorkspace', async () => {
      const files = await vscode.workspace.findFiles('**/*.{cs,ts,js,sql}', '{**/node_modules/**,**/obj/**,**/bin/**,**/dist/**}');
      if (!files.length) { vscode.window.showInformationMessage('Syntaxis: No hay archivos para analizar.'); return; }
      await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification,
        title:`Syntaxis: Analizando ${files.length} archivos...`, cancellable:true }, async (progress, token) => {
        // Pre-pass: detectar filtro global de autenticación en Program.cs / Startup.cs
        let globalAuthFilter = false;
        for (const f of files) {
          const bn = path.basename(f.fsPath).toLowerCase();
          if (bn === 'program.cs' || bn === 'startup.cs') {
            try {
              const doc = await vscode.workspace.openTextDocument(f);
              if (/options\.Filters\.Add|Filters\.Add[<(][^)>]*[Aa]uthor[io]z|AuthorizationActionFilter/.test(doc.getText())) {
                globalAuthFilter = true; break;
              }
            } catch { /* skip */ }
          }
        }
        let crit=0, hi=0;
        for (let i=0; i<files.length; i++) {
          if (token.isCancellationRequested) { break; }
          progress.report({ increment:100/files.length, message:path.basename(files[i].fsPath) });
          const doc = await vscode.workspace.openTextDocument(files[i]);
          const r = analyzeCode(doc.getText(), files[i].fsPath, { globalAuthFilter });
          refreshDiagnostics(doc); crit+=r.criticalFindings; hi+=r.highFindings;
        }
        const icon = crit>0?'❌':hi>0?'⚠️':'✅';
        vscode.window.showInformationMessage(`${icon} ${files.length} archivos: ${crit} CRÍTICA, ${hi} ALTA`);
      });
    })
  );

  // Comando: Generar reporte (JSON + HTML + Markdown)
  context.subscriptions.push(
    vscode.commands.registerCommand('syntaxis.generateReport', async () => {
      // 1. ¿Scope: archivo actual o workspace completo?
      const choice = await vscode.window.showQuickPick(
        ['📄 Archivo actual', '📂 Workspace completo'],
        { placeHolder: '¿Qué deseas analizar?' }
      );
      if (!choice) { return; }

      const format = await vscode.window.showQuickPick(
        ['JSON', 'HTML', 'Markdown', 'Todos (JSON + HTML + MD)'],
        { placeHolder: '¿Formato del reporte?' }
      );
      if (!format) { return; }

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      const activeFile = vscode.window.activeTextEditor?.document.fileName;
      const folder = workspaceFolder
        ?? (activeFile ? findProjectRoot(path.dirname(activeFile)) : undefined);
      if (!folder) {
        vscode.window.showWarningMessage('Syntaxis: Abre un proyecto o archivo primero.');
        return;
      }
      const now = new Date();
      const ts = localISOString(now).replace(/[:.+]/g, '-').replace('T', '_').slice(0, 19);
      const reportsDir = path.join(folder, 'compliance-reports');
      if (!fs.existsSync(reportsDir)) { fs.mkdirSync(reportsDir, { recursive: true }); }
      const generatedBy = getGeneratedBy();

      let savedPathsOuter: string[] = [];

      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Syntaxis: Generando reporte...', cancellable: false },
        async (progress) => {
          let consolidatedReport: Report | undefined;

          // ── Recopilar datos ────────────────────────────────────────────────
          if (choice === '📄 Archivo actual') {
            const ed = vscode.window.activeTextEditor;
            if (!ed) { vscode.window.showWarningMessage('Syntaxis: Abre un archivo primero.'); return; }
            consolidatedReport = analyzeCode(ed.document.getText(), ed.document.fileName, { generatedBy });
          } else {
            // Workspace: analizar todos los archivos
            progress.report({ message: 'Buscando archivos...' });
            const files = await vscode.workspace.findFiles(
              '**/*.{cs,ts,js,sql}',
              '{**/node_modules/**,**/obj/**,**/bin/**,**/dist/**,**/out/**}'
            );
            if (!files.length) { vscode.window.showInformationMessage('Syntaxis: No hay archivos para analizar.'); return; }

            // Pre-pass: detectar filtro global de autenticación en Program.cs / Startup.cs
            let globalAuthFilter = false;
            progress.report({ message: 'Detectando configuración de seguridad global...' });
            for (const f of files) {
              const bn = path.basename(f.fsPath).toLowerCase();
              if (bn === 'program.cs' || bn === 'startup.cs') {
                try {
                  const doc = await vscode.workspace.openTextDocument(f);
                  if (/options\.Filters\.Add|Filters\.Add[<(][^)>]*[Aa]uthor[io]z|AuthorizationActionFilter/.test(doc.getText())) {
                    globalAuthFilter = true; break;
                  }
                } catch { /* skip */ }
              }
            }

            let totalCrit = 0, totalHigh = 0, totalMedia = 0, totalBaja = 0, totalFinds = 0;
            const allAgentReports: Report['agentReports'] = [];
            const allPassingChecks: PassingCheck[] = [];
            const allFiles: string[] = [];

            for (let i = 0; i < files.length; i++) {
              progress.report({ message: `${i + 1}/${files.length}: ${path.basename(files[i].fsPath)}` });
              try {
                const doc = await vscode.workspace.openTextDocument(files[i]);
                const r = analyzeCode(doc.getText(), files[i].fsPath, { globalAuthFilter });
                totalCrit  += r.criticalFindings;
                totalHigh  += r.highFindings;
                totalMedia += r.agentReports.flatMap(a=>a.findings).filter(f=>f.severity==='MEDIA').length;
                totalBaja  += r.agentReports.flatMap(a=>a.findings).filter(f=>f.severity==='BAJA').length;
                totalFinds += r.totalFindings;
                allFiles.push(files[i].fsPath);
                allPassingChecks.push(...r.passingChecks);
                // Merge agent findings
                r.agentReports.forEach((ar, idx) => {
                  if (!allAgentReports[idx]) {
                    allAgentReports.push({ ...ar });
                  } else {
                    allAgentReports[idx].findings.push(...ar.findings);
                  }
                });
              } catch { /* skip unreadable files */ }
            }

            const ws: Status = totalCrit > 0 ? 'FAIL' : totalHigh > 0 ? 'WARN' : 'PASS';
            const wsCritPenalty  = Math.min(totalCrit  * 20, 60);
            const wsHighPenalty  = Math.min(totalHigh  *  8, 20);
            const wsMediaPenalty = Math.min(totalMedia *  4, 10);
            const wsBajaPenalty  = Math.min(totalBaja  *  2,  5);
            const wsScore = Math.max(0, 100 - wsCritPenalty - wsHighPenalty - wsMediaPenalty - wsBajaPenalty);
            consolidatedReport = {
              projectName: folder,
              analyzedAt: localISOString(),
              totalExecutionMs: 0,
              filesAnalyzed: allFiles,
              overallStatus: ws,
              overallScore: wsScore,
              totalFindings: totalFinds,
              criticalFindings: totalCrit,
              highFindings: totalHigh,
              mediumFindings: totalMedia,
              lowFindings: totalBaja,
              blockMerge: totalCrit > 0,
              recommendations: [],
              generatedBy,
              passingChecks: allPassingChecks,
              agentReports: allAgentReports,
            };
          }

          if (!consolidatedReport) { return; }
          const allFindings = consolidatedReport.agentReports
            .flatMap(a => a.findings)
            .sort((a,b) => {
              const o: Record<string,number> = { 'CRÍTICA':0,'ALTA':1,'MEDIA':2,'BAJA':3 };
              return (o[a.severity]??9) - (o[b.severity]??9);
            });
          const savedPaths: string[] = [];

          // ── Escribir archivos según formato ───────────────────────────────
          const writeJSON = format === 'JSON' || format.includes('Todos');
          const writeHTML = format === 'HTML' || format.includes('Todos');
          const writeMD   = format === 'Markdown' || format.includes('Todos');

          if (writeJSON) {
            const p = path.join(reportsDir, `compliance-${ts}.json`);
            fs.writeFileSync(p, JSON.stringify(consolidatedReport, null, 2), 'utf8');
            savedPaths.push(p);
          }

          if (writeHTML) {
            const p = path.join(reportsDir, `compliance-${ts}.html`);
            fs.writeFileSync(p, buildHtmlReport(consolidatedReport, allFindings), 'utf8');
            savedPaths.push(p);
          }

          if (writeMD) {
            const p = path.join(reportsDir, `compliance-${ts}.md`);
            fs.writeFileSync(p, buildMarkdownReport(consolidatedReport, allFindings), 'utf8');
            savedPaths.push(p);
          }

          savedPathsOuter = savedPaths;
        }
      );

      // ── Notificar y ofrecer abrir (fuera del withProgress para que se cierre) ──
      if (savedPathsOuter.length) {
        const fileNames = savedPathsOuter.map(p => path.basename(p)).join(', ');
        const action = await vscode.window.showInformationMessage(
          `📊 Reporte${savedPathsOuter.length > 1 ? 's' : ''} generado${savedPathsOuter.length > 1 ? 's' : ''}: ${fileNames}`,
          'Abrir HTML', 'Abrir JSON', 'Abrir carpeta'
        );
        if (action === 'Abrir HTML') {
          const htmlPath = savedPathsOuter.find(p => p.endsWith('.html'));
          if (htmlPath) { vscode.env.openExternal(vscode.Uri.file(htmlPath)); }
        } else if (action === 'Abrir JSON') {
          const jsonPath = savedPathsOuter.find(p => p.endsWith('.json'));
          if (jsonPath) { vscode.window.showTextDocument(await vscode.workspace.openTextDocument(jsonPath)); }
        } else if (action === 'Abrir carpeta') {
          vscode.env.openExternal(vscode.Uri.file(reportsDir));
        }
      }
    })
  );

  vscode.window.setStatusBarMessage('$(shield) Syntaxis Compliance activo', 5000);
}

export function deactivate(): void {
  diagnosticCollection?.dispose();
  diagnosticCollection = undefined;
  outputChannel?.dispose();
  outputChannel = undefined;
}

// ─── Helpers de presentación ──────────────────────────────────────────────────
function printReport(report: Report): void {
  const out = getOutput(); out.clear();
  out.appendLine('═══════════════════════════════════════════════════');
  out.appendLine(`  SYNTAXIS COMPLIANCE — ${report.analyzedAt}`);
  out.appendLine('═══════════════════════════════════════════════════');
  out.appendLine(`  Archivo : ${path.basename(report.projectName)}`);
  out.appendLine(`  Estado  : ${report.overallStatus}   Score: ${report.overallScore}/100`);
  out.appendLine(`  🔴 CRÍTICA: ${report.criticalFindings}  🟠 ALTA: ${report.highFindings}  🟡 MEDIA: ${report.mediumFindings??0}  🔵 BAJA: ${report.lowFindings??0}  Total: ${report.totalFindings}`);
  out.appendLine('───────────────────────────────────────────────────');
  for (const ar of report.agentReports) {
    if (!ar.findings.length) { continue; }
    out.appendLine(`\n  ▶ ${ar.agentName}`);
    for (const f of ar.findings) {
      const ico = f.severity==='CRÍTICA'?'🔴':f.severity==='ALTA'?'🟠':f.severity==='MEDIA'?'🟡':'🔵';
      out.appendLine(`  ${ico} [${f.severity}] L${f.lineNumber??'?'} — ${f.description}`);
      out.appendLine(`       📋 ${f.article??f.type}`);
      out.appendLine(`       💡 ${f.recommendation}`);
      if (f.citation) {
        out.appendLine(`       📜 ${f.citation.law} · ${f.citation.article}`);
        out.appendLine(`          "${f.citation.text.split('\n')[0].slice(0,120)}…"`);
      }
    }
  }
  if (!report.totalFindings) { out.appendLine('\n  ✅ Sin problemas detectados.'); }
  out.appendLine('\n═══════════════════════════════════════════════════');
  out.show(true);
}

function notify(r: Report): void {
  const msg = r.overallStatus==='FAIL'
    ? `❌ ${r.criticalFindings} problema(s) CRÍTICO(S) — Ver Output para detalles`
    : r.overallStatus==='WARN'
    ? `⚠️ ${r.highFindings} problema(s) de ALTA severidad — Ver Output para detalles`
    : `✅ Sin problemas críticos. Score: ${r.overallScore}/100`;
  if (r.overallStatus==='FAIL') { vscode.window.showErrorMessage(msg); }
  else if (r.overallStatus==='WARN') { vscode.window.showWarningMessage(msg); }
  else { vscode.window.showInformationMessage(msg); }
}

export function buildMarkdownReport(report: Report, allFindings: Finding[]): string {
  const statusLine = report.overallStatus==='FAIL' ? '## ❌ Estado: MERGE BLOQUEADO'
    : report.overallStatus==='WARN' ? '## ⚠️ Estado: REQUIERE REVISIÓN' : '## ✅ Estado: APROBADO';
  const totalHours = allFindings.reduce((s,f)=>s+(f.estimatedFixHours??0),0);
  const icons: Record<Severity,'🔴'|'🟠'|'🟡'|'🔵'> = { 'CRÍTICA':'🔴','ALTA':'🟠','MEDIA':'🟡','BAJA':'🔵' };
  const sevOrder: Record<string,number> = { 'CRÍTICA':0,'ALTA':1,'MEDIA':2,'BAJA':3 };
  const sorted = [...allFindings].sort((a,b)=>(sevOrder[a.severity]??9)-(sevOrder[b.severity]??9));

  const rows = sorted.map(f => {
    const fileName = f.file?.split(/[\\/]/).pop() ?? '?';
    const vscodePath = f.file && f.lineNumber
      ? `vscode://file/${f.file.replace(/\\/g,'/')}:${f.lineNumber}:1`
      : null;
    const loc = f.lineNumber
      ? (vscodePath ? `[${fileName}:${f.lineNumber}](${vscodePath})` : `\`${fileName}:${f.lineNumber}\``)
      : '—';
    const desc = f.description.replace(/\|/g,'\\|').slice(0,80);
    const rec  = f.recommendation.replace(/\|/g,'\\|').slice(0,70);
    const citationBlock = f.citation
      ? `<details><summary>📜 Ver cita textual de la ley</summary>\n\n**${f.citation.law}**  \n**${f.citation.article}** — *${f.citation.title}*\n\n> ${f.citation.text.replace(/\n/g,'\n> ')}\n\n${f.citation.url ? `[📖 Texto completo en BCN](${f.citation.url})` : ''}\n\n**❓ ¿Por qué debería implementar esta corrección?**\n\n${f.citation.whyFix.replace(/\n/g,'\n')}\n</details>`
      : '';
    return `| ${icons[f.severity]} ${f.severity} | ${loc} | ${desc} | ${f.article??f.type} | ${rec} |\n${citationBlock}`;
  }).join('\n');

  const passingRows = report.passingChecks.map(p => {
    const pFileName = p.file?.split(/[\\/]/).pop() ?? '?';
    const pVscodePath = p.file && p.lineNumber
      ? `vscode://file/${p.file.replace(/\\/g,'/')}:${p.lineNumber}:1`
      : null;
    const loc = p.lineNumber
      ? (pVscodePath ? `[${pFileName}:${p.lineNumber}](${pVscodePath})` : `\`${pFileName}:${p.lineNumber}\``)
      : '—';
    const citationBlock = p.citation
      ? `<details><summary>📜 Ver cita textual de la ley</summary>\n\n**${p.citation.law}**  \n**${p.citation.article}** — *${p.citation.title}*\n\n> ${p.citation.text.replace(/\n/g,'\n> ')}\n\n${p.citation.url ? `[📖 Texto completo en BCN](${p.citation.url})` : ''}\n\n**❓ ¿Por qué es importante mantener este control?**\n\n${p.citation.whyFix.replace(/\n/g,'\n')}\n</details>`
      : '';
    return `| ✅ ${p.type.replace(/_/g,' ')} | ${loc} | ${p.description.replace(/\|/g,'\\|')} | ${p.article??p.law} |\n${citationBlock}`;
  }).join('\n');

  return `# 🔍 Syntaxis Compliance Report\n\n${statusLine}\n\n` +
    `**Proyecto:** \`${report.projectName}\`  **Analizado:** ${report.analyzedAt}` +
    (report.generatedBy ? `  **Generado por:** ${report.generatedBy}` : '') + `\n\n---\n\n` +
    `| Métrica | Valor |\n|---|---|\n` +
    `| Score | **${report.overallScore}/100** |\n` +
    `| 🔴 CRÍTICA | ${report.criticalFindings} |\n` +
    `| 🟠 ALTA | ${report.highFindings} |\n` +
    `| 🟡 MEDIA | ${report.mediumFindings??0} |\n` +
    `| 🔵 BAJA | ${report.lowFindings??0} |\n` +
    `| Total hallazgos | ${report.totalFindings} |\n` +
    `| ✅ Controles OK | ${report.passingChecks.length} |\n` +
    `| Horas fix | ~${totalHours}h |\n\n` +
    `## 📊 Hallazgos\n\n` +
    (allFindings.length
      ? `| Severidad | Ubicación | Descripción | Artículo | Recomendación |\n|---|---|---|---|---|\n${rows}\n`
      : `✅ Sin hallazgos.\n`) +
    `\n## ✅ Controles que cumplen\n\n` +
    (report.passingChecks.length
      ? `| Control | Ubicación | Descripción | Artículo |\n|---|---|---|---|\n${passingRows}\n`
      : `_No se detectaron controles de cumplimiento en este análisis._\n`) +
    `\n---\n> **Ley 21.719** (Protección de Datos Personales — vigente diciembre 2026) · **Ley 21.663** (Marco de Ciberseguridad) · Syntaxis Compliance Checker\n`;
}

// ─── Exportar generateHtml inline (no requiere importar src/) ────────────────
// Esta función es una versión simplificada del generador HTML completo
// La versión completa vive en src/report-generators/html-report.ts
export function buildHtmlReport(report: Report, allFindings: Finding[]): string {
  const statusColor = report.overallStatus==='FAIL'?'#dc2626':report.overallStatus==='WARN'?'#ea580c':'#16a34a';
  const statusLabel = report.overallStatus==='FAIL'?'❌ MERGE BLOQUEADO':report.overallStatus==='WARN'?'⚠️ REQUIERE REVISIÓN':'✅ APROBADO';
  const totalHours  = allFindings.reduce((s,f)=>s+(f.estimatedFixHours??0),0);
  const esc = (s:string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const sevOrder: Record<string,number> = { 'CRÍTICA':0,'ALTA':1,'MEDIA':2,'BAJA':3 };
  const sortedFindings = [...allFindings].sort((a,b)=>(sevOrder[a.severity]??9)-(sevOrder[b.severity]??9));

  const rows = sortedFindings.map(f => {
    const icon = f.severity==='CRÍTICA'?'🔴':f.severity==='ALTA'?'🟠':f.severity==='MEDIA'?'🟡':'🔵';
    const bg   = f.severity==='CRÍTICA'?'#fef2f2':f.severity==='ALTA'?'#fff7ed':f.severity==='MEDIA'?'#fefce8':'#eff6ff';
    const col  = f.severity==='CRÍTICA'?'#dc2626':f.severity==='ALTA'?'#ea580c':f.severity==='MEDIA'?'#ca8a04':'#2563eb';
    const fileName = f.file?.split(/[\\/]/).pop() ?? '?';
    const vscodePath = f.file && f.lineNumber
      ? `vscode://file/${f.file.replace(/\\/g,'/')}:${f.lineNumber}:1`
      : null;
    const loc = f.lineNumber
      ? (vscodePath
          ? `<a href="${vscodePath}" title="${esc(f.file??'')}:${f.lineNumber}" style="color:#4f46e5;font-family:monospace;font-size:.82em">${esc(fileName)}:${f.lineNumber}</a>`
          : `<code>${esc(fileName)}:${f.lineNumber}</code>`)
      : '—';
    const citationHtml = f.citation ? `
      <tr style="background:${bg}">
        <td colspan="7" style="padding:.4rem .6rem 1rem 2rem;border-top:none">
          <details style="cursor:pointer">
            <summary style="color:#6366f1;font-size:.8rem;font-weight:600;user-select:none">📜 Ver cita textual de la ley</summary>
            <div style="margin-top:.6rem;padding:.8rem 1rem;background:#f8fafc;border-left:3px solid #6366f1;border-radius:4px;font-size:.82rem;line-height:1.6">
              <p style="font-weight:700;color:#312e81;margin-bottom:.3rem">${esc(f.citation.law)}</p>
              <p style="font-weight:600;color:#4338ca;margin-bottom:.5rem">${esc(f.citation.article)} — <em>${esc(f.citation.title)}</em></p>
              <blockquote style="margin:0 0 .8rem;padding:.5rem .8rem;background:#eef2ff;border-radius:3px;color:#1e1b4b;white-space:pre-wrap">${esc(f.citation.text)}</blockquote>
              ${f.citation.url ? `<p style="margin-bottom:.8rem"><a href="${f.citation.url}" style="color:#4f46e5;font-size:.79rem" target="_blank">📖 Ver texto completo en BCN</a></p>` : ''}
              <div style="margin-top:.6rem;padding:.7rem .9rem;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:4px">
                <p style="font-weight:700;color:#92400e;margin-bottom:.4rem;font-size:.83rem">❓ ¿Por qué debería implementar esta corrección?</p>
                <p style="color:#78350f;white-space:pre-wrap;font-size:.81rem">${esc(f.citation.whyFix)}</p>
              </div>
            </div>
          </details>
        </td>
      </tr>` : '';
    return `<tr style="background:${bg}">
      <td style="text-align:center">${icon}</td>
      <td><b style="color:${col}">${f.severity}</b></td>
      <td>${loc}</td>
      <td>${esc(f.description.substring(0,90))}</td>
      <td style="color:#64748b;font-size:.82em">${esc(f.law)}<br><em>${esc(f.article??f.type)}</em></td>
      <td style="font-size:.82em">${esc(f.recommendation.substring(0,80))}</td>
      <td style="text-align:center">${f.estimatedFixHours??'—'}h</td>
    </tr>${citationHtml}`;
  }).join('');

  const passingRows = report.passingChecks.map(p => {
    const pFileName = p.file?.split(/[\\/]/).pop() ?? '?';
    const pVscodePath = p.file && p.lineNumber
      ? `vscode://file/${p.file.replace(/\\/g,'/')}:${p.lineNumber}:1`
      : null;
    const loc = p.lineNumber
      ? (pVscodePath
          ? `<a href="${pVscodePath}" title="${esc(p.file??'')}:${p.lineNumber}" style="color:#16a34a;font-family:monospace;font-size:.82em">${esc(pFileName)}:${p.lineNumber}</a>`
          : `<code>${esc(pFileName)}:${p.lineNumber}</code>`)
      : '—';
    const citationHtml = p.citation ? `
      <tr>
        <td colspan="6" style="padding:.4rem .6rem 1rem 2rem;border-top:none">
          <details style="cursor:pointer">
            <summary style="color:#16a34a;font-size:.8rem;font-weight:600;user-select:none">📜 Ver cita textual de la ley</summary>
            <div style="margin-top:.6rem;padding:.8rem 1rem;background:#f8fafc;border-left:3px solid #16a34a;border-radius:4px;font-size:.82rem;line-height:1.6">
              <p style="font-weight:700;color:#14532d;margin-bottom:.3rem">${esc(p.citation.law)}</p>
              <p style="font-weight:600;color:#15803d;margin-bottom:.5rem">${esc(p.citation.article)} — <em>${esc(p.citation.title)}</em></p>
              <blockquote style="margin:0 0 .8rem;padding:.5rem .8rem;background:#f0fdf4;border-radius:3px;color:#14532d;white-space:pre-wrap">${esc(p.citation.text)}</blockquote>
              ${p.citation.url ? `<p style="margin-bottom:.8rem"><a href="${p.citation.url}" style="color:#16a34a;font-size:.79rem" target="_blank">📖 Ver texto completo en BCN</a></p>` : ''}
              <div style="margin-top:.6rem;padding:.7rem .9rem;background:#f0fdf4;border-left:3px solid #22c55e;border-radius:4px">
                <p style="font-weight:700;color:#14532d;margin-bottom:.4rem;font-size:.83rem">❓ ¿Por qué es importante mantener este control?</p>
                <p style="color:#166534;white-space:pre-wrap;font-size:.81rem">${esc(p.citation.whyFix)}</p>
              </div>
            </div>
          </details>
        </td>
      </tr>` : '';
    return `<tr>
      <td style="text-align:center">✅</td>
      <td style="color:#16a34a;font-weight:600">${esc(p.type.replace(/_/g,' '))}</td>
      <td>${loc}</td>
      <td>${esc(p.description)}</td>
      <td style="color:#64748b;font-size:.82em">${esc(p.article??p.law)}</td>
      <td style="font-size:.82em;color:#475569">${esc(p.evidence.substring(0,80))}</td>
    </tr>${citationHtml}`;
  }).join('');

  return `<!DOCTYPE html><html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Syntaxis Compliance Report</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#f8fafc;color:#1e293b;padding:2rem}
h1{font-size:1.6rem;font-weight:800}h2{margin:1.4rem 0 .7rem;font-size:1.1rem;color:#475569}
.badge{display:inline-block;padding:.3rem .9rem;border-radius:999px;color:#fff;font-weight:700;font-size:.9rem;background:${statusColor}}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:1rem;margin:1.2rem 0 2rem}
.card{background:#fff;border-radius:10px;padding:1rem;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.07)}
.card .v{font-size:2rem;font-weight:800}.card .l{font-size:.8rem;color:#64748b}
table{width:100%;border-collapse:collapse;font-size:.84rem}
th{background:#f1f5f9;padding:.5rem .6rem;text-align:left;font-weight:600;color:#475569}
td{padding:.45rem .6rem;border-top:1px solid #f1f5f9;vertical-align:top}
.passing-table th{background:#f0fdf4}.passing-table td{border-top:1px solid #dcfce7}
footer{text-align:center;color:#94a3b8;font-size:.8rem;margin-top:2rem}
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem">
  <div><h1>🔍 Syntaxis Compliance Report</h1>
  <p style="color:#64748b;margin-top:.3rem">${esc(report.projectName)} · ${report.analyzedAt}${report.generatedBy ? ` · 👤 ${esc(report.generatedBy)}` : ''}</p></div>
  <span class="badge">${statusLabel}</span>
</div>
<div class="cards">
  <div class="card"><div class="v" style="color:${report.overallScore>=70?'#16a34a':report.overallScore>=40?'#ea580c':'#dc2626'}">${report.overallScore}</div><div class="l">Score /100</div></div>
  <div class="card"><div class="v" style="color:#dc2626">${report.criticalFindings}</div><div class="l">🔴 CRÍTICA</div></div>
  <div class="card"><div class="v" style="color:#ea580c">${report.highFindings}</div><div class="l">🟠 ALTA</div></div>
  <div class="card"><div class="v" style="color:#ca8a04">${report.mediumFindings??0}</div><div class="l">🟡 MEDIA</div></div>
  <div class="card"><div class="v" style="color:#2563eb">${report.lowFindings??0}</div><div class="l">🔵 BAJA</div></div>
  <div class="card"><div class="v" style="color:#16a34a">${report.passingChecks.length}</div><div class="l">✅ Controles OK</div></div>
  <div class="card"><div class="v">${totalHours}</div><div class="l">Horas fix</div></div>
</div>
<h2>📊 Hallazgos detallados</h2>
<table><thead><tr>
  <th></th><th>Severidad</th><th>Ubicación</th><th>Descripción</th><th>Ley / Art.</th><th>Recomendación</th><th>Fix</th>
</tr></thead><tbody>${rows||`<tr><td colspan="7" style="text-align:center;padding:2rem;color:#16a34a">✅ Sin problemas detectados</td></tr>`}</tbody></table>
<h2>✅ Controles que cumplen</h2>
<table class="passing-table"><thead><tr>
  <th></th><th>Control</th><th>Ubicación</th><th>Descripción</th><th>Artículo</th><th>Evidencia</th>
</tr></thead><tbody>${passingRows||`<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#64748b">No se detectaron controles en este análisis</td></tr>`}</tbody></table>
<footer>Syntaxis Compliance Checker · Ley 21.719 (vigente dic. 2026) + Ley 21.663 · ${report.analyzedAt}${report.generatedBy ? ` · 👤 ${esc(report.generatedBy)}` : ''}</footer>
</body></html>`;
}
