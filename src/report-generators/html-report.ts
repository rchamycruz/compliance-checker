// src/report-generators/html-report.ts
// Genera un reporte HTML completo y legible para humanos

import { OrchestratorReport, Finding, Severity } from '../types/index.js';

const SEVERITY_COLOR: Record<Severity, string> = {
  'CRÍTICA': '#dc2626',
  'ALTA':    '#ea580c',
  'MEDIA':   '#ca8a04',
  'BAJA':    '#2563eb',
};

const SEVERITY_BG: Record<Severity, string> = {
  'CRÍTICA': '#fef2f2',
  'ALTA':    '#fff7ed',
  'MEDIA':   '#fefce8',
  'BAJA':    '#eff6ff',
};

const SEVERITY_ICON: Record<Severity, string> = {
  'CRÍTICA': '🔴',
  'ALTA':    '🟠',
  'MEDIA':   '🟡',
  'BAJA':    '🔵',
};

function escapeHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function findingRow(f: Finding): string {
  const color = SEVERITY_COLOR[f.severity];
  const bg    = SEVERITY_BG[f.severity];
  const icon  = SEVERITY_ICON[f.severity];
  return `
    <tr style="background:${bg}">
      <td style="text-align:center;font-size:1.2em">${icon}</td>
      <td><span style="color:${color};font-weight:700;font-size:.85em">${f.severity}</span></td>
      <td style="font-family:monospace;font-size:.8em">${f.file ? escapeHtml(f.file.replace(/.*[\\/]/, '')) : '—'}:${f.lineNumber ?? '?'}</td>
      <td style="font-size:.85em;max-width:280px">${escapeHtml(f.description)}</td>
      <td style="font-size:.8em;color:#64748b">${escapeHtml(f.law)}<br><em>${escapeHtml(f.article ?? f.type)}</em></td>
      <td style="font-size:.82em;max-width:260px">${escapeHtml(f.recommendation)}</td>
      <td style="text-align:center;font-size:.85em">${f.estimatedFixHours ?? '—'}h</td>
    </tr>`;
}

export function generateHtmlReport(report: OrchestratorReport): string {
  const statusColor = report.overallStatus === 'FAIL' ? '#dc2626'
    : report.overallStatus === 'WARN' ? '#ea580c' : '#16a34a';
  const statusLabel = report.overallStatus === 'FAIL' ? '❌ MERGE BLOQUEADO'
    : report.overallStatus === 'WARN' ? '⚠️ REQUIERE REVISIÓN' : '✅ APROBADO';

  const allFindings = report.agentReports.flatMap(a => a.findings);

  const agentSections = report.agentReports.map(ar => {
    if (!ar.findings.length) {
      return `<section class="agent-section">
        <h3>✅ ${escapeHtml(ar.agentName)}</h3>
        <p style="color:#16a34a">Sin problemas detectados.</p>
      </section>`;
    }
    const rows = ar.findings.map(findingRow).join('');
    return `<section class="agent-section">
      <h3>${escapeHtml(ar.agentName)}</h3>
      <table>
        <thead><tr>
          <th></th><th>Severidad</th><th>Ubicación</th>
          <th>Descripción</th><th>Ley / Artículo</th>
          <th>Recomendación</th><th>Fix (h)</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
  }).join('');

  const totalHours = allFindings.reduce((s, f) => s + (f.estimatedFixHours ?? 0), 0);
  const tagFreq: Record<string, number> = {};
  allFindings.forEach(f => f.tags.forEach(t => { tagFreq[t] = (tagFreq[t] ?? 0) + 1; }));
  const topTags = Object.entries(tagFreq).sort((a,b) => b[1]-a[1]).slice(0,8);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Syntaxis Compliance Report</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f8fafc;color:#1e293b;padding:2rem}
  h1{font-size:1.7rem;font-weight:800;color:#0f172a}
  h2{font-size:1.2rem;font-weight:700;color:#334155;margin:1.5rem 0 .8rem}
  h3{font-size:1rem;font-weight:700;color:#475569;margin-bottom:.6rem}
  .header{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:2rem}
  .badge{display:inline-block;padding:.35rem .9rem;border-radius:999px;font-weight:700;font-size:.95rem;color:#fff;background:${statusColor}}
  .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:1rem;margin-bottom:2rem}
  .card{background:#fff;border-radius:10px;padding:1rem;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.07)}
  .card .val{font-size:2rem;font-weight:800}
  .card .lbl{font-size:.8rem;color:#64748b;margin-top:.2rem}
  .agent-section{background:#fff;border-radius:10px;padding:1.4rem;margin-bottom:1.5rem;box-shadow:0 1px 4px rgba(0,0,0,.07)}
  table{width:100%;border-collapse:collapse;font-size:.85rem;margin-top:.6rem}
  th{background:#f1f5f9;text-align:left;padding:.55rem .7rem;font-weight:600;color:#475569;white-space:nowrap}
  td{padding:.5rem .7rem;border-top:1px solid #f1f5f9;vertical-align:top}
  .tags{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.3rem}
  .tag{background:#e2e8f0;color:#475569;padding:.2rem .6rem;border-radius:999px;font-size:.75rem}
  .recs{background:#fff;border-radius:10px;padding:1.2rem;margin-bottom:1.5rem;box-shadow:0 1px 4px rgba(0,0,0,.07)}
  .rec-item{padding:.5rem 0;border-bottom:1px solid #f1f5f9;font-size:.88rem}
  .rec-item:last-child{border-bottom:none}
  footer{text-align:center;color:#94a3b8;font-size:.8rem;margin-top:2rem}
  @media(prefers-color-scheme:dark){body{background:#0f172a;color:#e2e8f0}
    .card,.agent-section,.recs{background:#1e293b}th{background:#334155}
    td{border-color:#334155}.tag{background:#334155;color:#94a3b8}}
</style>
</head>
<body>

<div class="header">
  <div>
    <h1>🔍 Syntaxis Compliance Report</h1>
    <p style="color:#64748b;margin-top:.4rem">
      ${escapeHtml(report.projectName)} &nbsp;·&nbsp; ${report.analyzedAt}
    </p>
  </div>
  <span class="badge">${statusLabel}</span>
</div>

<!-- KPIs -->
<div class="cards">
  <div class="card">
    <div class="val" style="color:#0f172a">${report.overallScore}</div>
    <div class="lbl">Score / 100</div>
  </div>
  <div class="card">
    <div class="val" style="color:#dc2626">${report.criticalFindings}</div>
    <div class="lbl">CRÍTICA</div>
  </div>
  <div class="card">
    <div class="val" style="color:#ea580c">${report.highFindings}</div>
    <div class="lbl">ALTA</div>
  </div>
  <div class="card">
    <div class="val" style="color:#0f172a">${report.totalFindings}</div>
    <div class="lbl">Total hallazgos</div>
  </div>
  <div class="card">
    <div class="val" style="color:#0f172a">${totalHours}</div>
    <div class="lbl">Horas estimadas fix</div>
  </div>
  <div class="card">
    <div class="val" style="color:#0f172a">${report.totalExecutionMs}</div>
    <div class="lbl">ms análisis</div>
  </div>
</div>

<!-- Archivos analizados -->
<h2>📁 Archivos analizados (${report.filesAnalyzed.length})</h2>
<div class="agent-section" style="padding:.8rem 1.2rem">
  ${report.filesAnalyzed.map(f => `<code style="display:block;font-size:.82rem;padding:.2rem 0">${escapeHtml(f)}</code>`).join('')}
</div>

<!-- Recomendaciones top -->
${report.recommendations.length ? `
<h2>💡 Top Recomendaciones</h2>
<div class="recs">
  ${report.recommendations.map(r => `<div class="rec-item">${escapeHtml(r)}</div>`).join('')}
</div>` : ''}

<!-- Tags frecuentes -->
${topTags.length ? `
<h2>🏷️ Categorías de problemas</h2>
<div class="tags" style="margin-bottom:1.5rem">
  ${topTags.map(([tag,n]) => `<span class="tag">${escapeHtml(tag)} (${n})</span>`).join('')}
</div>` : ''}

<!-- Secciones por agente -->
<h2>📊 Detalle por Agente</h2>
${agentSections}

<footer>
  Generado por <strong>Syntaxis Compliance Checker</strong> &nbsp;·&nbsp;
  Ley 21.719 (Protección de Datos) + Ley 21.663 (Ciberseguridad) &nbsp;·&nbsp;
  ${report.analyzedAt}
</footer>

</body></html>`;
}
