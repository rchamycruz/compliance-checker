// src/orchestrator-ai.ts
// Orquestador AI: coordina agentes IA en paralelo y consolida resultados
// Produce el mismo OrchestratorReport que el Orchestrator estático.

import { AnalysisInput, ComplianceStatus, OrchestratorReport } from './types/index.js';
import { AIProvider, AIProviderConfig, AIProviderError } from './ai/ai-provider.js';
import { OpenAIProvider } from './ai/openai-provider.js';
import { AnthropicProvider } from './ai/anthropic-provider.js';
import { DPAAIAgent } from './agents/ai/dpa-ai-agent.js';
import { CSAAIAgent } from './agents/ai/csa-ai-agent.js';

export class OrchestratorAI {
  private readonly provider: AIProvider;

  constructor(config: AIProviderConfig) {
    this.provider = OrchestratorAI.buildProvider(config);
  }

  static buildProvider(config: AIProviderConfig): AIProvider {
    switch (config.type) {
      case 'openai':
        return new OpenAIProvider(config.apiKey ?? '', config.model);
      case 'anthropic':
        return new AnthropicProvider(config.apiKey ?? '', config.model);
      case 'azure-openai':
        return new OpenAIProvider(
          config.apiKey ?? '',
          config.model ?? 'gpt-4o',
          config.azureEndpoint ?? '',
        );
      case 'github-copilot':
        throw new AIProviderError(
          'GitHub Copilot solo puede ser usado dentro de la extensión VS Code. Use OrchestratorAI con openai o anthropic desde CLI.',
          'NO_COPILOT',
        );
      default:
        throw new AIProviderError(`Proveedor desconocido: ${config.type}`, 'NETWORK');
    }
  }

  async analyze(input: AnalysisInput): Promise<OrchestratorReport> {
    const start = Date.now();

    const agents = [
      new DPAAIAgent(this.provider),
      new CSAAIAgent(this.provider),
    ];

    const agentReports = await Promise.all(agents.map(a => a.run(input)));

    const allFindings = agentReports.flatMap(r => r.findings);
    const totalMs = Date.now() - start;

    const criticalCount = allFindings.filter(f => f.severity === 'CRÍTICA').length;
    const highCount     = allFindings.filter(f => f.severity === 'ALTA').length;

    const overallStatus: ComplianceStatus =
      criticalCount > 0 ? 'FAIL' : highCount > 0 ? 'WARN' : 'PASS';

    const penalty =
      criticalCount * 25 +
      highCount * 10 +
      allFindings.filter(f => f.severity === 'MEDIA').length * 3 +
      allFindings.filter(f => f.severity === 'BAJA').length * 1;
    const score = Math.max(0, 100 - penalty);

    const seen = new Set<string>();
    const recommendations = allFindings
      .filter(f => {
        if (seen.has(f.type)) { return false; }
        seen.add(f.type);
        return true;
      })
      .slice(0, 5)
      .map(f => `[${f.severity}] ${f.recommendation}`);

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
      recommendations,
    };
  }
}
