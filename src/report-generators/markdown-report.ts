// src/report-generators/markdown-report.ts
// Genera reporte Markdown para GitHub PR comments, wikis y documentación

import { OrchestratorReport, Finding, Severity } from '../types/index.js';

const ICONS: Record<Severity, string> = {
  'CRÍTICA': '🔴', 'ALTA': '🟠', 'MEDIA': '🟡', 'BAJA': '🔵',
};

export function generateMarkdownReport(report: OrchestratorReport): string {
  const allFindings = report.agentReports.flatMap(a => a.findings);
  const statusLine = report.overallStatus === 'FAIL'
    ? '## ❌ Estado: MERGE BLOQUEADO'
    : report.overallStatus === 'WARN'
    ? '## ⚠️ Estado: REQUIERE REVISIÓN'
    : '## ✅ Estado: APROBADO';

  const totalHours = allFindings.reduce((s, f) => s + (f.estimatedFixHours ?? 0), 0);

  // ── Tabla resumen KPIs ───────────────────────────────────────────────────
  const kpiTable = `
| Métrica | Valor |
|---|---|
| Score | ${report.overallScore} / 100 |
| 🔴 CRÍTICA | ${report.criticalFindings} |
| 🟠 ALTA | ${report.highFindings} |
| Total hallazgos | ${report.totalFindings} |
| Tiempo de análisis | ${report.totalExecutionMs}ms |
| Horas estimadas de fix | ~${totalHours}h |
`;

  // ── Archivos analizados ──────────────────────────────────────────────────
  const filesSection = report.filesAnalyzed.length
    ? `\n### 📁 Archivos analizados\n${report.filesAnalyzed.map(f => `- \`${f}\``).join('\n')}\n`
    : '';

  // ── Recomendaciones top ──────────────────────────────────────────────────
  const recsSection = report.recommendations.length
    ? `\n### 💡 Top recomendaciones\n${report.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n`
    : '';

  // ── Detalle por agente ───────────────────────────────────────────────────
  const agentSections = report.agentReports.map(ar => {
    if (!ar.findings.length) {
      return `\n#### ✅ ${ar.agentName}\n\nSin problemas detectados.\n`;
    }

    const rows = ar.findings.map((f: Finding) => {
      const loc = f.lineNumber ? `\`${f.file ? f.file.replace(/.*[\\/]/, '') : '?'}:${f.lineNumber}\`` : '—';
      const desc = f.description.replace(/\|/g, '\\|').substring(0, 80);
      const rec  = f.recommendation.replace(/\|/g, '\\|').substring(0, 70);
      return `| ${ICONS[f.severity]} ${f.severity} | ${loc} | ${desc} | ${f.article ?? f.type} | ${rec} |`;
    }).join('\n');

    return `
#### ${ar.agentName}

| Severidad | Ubicación | Descripción | Artículo | Recomendación |
|---|---|---|---|---|
${rows}
`;
  }).join('');

  return `# 🔍 Syntaxis Compliance Report

${statusLine}

**Proyecto:** \`${report.projectName}\`
**Analizado:** ${report.analyzedAt}

---

${kpiTable}
${filesSection}
${recsSection}

---

## 📊 Detalle por Agente
${agentSections}

---

> Leyes verificadas: **Ley 21.719** (Protección de Datos Personales) · **Ley 21.663** (Marco de Ciberseguridad)
> Generado por Syntaxis Compliance Checker
`;
}
