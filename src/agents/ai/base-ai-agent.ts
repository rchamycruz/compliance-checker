// src/agents/ai/base-ai-agent.ts
// Agente IA base: recibe un Skill, invoca el provider y retorna Finding[]

import { AgentReport, AnalysisInput, ComplianceStatus, Severity } from '../../types/index.js';
import { AIProvider } from '../../ai/ai-provider.js';
import { AgentSkill } from '../skills/base-skill.js';

export abstract class BaseAIAgent {
  abstract readonly name: string;

  constructor(
    protected readonly skill: AgentSkill,
    protected readonly provider: AIProvider,
  ) {}

  async run(input: AnalysisInput): Promise<AgentReport> {
    const start = Date.now();

    const fileType = input.fileType === 'unknown' ? 'code' : input.fileType;
    const systemPrompt = this.skill.buildSystemPrompt();
    const userPrompt   = this.skill.buildUserPrompt(input.code, input.filePath, fileType);

    let findings = await this.provider
      .complete({ systemPrompt, userPrompt, maxTokens: 4096, temperature: 0 })
      .then(raw => this.skill.parseResponse(raw, input.filePath))
      .catch(() => []);  // Si el LLM falla, retornar findings vacíos

    const ms = Date.now() - start;
    const count = (s: Severity) => findings.filter(f => f.severity === s).length;
    const critical = count('CRÍTICA');
    const high     = count('ALTA');
    const medium   = count('MEDIA');
    const low      = count('BAJA');

    const status: ComplianceStatus =
      critical > 0 ? 'FAIL' : high > 0 ? 'WARN' : 'PASS';

    // Ordenar por prioridad
    const ORDER: Record<Severity, number> = { 'CRÍTICA': 0, 'ALTA': 1, 'MEDIA': 2, 'BAJA': 3 };
    findings = [...findings].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);

    const summaryIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    const parts: string[] = [];
    if (critical > 0) { parts.push(`${critical} CRÍTICA`); }
    if (high     > 0) { parts.push(`${high} ALTA`); }
    if (medium   > 0) { parts.push(`${medium} MEDIA`); }
    if (low      > 0) { parts.push(`${low} BAJA`); }
    const summary = status === 'PASS'
      ? `✅ Sin problemas detectados por ${this.name} (IA)`
      : `${summaryIcon} ${this.name} (IA): ${parts.join(', ')}`;

    return {
      agentName: `${this.name} [IA]`,
      law: this.skill.lawName,
      executedAt: new Date().toISOString(),
      executionMs: ms,
      totalFindings: findings.length,
      criticalFindings: critical,
      highFindings: high,
      mediumFindings: medium,
      lowFindings: low,
      status,
      findings,
      summary,
    };
  }
}
