// src/agents/skills/dpa-skill.ts
// Skill: Ley 21.719 — Protección de Datos Personales (Chile)

import { randomUUID } from 'crypto';
import { Finding } from '../../types/index.js';
import { AgentSkill, LawArticle, SkillExample, extractJson } from './base-skill.js';

const DPA_ARTICLES: LawArticle[] = [
  {
    id: 'art3',
    number: 'Art. 3',
    title: 'Principio de minimización de datos',
    text: 'Los datos personales deben ser adecuados, pertinentes y limitados a lo necesario en relación con los fines para los que son tratados.',
    technicalImplication: 'Evitar almacenar o loggear más datos personales de los estrictamente necesarios. Detectar campos PII innecesarios, logs con datos sensibles.',
  },
  {
    id: 'art4',
    number: 'Art. 4',
    title: 'Consentimiento informado',
    text: 'El tratamiento de datos personales requiere consentimiento explícito, informado, libre y específico del titular.',
    technicalImplication: 'La creación de usuarios o el registro de datos personales debe registrar el consentimiento (fecha, versión de política, medio).',
  },
  {
    id: 'art7',
    number: 'Art. 7',
    title: 'Derecho de supresión',
    text: 'El titular puede solicitar la eliminación de sus datos personales.',
    technicalImplication: 'Los controladores REST que manejan datos de usuarios deben exponer un endpoint DELETE que elimine los datos del titular.',
  },
  {
    id: 'art9',
    number: 'Art. 9',
    title: 'Derecho de portabilidad',
    text: 'El titular puede solicitar sus datos en formato estructurado, legible por máquina.',
    technicalImplication: 'Debe existir un endpoint de exportación de datos (JSON/CSV) para que el titular pueda obtener todos sus datos.',
  },
  {
    id: 'art18',
    number: 'Art. 18',
    title: 'Deber de seguridad',
    text: 'El responsable debe adoptar medidas técnicas para proteger los datos personales, incluyendo cifrado en reposo y tránsito, especialmente para datos sensibles.',
    technicalImplication: 'Campos PII (email, RUT, teléfono, contraseña, tarjeta) deben estar cifrados. No usar MD5/SHA1 para contraseñas. Conexiones BD con TLS.',
  },
  {
    id: 'art20',
    number: 'Art. 20',
    title: 'Notificación de brechas',
    text: 'En caso de vulneración de seguridad que afecte datos personales, notificar a la Agencia en 72 horas.',
    technicalImplication: 'SQL Injection y vulnerabilidades que expongan datos personales activan el deber de notificación.',
  },
];

const DPA_EXAMPLES: SkillExample[] = [
  {
    description: 'Campo PII sin cifrado',
    badCode: 'public string Email { get; set; }',
    goodCode: '[Encrypted] public string Email { get; set; }',
    findingType: 'PII_UNENCRYPTED',
  },
  {
    description: 'SQL Injection con datos personales',
    badCode: 'var q = "SELECT * FROM Users WHERE email = \'" + email + "\'";',
    goodCode: 'var q = "SELECT * FROM Users WHERE email = @email"; cmd.Parameters.Add("@email", email);',
    findingType: 'SQL_INJECTION_PII_RISK',
  },
  {
    description: 'PII en logs',
    badCode: 'logger.Info("User logged in: " + user.Email);',
    goodCode: 'logger.Info("User logged in: {UserId}", user.Id);',
    findingType: 'PII_IN_LOGS',
  },
  {
    description: 'Creación de usuario sin consentimiento',
    badCode: 'await _userService.CreateUser(email, password);',
    goodCode: 'await _userService.CreateUser(email, password, consentDate: DateTime.UtcNow, consentVersion: "1.2");',
    findingType: 'MISSING_CONSENT',
  },
];

const OUTPUT_SCHEMA = `{
  "id": "string (uuid)",
  "type": "string (PII_UNENCRYPTED | SQL_INJECTION_PII_RISK | PII_IN_LOGS | MISSING_CONSENT | MISSING_ARCO_SUPPRESSION | MISSING_ARCO_PORTABILITY | MISSING_ARCO_OPPOSITION | otro)",
  "description": "string — descripción clara y específica del problema encontrado",
  "severity": "CRÍTICA | ALTA | MEDIA | BAJA",
  "law": "Ley 21.719",
  "article": "string — artículo específico de Ley 21.719",
  "lineNumber": "number | null",
  "codeSnippet": "string | null — fragmento del código problemático (máx 120 chars)",
  "recommendation": "string — acción concreta para resolver el problema",
  "estimatedFixHours": "number",
  "tags": ["array", "de", "strings"]
}`;

export const dpaSkill: AgentSkill = {
  id: 'dpa-skill',
  lawName: 'Ley 21.719',

  agentPersona: `Eres un agente de cumplimiento legal especializado en la Ley 21.719 de Protección de Datos Personales de Chile (vigente desde diciembre 2026). Tu experiencia combina derecho de protección de datos y seguridad de software. Analizas código fuente con el rigor de una auditoría formal realizada por la Agencia de Protección de Datos chilena.`,

  knowledgeBase: DPA_ARTICLES,
  fewShotExamples: DPA_EXAMPLES,
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
Analizar el código fuente proporcionado y detectar TODAS las violaciones a la Ley 21.719 de Protección de Datos Personales de Chile.

## Base de conocimiento — Artículos aplicables

${articles}

## Ejemplos de hallazgos esperados

${examples}

## Instrucciones de análisis
1. Lee el código línea por línea con atención al contexto completo
2. Detecta TODAS las violaciones a los artículos listados, incluyendo casos sutiles
3. Considera el contexto: un controlador sin endpoint DELETE puede violar Art. 7
4. Distingue severidades: CRÍTICA (dato expuesto directamente), ALTA (vulnerabilidad explotable), MEDIA (incumplimiento funcional), BAJA (buenas prácticas)
5. No reportes falsos positivos — si no hay problema claro, no lo incluyas
6. Incluye el número de línea cuando sea identificable

## Formato de respuesta
Responde ÚNICAMENTE con un JSON array de findings. Cada finding tiene este esquema:
${this.outputSchema}

Si no hay violaciones, responde exactamente: []
NO incluyas texto adicional, explicaciones ni markdown. Solo el JSON array.`;
  },

  buildUserPrompt(code: string, filePath: string, fileType: string): string {
    const truncated = code.length > 12000 ? code.substring(0, 12000) + '\n// ... [truncado por límite de contexto]' : code;
    return `Archivo: ${filePath}
Tipo: ${fileType}

\`\`\`${fileType}
${truncated}
\`\`\`

Analiza este código según la Ley 21.719 y responde con el JSON array de findings.`;
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
          law: 'Ley 21.719',
          article: f.article ? String(f.article) : undefined,
          file: filePath,
          lineNumber: typeof f.lineNumber === 'number' ? f.lineNumber : undefined,
          codeSnippet: f.codeSnippet ? String(f.codeSnippet).substring(0, 200) : undefined,
          recommendation: String(f.recommendation ?? 'Revisar implementación según Ley 21.719'),
          estimatedFixHours: typeof f.estimatedFixHours === 'number' ? f.estimatedFixHours : undefined,
          tags: Array.isArray(f.tags) ? f.tags.map(String) : [],
        }));
    } catch {
      return [];
    }
  },
};
