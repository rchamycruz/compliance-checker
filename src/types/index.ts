// src/types/index.ts
// Tipos compartidos para el sistema de agentes de compliance

export type Severity = 'CRÍTICA' | 'ALTA' | 'MEDIA' | 'BAJA';
export type ComplianceStatus = 'PASS' | 'WARN' | 'FAIL';
export type LawName = 'Ley 21.719' | 'Ley 21.663' | 'Transversal';

export interface Finding {
  id: string;
  type: string;
  description: string;
  severity: Severity;
  law: LawName;
  article?: string;
  file?: string;
  lineNumber?: number;
  columnNumber?: number;
  codeSnippet?: string;
  recommendation: string;
  estimatedFixHours?: number;
  tags: string[];
}

export interface AgentReport {
  agentName: string;
  law: LawName;
  executedAt: string;
  executionMs: number;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  status: ComplianceStatus;
  findings: Finding[];
  summary: string;
}

export interface OrchestratorReport {
  projectName: string;
  analyzedAt: string;
  totalExecutionMs: number;
  filesAnalyzed: string[];
  overallStatus: ComplianceStatus;
  overallScore: number; // 0-100
  agentReports: AgentReport[];
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  blockMerge: boolean;
  recommendations: string[];
}

export interface AnalysisInput {
  code: string;
  filePath: string;
  fileType: 'csharp' | 'javascript' | 'typescript' | 'sql' | 'json' | 'unknown';
  projectRoot?: string;
  globalContext?: {
    hasGlobalAuthFilter?: boolean; // true si Program.cs/Startup.cs registra un filtro global de autorización
  };
}
