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
function analyzeCode(code: string, filePath: string): Report {
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
        severity:'CRÍTICA', law:'Ley 21.719', article:'Art. 18 (Medidas de seguridad)',
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
        severity:'CRÍTICA', law:'Ley 21.719', article:'Art. 18 + Art. 20',
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
        severity:'CRÍTICA', law:'Ley 21.663', article:'NIST SC-07 + ISO 27001 A.9.4',
        file:filePath, lineNumber:i+1, codeSnippet:line.trim().replace(/["'][^"']{3,}["']/,'***'),
        recommendation:'Mover a variables de entorno o Azure Key Vault.',
        estimatedFixHours:1, tags:['secrets','credentials'] });
    }
  });

  // ── Ley 21.663: Endpoints sin autenticación ───────────────────────────────
  const epRe   = /\[Http(Get|Post|Put|Delete|Patch)|router\.(get|post|put|delete)\s*\(/i;
  const authRe = /\[Authorize|requireAuth|isAuthenticated|verifyToken|\.RequireAuthorization/i;
  lines.forEach((line,i) => {
    if (!epRe.test(line)) { return; }
    const ctx = lines.slice(Math.max(0,i-5), i+2).join('\n');
    if (!authRe.test(ctx)) {
      findings.push({ id:crypto.randomUUID(), type:'ENDPOINT_NO_AUTH',
        description:`Endpoint sin autenticación: "${line.trim()}"`,
        severity:'ALTA', law:'Ley 21.663', article:'NIST AC-02 + ISO 27001 A.9.4.2',
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
        severity:'CRÍTICA', law:'Ley 21.663', article:'NIST SC-08 + ISO 27001 A.13.2',
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
        severity:'ALTA', law:'Ley 21.719', article:'Art. 18 + principio de minimización',
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
        let crit=0, hi=0;
        for (let i=0; i<files.length; i++) {
          if (token.isCancellationRequested) { break; }
          progress.report({ increment:100/files.length, message:path.basename(files[i].fsPath) });
          const doc = await vscode.workspace.openTextDocument(files[i]);
          const r = analyzeCode(doc.getText(), files[i].fsPath);
          refreshDiagnostics(doc); crit+=r.criticalFindings; hi+=r.highFindings;
        }
        const icon = crit>0?'❌':hi>0?'⚠️':'✅';
        vscode.window.showInformationMessage(`${icon} ${files.length} archivos: ${crit} CRÍTICA, ${hi} ALTA`);
      });
    })
  );

  // Comando: Generar reporte JSON
  context.subscriptions.push(
    vscode.commands.registerCommand('syntaxis.generateReport', async () => {
      const ed = vscode.window.activeTextEditor;
      if (!ed) { vscode.window.showWarningMessage('Syntaxis: Abre un archivo primero.'); return; }
      const report = analyzeCode(ed.document.getText(), ed.document.fileName);
      const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? path.dirname(ed.document.fileName);
      const ts = new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
      const p = path.join(folder, `compliance-report-${ts}.json`);
      fs.writeFileSync(p, JSON.stringify(report,null,2), 'utf8');
      const action = await vscode.window.showInformationMessage(`📊 Reporte guardado: compliance-report-${ts}.json`, 'Abrir');
      if (action==='Abrir') { vscode.window.showTextDocument(await vscode.workspace.openTextDocument(p)); }
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
