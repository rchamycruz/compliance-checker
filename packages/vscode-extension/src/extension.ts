// packages/vscode-extension/src/extension.ts
// v0.2.0: análisis real, sin memory leaks, sin stubs hardcodeados
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

// OutputChannel singleton — evita re-crear en cada llamada (memory leak fix)
let outputChannel: vscode.OutputChannel | undefined;
function getOutput(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Syntaxis Compliance');
  }
  return outputChannel;
}

type Severity = 'CRÍTICA' | 'ALTA' | 'MEDIA' | 'BAJA';
type Status   = 'PASS' | 'WARN' | 'FAIL';

interface Finding {
  id: string; type: string; description: string;
  severity: Severity; law: string; article?: string;
  file?: string; lineNumber?: number; codeSnippet?: string;
  recommendation: string; estimatedFixHours?: number; tags: string[];
}
interface Report {
  projectName: string; analyzedAt: string; totalExecutionMs: number;
  filesAnalyzed: string[]; overallStatus: Status; overallScore: number;
  totalFindings: number; criticalFindings: number; highFindings: number;
  blockMerge: boolean; recommendations: string[];
  agentReports: { agentName: string; law: string; findings: Finding[] }[];
}

// ─── Motor de análisis (inline, sin dependencias externas) ───────────────────
function analyzeCode(code: string, filePath: string, opts?: { globalAuthFilter?: boolean }): Report {
  const t0 = Date.now();
  const lines = code.split('\n');
  const findings: Finding[] = [];

  const skip = (l: string) => l.trim().startsWith('//') || l.trim().startsWith('*');

  // ── Ley 21.719: PII sin cifrado ────────────────────────────────────────────
  const piiRe   = [/\bemail\b/i,/\bphone\b/i,/\brut\b/i,/\bpassword\b/i,/\bsalud\b/i,/\bhealth/i];
  const encRe   = [/encrypt/i,/hash/i,/bcrypt/i,/AES/i,/cifra/i];
  const propRe  = /\b(string|nvarchar|varchar|TEXT)\b/i;

  lines.forEach((line, i) => {
    if (skip(line)) { return; }
    if (piiRe.some(r=>r.test(line)) && !encRe.some(e=>e.test(line)) && propRe.test(line)) {
      findings.push({ id: crypto.randomUUID(), type:'PII_UNENCRYPTED',
        description:`Campo con datos personales sin cifrado: "${line.trim().slice(0,70)}"`,
        severity:'CRÍTICA', law:'Ley 21.719', article:'Ley 21.719, Art. 18 — Medidas de seguridad (vigente dic. 2026)',
        file:filePath, lineNumber:i+1, codeSnippet:line.trim(),
        recommendation:'Cifrar con AES-256 en reposo. Usar Always Encrypted o pgcrypto.',
        estimatedFixHours:3, tags:['pii','encryption'] });
    }
  });

  // ── Ley 21.719: SQL Injection ──────────────────────────────────────────────
  const sqlRe = [/"SELECT.*"\s*\+/,/\$".*\{.*\}.*SELECT/i,/`.*\$\{.*\}.*SELECT/i,/String\.Format\(.*SELECT/i];
  lines.forEach((line,i) => {
    if (skip(line)) { return; }
    if (sqlRe.some(r=>r.test(line))) {
      findings.push({ id:crypto.randomUUID(), type:'SQL_INJECTION',
        description:`SQL Injection potencial: "${line.trim().slice(0,70)}"`,
        severity:'CRÍTICA', law:'Ley 21.719', article:'Ley 21.719, Art. 18 + Art. 20 — Seguridad y notificación de brechas (vigente dic. 2026)',
        file:filePath, lineNumber:i+1, codeSnippet:line.trim(),
        recommendation:'Usar parámetros (@param) o un ORM. Nunca concatenar inputs.',
        estimatedFixHours:2, tags:['sql-injection','security'] });
    }
  });

  // ── Ley 21.663: Credenciales hardcodeadas ─────────────────────────────────
  const credRe = [/password\s*=\s*["'][^"']{3,}["']/i,/secret\s*=\s*["'][^"']{6,}["']/i,
    /api.?key\s*=\s*["'][^"']{6,}["']/i,/connectionstring\s*=\s*["'][^"']{10,}["']/i];
  lines.forEach((line,i) => {
    if (skip(line)) { return; }
    if (credRe.some(r=>r.test(line))) {
      findings.push({ id:crypto.randomUUID(), type:'HARDCODED_CREDENTIAL',
        description:`Credencial hardcodeada en línea ${i+1}`,
        severity:'CRÍTICA', law:'Ley 21.663', article:'Ley 21.663, Art. 6 — Obligaciones de seguridad + NIST SC-07 + ISO 27001 A.9.4',
        file:filePath, lineNumber:i+1, codeSnippet:line.trim().replace(/["'][^"']{3,}["']/,'***'),
        recommendation:'Mover a variables de entorno o Azure Key Vault.',
        estimatedFixHours:1, tags:['secrets','credentials'] });
    }
  });

  // ── Ley 21.663: Endpoints sin autenticación ───────────────────────────────
  const epRe   = /\[Http(Get|Post|Put|Delete|Patch)|router\.(get|post|put|delete)\s*\(/i;
  const authRe = /\[Authorize|requireAuth|isAuthenticated|verifyToken|\.RequireAuthorization/i;

  // Detectar autenticación aplicada a nivel de clase (controller completamente protegido)
  const classLevelAuth = /\[Authorize[^\]]*\][\s\S]{0,400}class\s+\w+Controller/m.test(code);
  // Detectar filtros globales declarados en el mismo archivo (Program.cs / Startup.cs)
  const fileHasGlobalAuthFilter = /options\.Filters\.Add|Filters\.Add[<(][^)>]*[Aa]uthor[io]z|AuthorizationActionFilter/.test(code);
  // Saltar chequeo por endpoint si hay auth global (clase o filtro global en archivo) o si se pasa desde workspace scan
  const skipEndpointAuthCheck = classLevelAuth || fileHasGlobalAuthFilter || (opts?.globalAuthFilter === true);

  lines.forEach((line,i) => {
    if (!epRe.test(line)) { return; }
    if (skipEndpointAuthCheck) { return; }
    const ctx = lines.slice(Math.max(0,i-5), i+2).join('\n');
    if (!authRe.test(ctx)) {
      findings.push({ id:crypto.randomUUID(), type:'ENDPOINT_NO_AUTH',
        description:`Endpoint sin autenticación: "${line.trim()}"`,
        severity:'ALTA', law:'Ley 21.663', article:'Ley 21.663, Art. 6 — Obligaciones de seguridad + NIST AC-02 + ISO 27001 A.9.4.2',
        file:filePath, lineNumber:i+1, codeSnippet:line.trim(),
        recommendation:'Agregar [Authorize] o middleware de autenticación JWT.',
        estimatedFixHours:2, tags:['authentication','access-control'] });
    }
  });

  // ── Ley 21.663: Conexión BD sin TLS ──────────────────────────────────────
  const insecRe = [/Encrypt\s*=\s*false/i,/TrustServerCertificate\s*=\s*true/i,/sslmode\s*=\s*disable/i];
  lines.forEach((line,i) => {
    if (insecRe.some(r=>r.test(line))) {
      findings.push({ id:crypto.randomUUID(), type:'INSECURE_DB_CONNECTION',
        description:`Conexión a BD sin TLS/SSL: "${line.trim()}"`,
        severity:'CRÍTICA', law:'Ley 21.663', article:'Ley 21.663, Art. 6 — Protección en tránsito + NIST SC-08 + ISO 27001 A.13.2',
        file:filePath, lineNumber:i+1, codeSnippet:line.trim(),
        recommendation:'Activar Encrypt=true y TrustServerCertificate=false.',
        estimatedFixHours:1, tags:['tls','ssl','database'] });
    }
  });

  // ── Ley 21.719: PII en logs ───────────────────────────────────────────────
  const logFnRe = /console\.(log|error)|logger\.(info|error)|\._logger\.Log/i;
  const piiValRe = /\b(email|password|rut|phone|credit)\b/i;
  lines.forEach((line,i) => {
    if (logFnRe.test(line) && piiValRe.test(line)) {
      findings.push({ id:crypto.randomUUID(), type:'PII_IN_LOGS',
        description:`Datos personales en logs: "${line.trim().slice(0,70)}"`,
        severity:'ALTA', law:'Ley 21.719', article:'Ley 21.719, Art. 18 + Art. 3 — Seguridad y principio de minimización (vigente dic. 2026)',
        file:filePath, lineNumber:i+1, codeSnippet:line.trim(),
        recommendation:'Loggear solo IDs, nunca datos personales directamente.',
        estimatedFixHours:1, tags:['logging','pii-leak'] });
    }
  });

  const crit = findings.filter(f=>f.severity==='CRÍTICA').length;
  const high = findings.filter(f=>f.severity==='ALTA').length;
  const st: Status = crit>0 ? 'FAIL' : high>0 ? 'WARN' : 'PASS';
  const score = Math.max(0, 100 - crit*25 - high*10);

  return {
    projectName: filePath, analyzedAt: new Date().toISOString(),
    totalExecutionMs: Date.now()-t0, filesAnalyzed: [filePath],
    overallStatus: st, overallScore: score,
    totalFindings: findings.length, criticalFindings: crit, highFindings: high,
    blockMerge: crit>0,
    recommendations: [...new Map(findings.map(f=>[f.type,f.recommendation])).values()].slice(0,5),
    agentReports: [
      { agentName:'DPA Agent (Ley 21.719)', law:'Ley 21.719', findings:findings.filter(f=>f.law==='Ley 21.719') },
      { agentName:'CSA Agent (Ley 21.663)', law:'Ley 21.663', findings:findings.filter(f=>f.law==='Ley 21.663') },
    ],
  };
}

// ─── Diagnósticos en tiempo real ─────────────────────────────────────────────
const diagnosticCollection = vscode.languages.createDiagnosticCollection('syntaxis');

function refreshDiagnostics(document: vscode.TextDocument): void {
  const supported = ['csharp','javascript','typescript','sql'];
  if (!supported.includes(document.languageId)) { diagnosticCollection.delete(document.uri); return; }

  const report = analyzeCode(document.getText(), document.fileName);
  const diags: vscode.Diagnostic[] = [];

  for (const ar of report.agentReports) {
    for (const f of ar.findings) {
      if (!f.lineNumber) { continue; }
      const lineIdx = Math.min(f.lineNumber-1, document.lineCount-1);
      const line = document.lineAt(lineIdx);
      const range = new vscode.Range(lineIdx, line.firstNonWhitespaceCharacterIndex, lineIdx, line.text.length);
      const d = new vscode.Diagnostic(range,
        `[${f.severity}] ${f.description}\n💡 ${f.recommendation}`,
        (f.severity==='CRÍTICA'||f.severity==='ALTA') ? vscode.DiagnosticSeverity.Error
          : f.severity==='MEDIA' ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Information);
      d.source = `Syntaxis (${f.law})`; d.code = f.article ?? f.type;
      diags.push(d);
    }
  }
  diagnosticCollection.set(document.uri, diags);
}

// ─── Activación ───────────────────────────────────────────────────────────────
export function activate(context: vscode.ExtensionContext): void {
  getOutput().appendLine('🔍 Syntaxis Compliance Checker v0.2.0 — Ley 21.719 + Ley 21.663');

  // Debounce diagnósticos (800ms)
  let timer: NodeJS.Timeout | undefined;
  const debouncedRefresh = (doc: vscode.TextDocument) => {
    if (timer) { clearTimeout(timer); }
    timer = setTimeout(() => refreshDiagnostics(doc), 800);
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(e => e && debouncedRefresh(e.document)),
    vscode.workspace.onDidChangeTextDocument(e => debouncedRefresh(e.document)),
    vscode.workspace.onDidOpenTextDocument(debouncedRefresh),
    diagnosticCollection,
  );

  if (vscode.window.activeTextEditor) { refreshDiagnostics(vscode.window.activeTextEditor.document); }

  // Comando: Revisar archivo actual
  context.subscriptions.push(
    vscode.commands.registerCommand('syntaxis.checkFile', async () => {
      const ed = vscode.window.activeTextEditor;
      if (!ed) { vscode.window.showWarningMessage('Syntaxis: Abre un archivo primero.'); return; }
      await vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title:'Syntaxis: Analizando...' }, async () => {
        const report = analyzeCode(ed.document.getText(), ed.document.fileName);
        refreshDiagnostics(ed.document);
        printReport(report);
        notify(report);
      });
    })
  );

  // Comando: Revisar workspace
  context.subscriptions.push(
    vscode.commands.registerCommand('syntaxis.checkWorkspace', async () => {
      const files = await vscode.workspace.findFiles('**/*.{cs,ts,js,sql}', '{**/node_modules/**,**/obj/**,**/bin/**,**/dist/**}');
      if (!files.length) { vscode.window.showInformationMessage('Syntaxis: No hay archivos para analizar.'); return; }
      await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification,
        title:`Syntaxis: Analizando ${files.length} archivos...`, cancellable:true }, async (progress, token) => {
        // Pre-pass: detectar filtro global de autenticación en Program.cs / Startup.cs
        let globalAuthFilter = false;
        for (const f of files) {
          const bn = path.basename(f.fsPath).toLowerCase();
          if (bn === 'program.cs' || bn === 'startup.cs') {
            try {
              const doc = await vscode.workspace.openTextDocument(f);
              if (/options\.Filters\.Add|Filters\.Add[<(][^)>]*[Aa]uthor[io]z|AuthorizationActionFilter/.test(doc.getText())) {
                globalAuthFilter = true; break;
              }
            } catch { /* skip */ }
          }
        }
        let crit=0, hi=0;
        for (let i=0; i<files.length; i++) {
          if (token.isCancellationRequested) { break; }
          progress.report({ increment:100/files.length, message:path.basename(files[i].fsPath) });
          const doc = await vscode.workspace.openTextDocument(files[i]);
          const r = analyzeCode(doc.getText(), files[i].fsPath, { globalAuthFilter });
          refreshDiagnostics(doc); crit+=r.criticalFindings; hi+=r.highFindings;
        }
        const icon = crit>0?'❌':hi>0?'⚠️':'✅';
        vscode.window.showInformationMessage(`${icon} ${files.length} archivos: ${crit} CRÍTICA, ${hi} ALTA`);
      });
    })
  );

  // Comando: Generar reporte (JSON + HTML + Markdown)
  context.subscriptions.push(
    vscode.commands.registerCommand('syntaxis.generateReport', async () => {
      // 1. ¿Scope: archivo actual o workspace completo?
      const choice = await vscode.window.showQuickPick(
        ['📄 Archivo actual', '📂 Workspace completo'],
        { placeHolder: '¿Qué deseas analizar?' }
      );
      if (!choice) { return; }

      const format = await vscode.window.showQuickPick(
        ['JSON', 'HTML', 'Markdown', 'Todos (JSON + HTML + MD)'],
        { placeHolder: '¿Formato del reporte?' }
      );
      if (!format) { return; }

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      const activeEditorFolder = vscode.window.activeTextEditor
        ? path.dirname(vscode.window.activeTextEditor.document.fileName)
        : '.';
      const folder = workspaceFolder ?? activeEditorFolder;
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const reportsDir = path.join(folder, 'compliance-reports');
      if (!fs.existsSync(reportsDir)) { fs.mkdirSync(reportsDir, { recursive: true }); }

      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Syntaxis: Generando reporte...', cancellable: false },
        async (progress) => {
          let consolidatedReport: Report | undefined;

          // ── Recopilar datos ────────────────────────────────────────────────
          if (choice === '📄 Archivo actual') {
            const ed = vscode.window.activeTextEditor;
            if (!ed) { vscode.window.showWarningMessage('Syntaxis: Abre un archivo primero.'); return; }
            consolidatedReport = analyzeCode(ed.document.getText(), ed.document.fileName);
          } else {
            // Workspace: analizar todos los archivos
            progress.report({ message: 'Buscando archivos...' });
            const files = await vscode.workspace.findFiles(
              '**/*.{cs,ts,js,sql}',
              '{**/node_modules/**,**/obj/**,**/bin/**,**/dist/**,**/out/**}'
            );
            if (!files.length) { vscode.window.showInformationMessage('Syntaxis: No hay archivos para analizar.'); return; }

            // Pre-pass: detectar filtro global de autenticación en Program.cs / Startup.cs
            let globalAuthFilter = false;
            progress.report({ message: 'Detectando configuración de seguridad global...' });
            for (const f of files) {
              const bn = path.basename(f.fsPath).toLowerCase();
              if (bn === 'program.cs' || bn === 'startup.cs') {
                try {
                  const doc = await vscode.workspace.openTextDocument(f);
                  if (/options\.Filters\.Add|Filters\.Add[<(][^)>]*[Aa]uthor[io]z|AuthorizationActionFilter/.test(doc.getText())) {
                    globalAuthFilter = true; break;
                  }
                } catch { /* skip */ }
              }
            }

            let totalCrit = 0, totalHigh = 0, totalFinds = 0;
            const allAgentReports: Report['agentReports'] = [];
            const allFiles: string[] = [];

            for (let i = 0; i < files.length; i++) {
              progress.report({ message: `${i + 1}/${files.length}: ${path.basename(files[i].fsPath)}` });
              try {
                const doc = await vscode.workspace.openTextDocument(files[i]);
                const r = analyzeCode(doc.getText(), files[i].fsPath, { globalAuthFilter });
                totalCrit  += r.criticalFindings;
                totalHigh  += r.highFindings;
                totalFinds += r.totalFindings;
                allFiles.push(files[i].fsPath);
                // Merge agent findings
                r.agentReports.forEach((ar, idx) => {
                  if (!allAgentReports[idx]) {
                    allAgentReports.push({ ...ar });
                  } else {
                    allAgentReports[idx].findings.push(...ar.findings);
                  }
                });
              } catch { /* skip unreadable files */ }
            }

            const ws: Status = totalCrit > 0 ? 'FAIL' : totalHigh > 0 ? 'WARN' : 'PASS';
            consolidatedReport = {
              projectName: folder,
              analyzedAt: new Date().toISOString(),
              totalExecutionMs: 0,
              filesAnalyzed: allFiles,
              overallStatus: ws,
              overallScore: Math.max(0, 100 - totalCrit * 25 - totalHigh * 10),
              totalFindings: totalFinds,
              criticalFindings: totalCrit,
              highFindings: totalHigh,
              blockMerge: totalCrit > 0,
              recommendations: [],
              agentReports: allAgentReports,
            };
          }

          if (!consolidatedReport) { return; }
          const allFindings = consolidatedReport.agentReports.flatMap(a => a.findings);
          const savedPaths: string[] = [];

          // ── Escribir archivos según formato ───────────────────────────────
          const writeJSON = format === 'JSON' || format.includes('Todos');
          const writeHTML = format === 'HTML' || format.includes('Todos');
          const writeMD   = format === 'Markdown' || format.includes('Todos');

          if (writeJSON) {
            const p = path.join(reportsDir, `compliance-${ts}.json`);
            fs.writeFileSync(p, JSON.stringify(consolidatedReport, null, 2), 'utf8');
            savedPaths.push(p);
          }

          if (writeHTML) {
            const p = path.join(reportsDir, `compliance-${ts}.html`);
            fs.writeFileSync(p, buildHtmlReport(consolidatedReport, allFindings), 'utf8');
            savedPaths.push(p);
          }

          if (writeMD) {
            const p = path.join(reportsDir, `compliance-${ts}.md`);
            fs.writeFileSync(p, buildMarkdownReport(consolidatedReport, allFindings), 'utf8');
            savedPaths.push(p);
          }

          // ── Notificar y ofrecer abrir ──────────────────────────────────────
          const fileNames = savedPaths.map(p => path.basename(p)).join(', ');
          const action = await vscode.window.showInformationMessage(
            `📊 Reporte${savedPaths.length > 1 ? 's' : ''} generado${savedPaths.length > 1 ? 's' : ''}: ${fileNames}`,
            'Abrir HTML', 'Abrir JSON', 'Abrir carpeta'
          );
          if (action === 'Abrir HTML') {
            const htmlPath = savedPaths.find(p => p.endsWith('.html'));
            if (htmlPath) { vscode.env.openExternal(vscode.Uri.file(htmlPath)); }
          } else if (action === 'Abrir JSON') {
            const jsonPath = savedPaths.find(p => p.endsWith('.json'));
            if (jsonPath) { vscode.window.showTextDocument(await vscode.workspace.openTextDocument(jsonPath)); }
          } else if (action === 'Abrir carpeta') {
            vscode.env.openExternal(vscode.Uri.file(reportsDir));
          }
        }
      );
    })
  );

  vscode.window.setStatusBarMessage('$(shield) Syntaxis Compliance activo', 5000);
}

export function deactivate(): void {
  diagnosticCollection.dispose();
  outputChannel?.dispose();
  outputChannel = undefined;
}

// ─── Helpers de presentación ──────────────────────────────────────────────────
function printReport(report: Report): void {
  const out = getOutput(); out.clear();
  out.appendLine('═══════════════════════════════════════════════════');
  out.appendLine(`  SYNTAXIS COMPLIANCE — ${report.analyzedAt}`);
  out.appendLine('═══════════════════════════════════════════════════');
  out.appendLine(`  Archivo : ${path.basename(report.projectName)}`);
  out.appendLine(`  Estado  : ${report.overallStatus}   Score: ${report.overallScore}/100`);
  out.appendLine(`  CRÍTICA : ${report.criticalFindings}   ALTA: ${report.highFindings}   Total: ${report.totalFindings}`);
  out.appendLine('───────────────────────────────────────────────────');
  for (const ar of report.agentReports) {
    if (!ar.findings.length) { continue; }
    out.appendLine(`\n  ▶ ${ar.agentName}`);
    for (const f of ar.findings) {
      const ico = f.severity==='CRÍTICA'?'🔴':f.severity==='ALTA'?'🟠':f.severity==='MEDIA'?'🟡':'🔵';
      out.appendLine(`  ${ico} [${f.severity}] L${f.lineNumber??'?'} — ${f.description}`);
      out.appendLine(`       📋 ${f.article??f.type}`);
      out.appendLine(`       💡 ${f.recommendation}`);
    }
  }
  if (!report.totalFindings) { out.appendLine('\n  ✅ Sin problemas detectados.'); }
  out.appendLine('\n═══════════════════════════════════════════════════');
  out.show(true);
}

function notify(r: Report): void {
  const msg = r.overallStatus==='FAIL'
    ? `❌ ${r.criticalFindings} problema(s) CRÍTICO(S) — Ver Output para detalles`
    : r.overallStatus==='WARN'
    ? `⚠️ ${r.highFindings} problema(s) de ALTA severidad — Ver Output para detalles`
    : `✅ Sin problemas críticos. Score: ${r.overallScore}/100`;
  if (r.overallStatus==='FAIL') { vscode.window.showErrorMessage(msg); }
  else if (r.overallStatus==='WARN') { vscode.window.showWarningMessage(msg); }
  else { vscode.window.showInformationMessage(msg); }
}

export function buildMarkdownReport(report: Report, allFindings: Finding[]): string {
  const statusLine = report.overallStatus==='FAIL' ? '## ❌ Estado: MERGE BLOQUEADO'
    : report.overallStatus==='WARN' ? '## ⚠️ Estado: REQUIERE REVISIÓN' : '## ✅ Estado: APROBADO';
  const totalHours = allFindings.reduce((s,f)=>s+(f.estimatedFixHours??0),0);
  const icons: Record<Severity,'🔴'|'🟠'|'🟡'|'🔵'> = { 'CRÍTICA':'🔴','ALTA':'🟠','MEDIA':'🟡','BAJA':'🔵' };

  const rows = allFindings.map(f => {
    const loc = f.lineNumber ? `\`${f.file?.split(/[\\/]/).pop()??'?'}:${f.lineNumber}\`` : '—';
    const desc = f.description.replace(/\|/g,'\\|').slice(0,80);
    const rec  = f.recommendation.replace(/\|/g,'\\|').slice(0,70);
    return `| ${icons[f.severity]} ${f.severity} | ${loc} | ${desc} | ${f.article??f.type} | ${rec} |`;
  }).join('\n');

  return `# 🔍 Syntaxis Compliance Report\n\n${statusLine}\n\n` +
    `**Proyecto:** \`${report.projectName}\`  **Analizado:** ${report.analyzedAt}\n\n---\n\n` +
    `| Métrica | Valor |\n|---|---|\n` +
    `| Score | ${report.overallScore}/100 |\n` +
    `| 🔴 CRÍTICA | ${report.criticalFindings} |\n` +
    `| 🟠 ALTA | ${report.highFindings} |\n` +
    `| Total | ${report.totalFindings} |\n` +
    `| Horas fix | ~${totalHours}h |\n\n` +
    `## 📊 Hallazgos\n\n` +
    (allFindings.length
      ? `| Severidad | Ubicación | Descripción | Artículo | Recomendación |\n|---|---|---|---|---|\n${rows}\n`
      : `✅ Sin hallazgos.\n`) +
    `\n---\n> **Ley 21.719** (Protección de Datos Personales — vigente diciembre 2026) · **Ley 21.663** (Marco de Ciberseguridad) · Syntaxis Compliance Checker\n`;
}

// ─── Exportar generateHtml inline (no requiere importar src/) ────────────────
// Esta función es una versión simplificada del generador HTML completo
// La versión completa vive en src/report-generators/html-report.ts
export function buildHtmlReport(report: Report, allFindings: Finding[]): string {
  const statusColor = report.overallStatus==='FAIL'?'#dc2626':report.overallStatus==='WARN'?'#ea580c':'#16a34a';
  const statusLabel = report.overallStatus==='FAIL'?'❌ MERGE BLOQUEADO':report.overallStatus==='WARN'?'⚠️ REQUIERE REVISIÓN':'✅ APROBADO';
  const totalHours  = allFindings.reduce((s,f)=>s+(f.estimatedFixHours??0),0);
  const esc = (s:string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const rows = allFindings.map(f => {
    const icon = f.severity==='CRÍTICA'?'🔴':f.severity==='ALTA'?'🟠':f.severity==='MEDIA'?'🟡':'🔵';
    const bg   = f.severity==='CRÍTICA'?'#fef2f2':f.severity==='ALTA'?'#fff7ed':f.severity==='MEDIA'?'#fefce8':'#eff6ff';
    const col  = f.severity==='CRÍTICA'?'#dc2626':f.severity==='ALTA'?'#ea580c':f.severity==='MEDIA'?'#ca8a04':'#2563eb';
    const loc  = f.lineNumber ? `${f.file?.split(/[\\/]/).pop()??'?'}:${f.lineNumber}` : '—';
    return `<tr style="background:${bg}">
      <td style="text-align:center">${icon}</td>
      <td><b style="color:${col}">${f.severity}</b></td>
      <td><code>${esc(loc)}</code></td>
      <td>${esc(f.description.substring(0,90))}</td>
      <td style="color:#64748b;font-size:.82em">${esc(f.law)}<br><em>${esc(f.article??f.type)}</em></td>
      <td style="font-size:.82em">${esc(f.recommendation.substring(0,80))}</td>
      <td style="text-align:center">${f.estimatedFixHours??'—'}h</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Syntaxis Compliance Report</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#f8fafc;color:#1e293b;padding:2rem}
h1{font-size:1.6rem;font-weight:800}h2{margin:1.4rem 0 .7rem;font-size:1.1rem;color:#475569}
.badge{display:inline-block;padding:.3rem .9rem;border-radius:999px;color:#fff;font-weight:700;font-size:.9rem;background:${statusColor}}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:1rem;margin:1.2rem 0 2rem}
.card{background:#fff;border-radius:10px;padding:1rem;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.07)}
.card .v{font-size:2rem;font-weight:800}.card .l{font-size:.8rem;color:#64748b}
table{width:100%;border-collapse:collapse;font-size:.84rem}
th{background:#f1f5f9;padding:.5rem .6rem;text-align:left;font-weight:600;color:#475569}
td{padding:.45rem .6rem;border-top:1px solid #f1f5f9;vertical-align:top}
footer{text-align:center;color:#94a3b8;font-size:.8rem;margin-top:2rem}
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem">
  <div><h1>🔍 Syntaxis Compliance Report</h1>
  <p style="color:#64748b;margin-top:.3rem">${esc(report.projectName)} · ${report.analyzedAt}</p></div>
  <span class="badge">${statusLabel}</span>
</div>
<div class="cards">
  <div class="card"><div class="v">${report.overallScore}</div><div class="l">Score /100</div></div>
  <div class="card"><div class="v" style="color:#dc2626">${report.criticalFindings}</div><div class="l">CRÍTICA</div></div>
  <div class="card"><div class="v" style="color:#ea580c">${report.highFindings}</div><div class="l">ALTA</div></div>
  <div class="card"><div class="v">${report.totalFindings}</div><div class="l">Total</div></div>
  <div class="card"><div class="v">${totalHours}</div><div class="l">Horas fix</div></div>
</div>
<h2>📊 Hallazgos detallados</h2>
<table><thead><tr>
  <th></th><th>Severidad</th><th>Ubicación</th><th>Descripción</th><th>Ley / Art.</th><th>Recomendación</th><th>Fix</th>
</tr></thead><tbody>${rows||`<tr><td colspan="7" style="text-align:center;padding:2rem;color:#16a34a">✅ Sin problemas detectados</td></tr>`}</tbody></table>
<footer>Syntaxis Compliance Checker · Ley 21.719 (vigente dic. 2026) + Ley 21.663 · ${report.analyzedAt}</footer>
</body></html>`;
}
