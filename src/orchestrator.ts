// src/orchestrator.ts
// Orquestrador central: coordina agentes en paralelo y consolida resultados

import {
  AnalysisInput,
  ComplianceStatus,
  OrchestratorReport,
} from './types/index.js';
import { BaseAgent } from './agents/base-agent.js';
import { DPAAgent } from './agents/dpa-agent.js';
import { CSAAgent } from './agents/csa-agent.js';

export class Orchestrator {
  private agents: BaseAgent[];

  constructor() {
    this.agents = [
      new DPAAgent(),
      new CSAAgent(),
    ];
  }

  async analyze(input: AnalysisInput): Promise<OrchestratorReport> {
    const start = Date.now();

    // Ejecutar todos los agentes en paralelo
    const agentReports = await Promise.all(
      this.agents.map(agent => agent.run(input))
    );

    const allFindings = agentReports.flatMap(r => r.findings);
    const totalMs = Date.now() - start;

    const criticalCount = allFindings.filter(f => f.severity === 'CRÍTICA').length;
    const highCount = allFindings.filter(f => f.severity === 'ALTA').length;

    const overallStatus: ComplianceStatus =
      criticalCount > 0 ? 'FAIL' : highCount > 0 ? 'WARN' : 'PASS';

    // Score 0-100: penalizar más los críticos
    const penalty = criticalCount * 25 + highCount * 10 +
      allFindings.filter(f => f.severity === 'MEDIA').length * 3 +
      allFindings.filter(f => f.severity === 'BAJA').length * 1;
    const score = Math.max(0, 100 - penalty);

    return {
      projectName: input.projectRoot ?? input.filePath,
      analyzedAt: new Date().toISOString(),
      totalExecutionMs: totalMs,
      filesAnalyzed: [input.filePath],
      overallStatus,
      overallScore: score,
      agentReports,
      totalFindings: allFindings.length,
      criticalFindings: criticalCount,
      highFindings: highCount,
      blockMerge: criticalCount > 0,
      recommendations: this.buildTopRecommendations(allFindings),
    };
  }

  private buildTopRecommendations(findings: ReturnType<typeof Array.prototype.flatMap>): string[] {
    // Devolver las top-5 recomendaciones únicas ordenadas por severidad
    const seen = new Set<string>();
    return findings
      .filter(f => {
        if (seen.has(f.type)) return false;
        seen.add(f.type);
        return true;
      })
      .slice(0, 5)
      .map((f: any) => `[${f.severity}] ${f.recommendation}`);
  }
}
