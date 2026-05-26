// src/agents/skills/csa-skill.ts
// Skill: Ley 21.663 — Marco de Ciberseguridad (Chile)

import { randomUUID } from 'crypto';
import { Finding } from '../../types/index.js';
import { AgentSkill, LawArticle, SkillExample, extractJson } from './base-skill.js';

const CSA_ARTICLES: LawArticle[] = [
  {
    id: 'art6-creds',
    number: 'Art. 6',
    title: 'Gestión segura de credenciales y secretos',
    text: 'Las instituciones afectas deberán implementar sistemas de gestión de identidades que garanticen que las credenciales no sean almacenadas en texto claro ni embebidas en el código fuente.',
    technicalImplication: 'Detectar contraseñas, API keys, tokens y connection strings hardcodeados directamente en el código fuente.',
  },
  {
    id: 'art6-auth',
    number: 'Art. 6',
    title: 'Control de acceso y autenticación',
    text: 'Los operadores de servicios esenciales deben implementar mecanismos de autenticación en todos los puntos de acceso a sistemas que procesen información sensible. Ninguna interfaz debe quedar accesible sin verificación previa de identidad.',
    technicalImplication: 'Endpoints HTTP sin decoradores de autenticación ([Authorize], requireAuth, verifyToken) constituyen incumplimiento.',
  },
  {
    id: 'art6-crypto',
    number: 'Art. 6',
    title: 'Uso de criptografía robusta',
    text: 'Las comunicaciones y el almacenamiento de información sensible deben utilizar protocolos y algoritmos criptográficos actualizados. Se prohíbe el uso de algoritmos obsoletos como MD5 y SHA1 para datos críticos.',
    technicalImplication: 'Detectar uso de MD5, SHA1, DES. Exigir SHA-256+ para integridad y bcrypt/Argon2 para contraseñas.',
  },
  {
    id: 'art6-tls',
    number: 'Art. 6',
    title: 'Cifrado de comunicaciones (TLS)',
    text: 'Las comunicaciones que contengan información sensible deben cifrarse mediante TLS 1.2 como mínimo. Queda prohibido deshabilitar el cifrado en conexiones a bases de datos.',
    technicalImplication: 'Detectar Encrypt=false, TrustServerCertificate=true, sslmode=disable en connection strings.',
  },
  {
    id: 'art6-cors',
    number: 'Art. 6',
    title: 'Protección de límites de red (CORS)',
    text: 'Los sistemas deben implementar controles de acceso a nivel de red y aplicación. Las políticas CORS permisivas que permiten cualquier origen (*) constituyen una vulnerabilidad de control de acceso.',
    technicalImplication: 'Detectar AllowAnyOrigin(), origins: ["*"], Access-Control-Allow-Origin: *',
  },
  {
    id: 'art6-ratelimit',
    number: 'Art. 6',
    title: 'Protección contra ataques de fuerza bruta',
    text: 'Los sistemas de autenticación deben incluir mecanismos de monitoreo y control que limiten intentos de acceso no autorizados.',
    technicalImplication: 'Endpoints de login/autenticación sin rate limiting son vulnerables a fuerza bruta.',
  },
];

const CSA_EXAMPLES: SkillExample[] = [
  {
    description: 'API Key hardcodeada',
    badCode: 'const apiKey = "sk-abc123xyzREALKEY456";',
    goodCode: 'const apiKey = process.env.API_KEY;',
    findingType: 'HARDCODED_CREDENTIAL',
  },
  {
    description: 'Endpoint sin autenticación',
    badCode: '[HttpGet("/api/users")] public IActionResult GetUsers() { ... }',
    goodCode: '[Authorize] [HttpGet("/api/users")] public IActionResult GetUsers() { ... }',
    findingType: 'ENDPOINT_NO_AUTH',
  },
  {
    description: 'Algoritmo hash débil',
    badCode: 'var hash = MD5.Create().ComputeHash(data);',
    goodCode: 'var hash = SHA256.Create().ComputeHash(data);',
    findingType: 'WEAK_HASH_ALGORITHM',
  },
  {
    description: 'Conexión BD sin TLS',
    badCode: '"Server=prod;Database=app;Encrypt=false;TrustServerCertificate=true"',
    goodCode: '"Server=prod;Database=app;Encrypt=true;TrustServerCertificate=false"',
    findingType: 'INSECURE_DB_CONNECTION',
  },
];

const OUTPUT_SCHEMA = `{
  "id": "string (uuid)",
  "type": "string (HARDCODED_CREDENTIAL | ENDPOINT_NO_AUTH | WEAK_HASH_ALGORITHM | INSECURE_DB_CONNECTION | CORS_WILDCARD | MISSING_RATE_LIMITING | otro)",
  "description": "string — descripción clara y específica del problema encontrado",
  "severity": "CRÍTICA | ALTA | MEDIA | BAJA",
  "law": "Ley 21.663",
  "article": "string — artículo específico de Ley 21.663",
  "lineNumber": "number | null",
  "codeSnippet": "string | null — fragmento del código problemático (máx 120 chars, sin credenciales reales)",
  "recommendation": "string — acción concreta para resolver el problema",
  "estimatedFixHours": "number",
  "tags": ["array", "de", "strings"]
}`;

export const csaSkill: AgentSkill = {
  id: 'csa-skill',
  lawName: 'Ley 21.663',

  agentPersona: `Eres un agente de ciberseguridad especializado en la Ley 21.663 Marco de Ciberseguridad de Chile y estándares internacionales (NIST CSF, ISO 27001, OWASP). Tu rol es equivalent al de un auditor de seguridad ofensivo-defensivo que detecta vulnerabilidades técnicas con impacto legal.`,

  knowledgeBase: CSA_ARTICLES,
  fewShotExamples: CSA_EXAMPLES,
  outputSchema: OUTPUT_SCHEMA,

  buildSystemPrompt(): string {
    const articles = this.knowledgeBase
      .map(a => `${a.number} — ${a.title}\n  Ley: "${a.text}"\n  Implicancia técnica: ${a.technicalImplication}`)
      .join('\n\n');

    const examples = this.fewShotExamples
      .map(e => `  Tipo: ${e.findingType}\n  Problema: ${e.description}\n  ❌ Mal: ${e.badCode}\n  ✅ Bien: ${e.goodCode}`)
      .join('\n\n');

    return `${this.agentPersona}

## Tu misión
Analizar el código fuente y detectar TODAS las vulnerabilidades de ciberseguridad que constituyen incumplimiento a la Ley 21.663 de Chile.

## Base de conocimiento — Artículos aplicables

${articles}

## Ejemplos de hallazgos esperados

${examples}

## Instrucciones de análisis
1. Revisa el código completo con mentalidad de red team + cumplimiento legal
2. Detecta credenciales hardcodeadas de CUALQUIER tipo (password, secret, token, API key, connection string)
3. Verifica autenticación en cada endpoint HTTP. Si el controlador completo tiene [Authorize] a nivel de clase, los endpoints individuales están cubiertos
4. Busca algoritmos criptográficos débiles: MD5, SHA1, DES, RC4
5. Detecta configuraciones TLS inseguras en connection strings
6. Identifica políticas CORS permisivas (wildcard *)
7. Endpoints de login/auth sin rate limiting
8. IMPORTANTE: cuando reportes una credencial, redacta el codeSnippet reemplazando el valor con "***REDACTED***"
9. Distingue severidades: CRÍTICA (credencial expuesta, TLS desactivado), ALTA (sin auth, hash débil), MEDIA (CORS wildcard), BAJA (configuración subóptima)

## Formato de respuesta
Responde ÚNICAMENTE con un JSON array de findings. Cada finding tiene este esquema:
${this.outputSchema}

Si no hay vulnerabilidades, responde exactamente: []
NO incluyas texto adicional, explicaciones ni markdown. Solo el JSON array.`;
  },

  buildUserPrompt(code: string, filePath: string, fileType: string): string {
    const truncated = code.length > 12000 ? code.substring(0, 12000) + '\n// ... [truncado por límite de contexto]' : code;
    return `Archivo: ${filePath}
Tipo: ${fileType}

\`\`\`${fileType}
${truncated}
\`\`\`

Analiza este código según la Ley 21.663 y responde con el JSON array de findings.`;
  },

  parseResponse(rawJson: string, filePath: string): Finding[] {
    try {
      const clean = extractJson(rawJson);
      const parsed = JSON.parse(clean);
      if (!Array.isArray(parsed)) { return []; }

      return parsed
        .filter((f: any) => f && typeof f === 'object' && f.type && f.description)
        .map((f: any): Finding => ({
          id: f.id ?? randomUUID(),
          type: String(f.type),
          description: String(f.description),
          severity: (['CRÍTICA', 'ALTA', 'MEDIA', 'BAJA'].includes(f.severity) ? f.severity : 'MEDIA') as Finding['severity'],
          law: 'Ley 21.663',
          article: f.article ? String(f.article) : undefined,
          file: filePath,
          lineNumber: typeof f.lineNumber === 'number' ? f.lineNumber : undefined,
          codeSnippet: f.codeSnippet ? String(f.codeSnippet).substring(0, 200) : undefined,
          recommendation: String(f.recommendation ?? 'Revisar implementación según Ley 21.663'),
          estimatedFixHours: typeof f.estimatedFixHours === 'number' ? f.estimatedFixHours : undefined,
          tags: Array.isArray(f.tags) ? f.tags.map(String) : [],
        }));
    } catch {
      return [];
    }
  },
};
