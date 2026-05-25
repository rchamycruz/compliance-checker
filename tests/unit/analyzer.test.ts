// tests/unit/analyzer.test.ts
// Tests unitarios para los agentes de análisis

import { DPAAgent } from '../../src/agents/dpa-agent.js';
import { CSAAgent } from '../../src/agents/csa-agent.js';
import { Orchestrator } from '../../src/orchestrator.js';
import { AnalysisInput } from '../../src/types/index.js';

const makeInput = (code: string, fileType: AnalysisInput['fileType'] = 'csharp'): AnalysisInput => ({
  code,
  filePath: `test.${fileType === 'csharp' ? 'cs' : fileType === 'typescript' ? 'ts' : 'js'}`,
  fileType,
});

describe('DPAAgent — Ley 21.719', () => {
  const agent = new DPAAgent();

  test('detecta PII sin cifrado', async () => {
    const input = makeInput('public string Email { get; set; }');
    const findings = await agent.analyze(input);
    expect(findings.some(f => f.type === 'PII_UNENCRYPTED')).toBe(true);
  });

  test('NO alerta cuando PII está cifrado', async () => {
    const input = makeInput('public string EmailEncrypted => AES.Encrypt(email);');
    const findings = await agent.analyze(input);
    expect(findings.filter(f => f.type === 'PII_UNENCRYPTED')).toHaveLength(0);
  });

  test('detecta SQL Injection', async () => {
    const input = makeInput('"SELECT * FROM users WHERE id = " + userId');
    const findings = await agent.analyze(input);
    expect(findings.some(f => f.type === 'SQL_INJECTION_PII_RISK')).toBe(true);
  });

  test('detecta PII en logs', async () => {
    const input = makeInput('console.log("User email:", user.email);', 'typescript');
    const findings = await agent.analyze(input);
    expect(findings.some(f => f.type === 'PII_IN_LOGS')).toBe(true);
  });

  test('no alerta en comentarios', async () => {
    const input = makeInput('// public string Email { get; set; }');
    const findings = await agent.analyze(input);
    expect(findings.filter(f => f.type === 'PII_UNENCRYPTED')).toHaveLength(0);
  });

  test('status FAIL cuando hay CRÍTICA', async () => {
    const input = makeInput('public string Email { get; set; }');
    const report = await agent.run(input);
    expect(report.status).toBe('FAIL');
    expect(report.criticalFindings).toBeGreaterThan(0);
  });

  test('status PASS en código limpio', async () => {
    const input = makeInput('public int CalcularTotal(int a, int b) => a + b;');
    const report = await agent.run(input);
    expect(report.status).toBe('PASS');
  });
});

describe('CSAAgent — Ley 21.663', () => {
  const agent = new CSAAgent();

  test('detecta credenciales hardcodeadas', async () => {
    const input = makeInput('string password = "Admin1234!";');
    const findings = await agent.analyze(input);
    expect(findings.some(f => f.type === 'HARDCODED_CREDENTIAL')).toBe(true);
    expect(findings[0].severity).toBe('CRÍTICA');
  });

  test('detecta conexión BD sin TLS', async () => {
    const input = makeInput('Server=srv;Encrypt=false;TrustServerCertificate=true');
    const findings = await agent.analyze(input);
    expect(findings.some(f => f.type === 'INSECURE_DB_CONNECTION')).toBe(true);
  });

  test('detecta endpoint sin autenticación', async () => {
    const input = makeInput('[HttpGet("/users")]\npublic IActionResult GetAll() {}');
    const findings = await agent.analyze(input);
    expect(findings.some(f => f.type === 'ENDPOINT_NO_AUTH')).toBe(true);
  });

  test('NO alerta endpoint con [Authorize]', async () => {
    const input = makeInput('[Authorize]\n[HttpGet("/users")]\npublic IActionResult GetAll() {}');
    const findings = await agent.analyze(input);
    expect(findings.filter(f => f.type === 'ENDPOINT_NO_AUTH')).toHaveLength(0);
  });

  test('detecta algoritmo MD5 débil', async () => {
    const input = makeInput('var hash = MD5.Create().ComputeHash(data);');
    const findings = await agent.analyze(input);
    expect(findings.some(f => f.type === 'WEAK_HASH_ALGORITHM')).toBe(true);
  });
});

describe('Orchestrator', () => {
  const orchestrator = new Orchestrator();

  test('bloquea merge con código crítico', async () => {
    const input = makeInput('string apiKey = "sk-1234567890";\npublic string Email { get; set; }');
    const report = await orchestrator.analyze(input);
    expect(report.blockMerge).toBe(true);
    expect(report.overallStatus).toBe('FAIL');
  });

  test('score 100 en código limpio', async () => {
    const input = makeInput('public class MathHelper { public int Add(int a, int b) => a + b; }');
    const report = await orchestrator.analyze(input);
    expect(report.overallScore).toBe(100);
    expect(report.blockMerge).toBe(false);
  });

  test('genera reporte con dos agentes', async () => {
    const input = makeInput('var x = 1;');
    const report = await orchestrator.analyze(input);
    expect(report.agentReports).toHaveLength(2);
    expect(report.agentReports.map(a => a.law)).toContain('Ley 21.719');
    expect(report.agentReports.map(a => a.law)).toContain('Ley 21.663');
  });
});
