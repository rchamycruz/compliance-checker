// packages/vscode-extension/src/ai-client.ts
// Cliente AI para uso dentro de la extensión VS Code.
// Soporta GitHub Copilot (vscode.lm) y proveedores externos (OpenAI, Anthropic, Azure).

import * as vscode from 'vscode';
import { SettingsManager } from './settings-manager.js';

export interface AILawCitation {
  law: string;      // ej: "Ley 21.719 — Protección de Datos Personales"
  article: string;  // ej: "Art. 18 — Deber de seguridad"
  title: string;    // ej: "Medidas de seguridad en el tratamiento de datos personales"
  text: string;     // Cita textual del artículo (generada por la IA a partir de los textos del prompt)
  whyFix: string;   // Explicación contextual generada por la IA: impacto legal + consecuencias
  url?: string;     // URL al texto oficial en BCN (estático, según la ley)
}

export interface AIFinding {
  id: string; type: string; description: string;
  severity: 'CRÍTICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  law: string; article?: string;
  file?: string; lineNumber?: number; codeSnippet?: string;
  recommendation: string; estimatedFixHours?: number; tags: string[];
  citation?: AILawCitation;   // Generado por la IA
  suggestedPrompt?: string;   // Prompt contextualizado generado por la IA
}

export interface AIAgentReport {
  agentName: string; law: string; executedAt: string; executionMs: number;
  totalFindings: number; criticalFindings: number; highFindings: number;
  mediumFindings: number; lowFindings: number;
  status: 'PASS' | 'WARN' | 'FAIL'; findings: AIFinding[]; summary: string;
}

export interface AIAnalysisResult {
  agentReports: AIAgentReport[];
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  overallStatus: 'PASS' | 'WARN' | 'FAIL';
  overallScore: number;
}

// ─── Prompts de cada agente — incluyen textos de ley para citas precisas ─────
const DPA_SYSTEM_PROMPT = `Eres un agente de cumplimiento legal especializado en la Ley 21.719 de Protección de Datos Personales de Chile.

## Textos de la Ley 21.719 (usa estos textos para las citas)

**Art. 3 — Principio de minimización de datos**: "El responsable deberá tratar únicamente los datos personales que sean adecuados, pertinentes y limitados a lo necesario en relación con los fines para los que son tratados. No podrá recopilarse datos en exceso o que no guarden relación directa con la finalidad declarada."

**Art. 4 — Consentimiento**: "El tratamiento de datos personales requerirá el consentimiento del titular, que habrá de ser libre, informado, específico e inequívoco. El consentimiento puede otorgarse por escrito, en forma oral o mediante conducta inequívoca, debiendo el responsable poder acreditarlo en todo momento."

**Art. 7 — Derecho de supresión**: "El titular tiene derecho a solicitar al responsable la supresión de sus datos personales cuando: a) ya no sean necesarios para la finalidad con que fueron recopilados; b) se revoque el consentimiento y no exista otro fundamento legal; c) el tratamiento sea ilícito; d) deban suprimirse para cumplir una obligación legal. El responsable deberá suprimir los datos sin dilación injustificada."

**Art. 9 — Derecho de portabilidad**: "El titular tiene derecho a recibir los datos personales que le incumban en un formato estructurado, de uso común y lectura mecánica, y a transmitirlos a otro responsable sin que el responsable al que se los hubiere facilitado lo pueda impedir, cuando el tratamiento esté basado en el consentimiento o en un contrato."

**Art. 18 — Deber de seguridad**: "El responsable de datos deberá adoptar las medidas técnicas y organizativas necesarias para garantizar la seguridad de los datos personales y evitar su alteración, pérdida, tratamiento o acceso no autorizado. Entre dichas medidas deberá considerar, según la naturaleza de los datos y los riesgos a que estén expuestos, el cifrado de datos en reposo y en tránsito, especialmente respecto de datos sensibles."

**Art. 20 — Notificación de vulneraciones**: "Cuando se produzca una vulneración de seguridad que afecte a datos personales, el responsable deberá notificar a la Agencia de Protección de Datos Personales y a los titulares afectados dentro del plazo de setenta y dos horas contado desde que haya tenido conocimiento del hecho, indicando la naturaleza de la vulneración, las categorías y número aproximado de titulares y registros afectados, y las medidas adoptadas o propuestas."

## Instrucciones de análisis
1. Analiza el código línea por línea con rigor de auditoría legal formal.
2. Detecta TODAS las violaciones; no omitas ninguna.
3. Para cada hallazgo incluye el campo "citation" con el texto relevante citado TEXTUALMENTE de los artículos anteriores.
4. En "citation.whyFix" genera 2-3 párrafos ESPECÍFICOS al hallazgo: qué riesgo concreto representa este código, las consecuencias legales (multas en UTM, notificación pública), y el beneficio de corregirlo.
5. En "suggestedPrompt" genera un prompt detallado y contextualizado con el snippet y ubicación exactos para que el desarrollador lo use directamente con una IA y obtenga el código corregido.
6. Responde ÚNICAMENTE con un JSON array. NO incluyas markdown, texto previo ni posterior.

## Esquema JSON por hallazgo (incluir TODOS los campos):
{"id":"uuid-unico","type":"TIPO_EN_MAYUSCULAS","description":"descripción clara del problema","severity":"CRÍTICA|ALTA|MEDIA|BAJA","law":"Ley 21.719","article":"Art. X","lineNumber":N,"codeSnippet":"fragmento relevante (sin credenciales)","recommendation":"acción concreta a tomar","estimatedFixHours":N,"tags":["tag1","tag2"],"citation":{"law":"Ley 21.719 — Protección de Datos Personales","article":"Art. X — Nombre del artículo","title":"Título descriptivo del artículo","text":"cita textual exacta del artículo provisto arriba","whyFix":"párrafo 1: qué riesgo concreto representa este código en este archivo específico.\\n\\npárrafo 2: consecuencias legales: multas de hasta X UTM, obligación de notificar a titulares, responsabilidad civil.\\n\\npárrafo 3: por qué la corrección propuesta elimina el riesgo y cumple con la ley.","url":"https://www.bcn.cl/leychile/navegar?idNorma=1208660"},"suggestedPrompt":"Tengo un problema de cumplimiento legal (Ley 21.719) en [archivo]:[línea]...\\n\\n[contexto específico del código con snippet]\\n\\nPor favor: 1) muéstrame el código corregido completo. 2) Explica los cambios para cumplir con Art. X. 3) Indica si hay patrones similares a revisar."}

Si no hay violaciones responde: []`;

const CSA_SYSTEM_PROMPT = `Eres un agente de ciberseguridad especializado en la Ley 21.663 Marco de Ciberseguridad de Chile y OWASP.

## Textos de la Ley 21.663 (usa estos textos para las citas)

**Art. 6 — Deberes de seguridad de los operadores**: "Los operadores de importancia vital y los prestadores de servicios esenciales deberán implementar un sistema de gestión de seguridad de la información que contemple, entre otras medidas: la gestión de identidades y control de accesos basado en el principio de mínimo privilegio; la autenticación robusta en todos los puntos de acceso a sistemas críticos; el uso de criptografía para la protección de datos en tránsito y en reposo, empleando algoritmos vigentes y aprobados (se prohíbe el uso de MD5, SHA-1, DES y RC4 para propósitos de seguridad); la gestión de credenciales y prohibición expresa de credenciales hardcodeadas en el código fuente; la protección de las comunicaciones mediante TLS 1.2 o superior; controles de acceso de origen (CORS restrictivo); y mecanismos de limitación de tasa (rate limiting) en servicios expuestos a internet."

**Art. 6 — Notificación de incidentes**: "Los operadores deberán notificar al CSIRT Nacional todo incidente de ciberseguridad de impacto significativo dentro de las 3 horas siguientes de haberlo detectado, incluyendo una descripción preliminar del incidente, los sistemas afectados y las medidas iniciales adoptadas."

**Art. 8 — Principios de seguridad por diseño**: "Los sistemas y servicios digitales deberán diseñarse incorporando medidas de seguridad desde su concepción, aplicando los principios de seguridad por defecto, mínima superficie de ataque, defensa en profundidad y separación de privilegios."

## Instrucciones de análisis
1. Revisa el código con mentalidad de pentester + auditor legal.
2. Al reportar credenciales o secretos, usa "***REDACTED***" en el codeSnippet.
3. Si el controlador completo tiene [Authorize] a nivel de clase, los endpoints individuales están cubiertos (no reportar falso positivo).
4. Para cada hallazgo incluye el campo "citation" con el texto relevante citado TEXTUALMENTE de los artículos anteriores.
5. En "citation.whyFix" genera 2-3 párrafos ESPECÍFICOS al hallazgo: qué vector de ataque habilita este código, las consecuencias legales (notificación al CSIRT en 3h, multas), y cómo la corrección cierra la vulnerabilidad.
6. En "suggestedPrompt" genera un prompt detallado y contextualizado con el snippet exacto para que el desarrollador lo use directamente con una IA.
7. Responde ÚNICAMENTE con un JSON array. NO incluyas markdown, texto previo ni posterior.

## Esquema JSON por hallazgo (incluir TODOS los campos):
{"id":"uuid-unico","type":"TIPO_EN_MAYUSCULAS","description":"descripción clara del problema","severity":"CRÍTICA|ALTA|MEDIA|BAJA","law":"Ley 21.663","article":"Art. X","lineNumber":N,"codeSnippet":"fragmento (credenciales como ***REDACTED***)","recommendation":"acción concreta a tomar","estimatedFixHours":N,"tags":["tag1","tag2"],"citation":{"law":"Ley 21.663 — Marco de Ciberseguridad","article":"Art. X — Nombre del artículo","title":"Título descriptivo","text":"cita textual exacta del artículo provisto arriba","whyFix":"párrafo 1: qué vector de ataque concreto habilita este código en este contexto específico.\\n\\npárrafo 2: consecuencias legales: obligación de notificar al CSIRT Nacional en 3h, multas, responsabilidad civil ante usuarios afectados.\\n\\npárrafo 3: por qué la corrección propuesta cierra el vector y cumple con la ley.","url":"https://www.bcn.cl/leychile/navegar?idNorma=1209272"},"suggestedPrompt":"Tengo una vulnerabilidad de seguridad (Ley 21.663) en [archivo]:[línea]...\\n\\n[contexto específico del código con snippet]\\n\\nPor favor: 1) muéstrame el código corregido completo. 2) Explica los cambios para cumplir con Art. X. 3) Indica si hay patrones similares a revisar."}

Si no hay vulnerabilidades responde: []`;

function extractAndParseFindings(raw: string, filePath: string, law: string): AIFinding[] {
  try {
    // Extraer JSON del texto (el LLM puede envolver en markdown fences)
    let clean = raw.trim();
    const fenceMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) { clean = fenceMatch[1].trim(); }
    const arrMatch = clean.match(/\[[\s\S]*\]/);
    if (arrMatch) { clean = arrMatch[0]; }

    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) { return []; }

    return parsed
      .filter((f: any) => f && f.type && f.description)
      .map((f: any): AIFinding => {
        // Parsear citation generado por la IA
        let citation: AILawCitation | undefined;
        if (f.citation && typeof f.citation === 'object') {
          citation = {
            law:     String(f.citation.law     ?? law),
            article: String(f.citation.article ?? f.article ?? ''),
            title:   String(f.citation.title   ?? ''),
            text:    String(f.citation.text    ?? ''),
            whyFix:  String(f.citation.whyFix  ?? ''),
            url:     f.citation.url ? String(f.citation.url) : undefined,
          };
          // Descartar citations vacías
          if (!citation.text && !citation.whyFix) { citation = undefined; }
        }

        return {
          id: f.id ?? crypto.randomUUID(),
          type: String(f.type),
          description: String(f.description),
          severity: (['CRÍTICA', 'ALTA', 'MEDIA', 'BAJA'].includes(f.severity) ? f.severity : 'MEDIA'),
          law: law as any,
          article: f.article ? String(f.article) : undefined,
          file: filePath,
          lineNumber: typeof f.lineNumber === 'number' ? f.lineNumber : undefined,
          codeSnippet: f.codeSnippet ? String(f.codeSnippet).substring(0, 300) : undefined,
          recommendation: String(f.recommendation ?? 'Revisar cumplimiento'),
          estimatedFixHours: typeof f.estimatedFixHours === 'number' ? f.estimatedFixHours : undefined,
          tags: Array.isArray(f.tags) ? f.tags.map(String) : [],
          citation,
          suggestedPrompt: f.suggestedPrompt ? String(f.suggestedPrompt) : undefined,
        };
      });
  } catch {
    return [];
  }
}

async function runAgentWithCopilot(
  systemPrompt: string,
  code: string,
  filePath: string,
  fileType: string,
  agentName: string,
  law: string,
  preferredModel?: string,
): Promise<AIAgentReport> {
  const t0 = Date.now();
  const truncated = code.length > 12000 ? code.substring(0, 12000) + '\n// [truncado]' : code;
  const userPrompt = `Archivo: ${filePath}\nTipo: ${fileType}\n\n\`\`\`${fileType}\n${truncated}\n\`\`\`\n\nAnaliza y responde con el JSON array incluyendo citation y suggestedPrompt por hallazgo.`;

  if (!vscode.lm || typeof (vscode.lm as any).selectChatModels !== 'function') {
    throw new Error(
      'VS Code Language Model API no disponible. Requiere VS Code 1.93+ con GitHub Copilot Chat activo.',
    );
  }

  // Respetar modelo configurado; si es "auto" o no está disponible, hacer fallback
  const FALLBACK_FAMILIES = ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'claude-3-5-sonnet'];
  const familiesToTry = (preferredModel && preferredModel !== 'auto')
    ? [preferredModel, ...FALLBACK_FAMILIES.filter(f => f !== preferredModel)]
    : FALLBACK_FAMILIES;

  let model: any;
  let usedFamily: string | undefined;
  for (const family of familiesToTry) {
    const models = await (vscode.lm as any).selectChatModels({ vendor: 'copilot', family });
    if (models?.length > 0) { model = models[0]; usedFamily = family; break; }
  }

  if (!model) {
    throw new Error(
      'GitHub Copilot Chat no encontró modelos disponibles. ' +
      'Verifica que la extensión "GitHub Copilot Chat" está instalada y activa, ' +
      'que estás autenticado y que tu plan incluye acceso al Chat.',
    );
  }

  // Logear modelo activo en output channel
  try {
    const out = (vscode as any).__outputChannel;
    if (out?.appendLine) { out.appendLine(`   🤖 Copilot: ${usedFamily}`); }
  } catch { /* output channel opcional */ }

  const combinedPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;
  const messages = [vscode.LanguageModelChatMessage.User(combinedPrompt)];
  const response = await model.sendRequest(messages, {});

  const chunks: string[] = [];
  // API correcta VS Code 1.93+: response.text es AsyncIterable<string>
  const stream = response?.text ?? response;
  for await (const fragment of stream) {
    const text = typeof fragment === 'string' ? fragment : (fragment?.value ?? fragment?.text ?? '');
    if (text) { chunks.push(text); }
  }

  return buildAgentReport(agentName, law, extractAndParseFindings(chunks.join(''), filePath, law), Date.now() - t0);
}

async function runAgentWithExternalProvider(
  systemPrompt: string,
  code: string,
  filePath: string,
  fileType: string,
  agentName: string,
  law: string,
  providerType: string,
  apiKey: string,
  model: string,
  azureEndpoint: string,
): Promise<AIAgentReport> {
  const t0 = Date.now();
  const truncated = code.length > 12000 ? code.substring(0, 12000) + '\n// [truncado]' : code;
  const userPrompt = `Archivo: ${filePath}\nTipo: ${fileType}\n\n\`\`\`${fileType}\n${truncated}\n\`\`\`\n\nAnaliza y responde con el JSON array incluyendo citation y suggestedPrompt por hallazgo.`;

  let findings: AIFinding[] = [];

  try {
    let rawResponse: string;

    if (providerType === 'openai' || providerType === 'azure-openai') {
      const baseUrl = providerType === 'azure-openai'
        ? `${azureEndpoint}/openai/deployments/${model}`
        : 'https://api.openai.com/v1';
      const endpoint = providerType === 'azure-openai'
        ? `${baseUrl}/chat/completions?api-version=2024-02-15-preview`
        : `${baseUrl}/chat/completions`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          ...(providerType === 'azure-openai' ? { 'api-key': apiKey } : {}),
        },
        body: JSON.stringify({
          model: providerType === 'azure-openai' ? undefined : model,
          temperature: 0,
          max_tokens: 8192,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt   },
          ],
        }),
      });
      if (!res.ok) { throw new Error(`HTTP ${res.status}`); }
      const data = await res.json() as any;
      rawResponse = data?.choices?.[0]?.message?.content ?? '[]';

    } else if (providerType === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 8192,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
      if (!res.ok) { throw new Error(`HTTP ${res.status}`); }
      const data = await res.json() as any;
      rawResponse = data?.content?.[0]?.text ?? '[]';

    } else {
      rawResponse = '[]';
    }

    findings = extractAndParseFindings(rawResponse, filePath, law);
  } catch {
    findings = [];
  }

  return buildAgentReport(agentName, law, findings, Date.now() - t0);
}

function buildAgentReport(
  agentName: string, law: string, findings: AIFinding[], ms: number,
): AIAgentReport {
  type Sev = 'CRÍTICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  const ORDER: Record<Sev, number> = { 'CRÍTICA': 0, 'ALTA': 1, 'MEDIA': 2, 'BAJA': 3 };
  findings = [...findings].sort((a, b) => ORDER[a.severity as Sev] - ORDER[b.severity as Sev]);

  const critical = findings.filter(f => f.severity === 'CRÍTICA').length;
  const high     = findings.filter(f => f.severity === 'ALTA').length;
  const medium   = findings.filter(f => f.severity === 'MEDIA').length;
  const low      = findings.filter(f => f.severity === 'BAJA').length;
  const status   = critical > 0 ? 'FAIL' : high > 0 ? 'WARN' : 'PASS';

  const parts: string[] = [];
  if (critical > 0) { parts.push(`${critical} CRÍTICA`); }
  if (high     > 0) { parts.push(`${high} ALTA`); }
  if (medium   > 0) { parts.push(`${medium} MEDIA`); }
  if (low      > 0) { parts.push(`${low} BAJA`); }

  return {
    agentName: `${agentName} [IA]`,
    law, executedAt: new Date().toISOString(), executionMs: ms,
    totalFindings: findings.length, criticalFindings: critical,
    highFindings: high, mediumFindings: medium, lowFindings: low,
    status: status as any, findings,
    summary: status === 'PASS'
      ? `✅ Sin problemas detectados por ${agentName} (IA)`
      : `${status === 'FAIL' ? '❌' : '⚠️'} ${agentName} (IA): ${parts.join(', ')}`,
  };
}

export async function analyzeWithAI(
  code: string,
  filePath: string,
  fileType: string,
  settings: SettingsManager,
): Promise<AIAnalysisResult> {
  const provider   = settings.getAIProvider();
  const model      = settings.getAIModel();
  const azureEndpt = settings.getAzureEndpoint();
  const apiKey     = (await settings.getApiKey()) ?? '';

  const runAgent = (systemPrompt: string, agentName: string, law: string) =>
    provider === 'github-copilot'
      ? runAgentWithCopilot(systemPrompt, code, filePath, fileType, agentName, law, model)
      : runAgentWithExternalProvider(
          systemPrompt, code, filePath, fileType, agentName, law,
          provider, apiKey, model, azureEndpt,
        );

  const [dpaReport, csaReport] = await Promise.all([
    runAgent(DPA_SYSTEM_PROMPT, 'DPA Agent (Ley 21.719)', 'Ley 21.719'),
    runAgent(CSA_SYSTEM_PROMPT, 'CSA Agent (Ley 21.663)', 'Ley 21.663'),
  ]);

  const agentReports = [dpaReport, csaReport];
  const allFindings = agentReports.flatMap(r => r.findings);
  const criticalCount = allFindings.filter(f => f.severity === 'CRÍTICA').length;
  const highCount     = allFindings.filter(f => f.severity === 'ALTA').length;

  const overallStatus = criticalCount > 0 ? 'FAIL' : highCount > 0 ? 'WARN' : 'PASS';
  const penalty = criticalCount * 25 + highCount * 10 +
    allFindings.filter(f => f.severity === 'MEDIA').length * 3 +
    allFindings.filter(f => f.severity === 'BAJA').length * 1;

  return {
    agentReports,
    totalFindings: allFindings.length,
    criticalFindings: criticalCount,
    highFindings: highCount,
    overallStatus: overallStatus as any,
    overallScore: Math.max(0, 100 - penalty),
  };
}
