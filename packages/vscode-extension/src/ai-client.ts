// packages/vscode-extension/src/ai-client.ts
// Cliente AI para uso dentro de la extensión VS Code.
// Soporta GitHub Copilot (vscode.lm) y proveedores externos (OpenAI, Anthropic, Azure).

import * as vscode from 'vscode';
import { SettingsManager } from './settings-manager.js';

interface Finding {
  id: string; type: string; description: string;
  severity: 'CRÍTICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  law: string; article?: string;
  file?: string; lineNumber?: number; codeSnippet?: string;
  recommendation: string; estimatedFixHours?: number; tags: string[];
}

interface AgentReport {
  agentName: string; law: string; executedAt: string; executionMs: number;
  totalFindings: number; criticalFindings: number; highFindings: number;
  mediumFindings: number; lowFindings: number;
  status: 'PASS' | 'WARN' | 'FAIL'; findings: Finding[]; summary: string;
}

interface AIAnalysisResult {
  agentReports: AgentReport[];
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  overallStatus: 'PASS' | 'WARN' | 'FAIL';
  overallScore: number;
}

// ─── Prompts de cada agente (importados inline para evitar dependencias de src/) ─
const DPA_SYSTEM_PROMPT = `Eres un agente de cumplimiento legal especializado en la Ley 21.719 de Protección de Datos Personales de Chile.

## Artículos aplicables
- Art. 3 (Minimización): Solo tratar datos estrictamente necesarios. Detecta logs con PII o campos redundantes.
- Art. 4 (Consentimiento): Creación de usuarios/registros debe registrar consentimiento explícito.
- Art. 7 (Supresión): Controladores con datos de usuarios deben exponer endpoint DELETE.
- Art. 9 (Portabilidad): Debe existir endpoint de exportación de datos del titular.
- Art. 18 (Seguridad): Campos PII (email, RUT, teléfono, tarjeta) cifrados. No MD5/SHA1 para passwords.
- Art. 20 (Notificación): SQL Injection que exponga datos personales activa deber de notificación en 72h.

## Instrucciones
1. Analiza el código línea por línea
2. Detecta TODAS las violaciones con rigor de auditoría formal
3. Responde ÚNICAMENTE con un JSON array con este esquema por item:
{"id":"uuid","type":"TIPO","description":"descripción","severity":"CRÍTICA|ALTA|MEDIA|BAJA","law":"Ley 21.719","article":"Art. X","lineNumber":N,"codeSnippet":"fragmento","recommendation":"acción concreta","estimatedFixHours":N,"tags":["tag"]}
Si no hay violaciones responde: []
NO incluyas markdown ni texto extra.`;

const CSA_SYSTEM_PROMPT = `Eres un agente de ciberseguridad especializado en la Ley 21.663 Marco de Ciberseguridad de Chile y OWASP.

## Artículos aplicables
- Art. 6 (Credenciales): Detecta passwords, API keys, tokens hardcodeados en código fuente.
- Art. 6 (Auth): Endpoints HTTP sin autenticación ([Authorize], requireAuth, verifyToken).
- Art. 6 (Criptografía): Uso de MD5, SHA1, DES, RC4.
- Art. 6 (TLS): Encrypt=false, TrustServerCertificate=true, sslmode=disable en connection strings.
- Art. 6 (CORS): AllowAnyOrigin(), origins:["*"], Access-Control-Allow-Origin: *.
- Art. 6 (Rate limit): Endpoints de login/auth sin rate limiting.

## Instrucciones
1. Revisa el código con mentalidad de pentester + auditor legal
2. Al reportar credenciales, usa "***REDACTED***" en el snippet
3. Si el controlador completo tiene [Authorize] a nivel de clase, los endpoints individuales están cubiertos
4. Responde ÚNICAMENTE con un JSON array con este esquema por item:
{"id":"uuid","type":"TIPO","description":"descripción","severity":"CRÍTICA|ALTA|MEDIA|BAJA","law":"Ley 21.663","article":"Art. X","lineNumber":N,"codeSnippet":"fragmento","recommendation":"acción concreta","estimatedFixHours":N,"tags":["tag"]}
Si no hay vulnerabilidades responde: []
NO incluyas markdown ni texto extra.`;

function extractAndParseFindings(raw: string, filePath: string, law: string): Finding[] {
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
      .map((f: any): Finding => ({
        id: f.id ?? crypto.randomUUID(),
        type: String(f.type),
        description: String(f.description),
        severity: (['CRÍTICA', 'ALTA', 'MEDIA', 'BAJA'].includes(f.severity) ? f.severity : 'MEDIA'),
        law: law as any,
        article: f.article ? String(f.article) : undefined,
        file: filePath,
        lineNumber: typeof f.lineNumber === 'number' ? f.lineNumber : undefined,
        codeSnippet: f.codeSnippet ? String(f.codeSnippet).substring(0, 200) : undefined,
        recommendation: String(f.recommendation ?? 'Revisar cumplimiento'),
        estimatedFixHours: typeof f.estimatedFixHours === 'number' ? f.estimatedFixHours : undefined,
        tags: Array.isArray(f.tags) ? f.tags.map(String) : [],
      }));
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
): Promise<AgentReport> {
  const t0 = Date.now();
  const truncated = code.length > 12000 ? code.substring(0, 12000) + '\n// [truncado]' : code;
  const userPrompt = `Archivo: ${filePath}\nTipo: ${fileType}\n\n\`\`\`${fileType}\n${truncated}\n\`\`\`\n\nAnaliza y responde con el JSON array.`;

  let findings: Finding[] = [];

  try {
    // Intentar modelos Copilot en orden de preferencia
    let model: any;
    for (const family of ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'claude-3-5-sonnet']) {
      const models = await (vscode.lm as any).selectChatModels({ vendor: 'copilot', family });
      if (models?.length > 0) { model = models[0]; break; }
    }
    if (!model) { throw new Error('GitHub Copilot no disponible'); }

    const combinedPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;
    const messages = [vscode.LanguageModelChatMessage.User(combinedPrompt)];
    const response = await model.sendRequest(messages, {});

    const chunks: string[] = [];
    for await (const part of response) {
      const text = part?.value ?? part?.text ?? '';
      if (text) { chunks.push(text); }
    }
    findings = extractAndParseFindings(chunks.join(''), filePath, law);
  } catch {
    findings = [];
  }

  return buildAgentReport(agentName, law, findings, Date.now() - t0);
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
): Promise<AgentReport> {
  const t0 = Date.now();
  const truncated = code.length > 12000 ? code.substring(0, 12000) + '\n// [truncado]' : code;
  const userPrompt = `Archivo: ${filePath}\nTipo: ${fileType}\n\n\`\`\`${fileType}\n${truncated}\n\`\`\`\n\nAnaliza y responde con el JSON array.`;

  let findings: Finding[] = [];

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
          max_tokens: 4096,
          response_format: { type: 'json_object' },
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
          max_tokens: 4096,
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
  agentName: string, law: string, findings: Finding[], ms: number,
): AgentReport {
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
      ? runAgentWithCopilot(systemPrompt, code, filePath, fileType, agentName, law)
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
