// src/agents/base-agent.ts
import {
  AgentReport,
  AnalysisInput,
  ComplianceStatus,
  Finding,
  LawName,
  Severity,
} from '../types/index.js';

export abstract class BaseAgent {
  abstract readonly name: string;
  abstract readonly law: LawName;

  abstract analyze(input: AnalysisInput): Promise<Finding[]>;

  async run(input: AnalysisInput): Promise<AgentReport> {
    const start = Date.now();
    const findings = await this.analyze(input);
    const ms = Date.now() - start;

    const count = (s: Severity) => findings.filter(f => f.severity === s).length;
    const critical = count('CRÍTICA');
    const high = count('ALTA');
    const medium = count('MEDIA');
    const low = count('BAJA');

    const status: ComplianceStatus =
      critical > 0 ? 'FAIL' : high > 0 ? 'WARN' : 'PASS';

    return {
      agentName: this.name,
      law: this.law,
      executedAt: new Date().toISOString(),
      executionMs: ms,
      totalFindings: findings.length,
      criticalFindings: critical,
      highFindings: high,
      mediumFindings: medium,
      lowFindings: low,
      status,
      findings: this.sortByPriority(findings),
      summary: this.buildSummary(status, critical, high, medium, low),
    };
  }

  private sortByPriority(findings: Finding[]): Finding[] {
    const order: Record<Severity, number> = {
      CRÍTICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3,
    };
    return [...findings].sort(
      (a, b) => order[a.severity] - order[b.severity]
    );
  }

  private buildSummary(
    status: ComplianceStatus,
    critical: number,
    high: number,
    medium: number,
    low: number
  ): string {
    if (status === 'PASS') {
      return `✅ Sin problemas detectados por ${this.name}`;
    }
    const parts: string[] = [];
    if (critical > 0) parts.push(`${critical} CRÍTICA`);
    if (high > 0) parts.push(`${high} ALTA`);
    if (medium > 0) parts.push(`${medium} MEDIA`);
    if (low > 0) parts.push(`${low} BAJA`);
    return `${status === 'FAIL' ? '❌' : '⚠️'} ${this.name}: ${parts.join(', ')}`;
  }
}
