// src/agents/csa-agent.ts
// Agente especializado en Ley 21.663 - Marco de Ciberseguridad

import { randomUUID } from 'crypto';
import { AnalysisInput, Finding } from '../types/index.js';
import { BaseAgent } from './base-agent.js';

export class CSAAgent extends BaseAgent {
  readonly name = 'CSA Agent (Ley 21.663)';
  readonly law = 'Ley 21.663' as const;

  async analyze(input: AnalysisInput): Promise<Finding[]> {
    const findings: Finding[] = [];
    const { code, filePath, globalContext } = input;
    const lines = code.split('\n');

    // ─── Regla 1: Credenciales hardcodeadas ──────────────────────────────────
    const credentialPatterns = [
      { re: /password\s*=\s*["'][^"']{3,}["']/i, desc: 'Contraseña hardcodeada' },
      { re: /secret\s*=\s*["'][^"']{6,}["']/i, desc: 'Secret hardcodeado' },
      { re: /api.?key\s*=\s*["'][^"']{6,}["']/i, desc: 'API Key hardcodeada' },
      { re: /connectionstring\s*=\s*["'][^"']{10,}["']/i, desc: 'Connection string hardcodeado' },
      { re: /token\s*=\s*["'][^"']{8,}["']/i, desc: 'Token hardcodeado' },
      { re: /Server\s*=.*Password\s*=/i, desc: 'Credencial de BD en código' },
    ];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
      for (const { re, desc } of credentialPatterns) {
        if (re.test(line)) {
          findings.push({
            id: randomUUID(),
            type: 'HARDCODED_CREDENTIAL',
            description: `${desc} en línea ${idx + 1}: "${trimmed.substring(0, 60)}..."`,
            severity: 'CRÍTICA',
            law: 'Ley 21.663',
            article: 'Ley 21.663, Art. 6 — Gestión de secretos + NIST SC-07 + ISO 27001 A.9.4',
            file: filePath,
            lineNumber: idx + 1,
            codeSnippet: trimmed.replace(/["'][^"']{3,}["']/, '"***REDACTED***"'),
            recommendation:
              'Mover a variables de entorno (.env) o Azure Key Vault / AWS Secrets Manager. Nunca en código fuente.',
            estimatedFixHours: 1,
            tags: ['secrets', 'credentials', 'hardcoded'],
          });
          break;
        }
      }
    });

    // ─── Regla 2: Ausencia de autenticación en endpoints ─────────────────────
    const endpointPatterns = [
      /\[HttpGet\(|HttpGet\s*\(/,
      /\[HttpPost\(|HttpPost\s*\(/,
      /\[HttpPut\(|HttpPut\s*\(/,
      /\[HttpDelete\(|HttpDelete\s*\(/,
      /router\.(get|post|put|delete|patch)\s*\(/i,
      /app\.(get|post|put|delete|patch)\s*\(/i,
    ];
    const authPatterns = [
      /\[Authorize/i,
      /requireAuth/i,
      /isAuthenticated/i,
      /verifyToken/i,
      /authMiddleware/i,
      /\.RequireAuthorization/i,
    ];

    // Detectar autenticación aplicada a nivel de clase (controller completo protegido)
    const classLevelAuth = /\[Authorize[^\]]*\][\s\S]{0,400}class\s+\w+Controller/m.test(code);
    // Detectar filtros globales en el mismo archivo (Program.cs / Startup.cs)
    const fileHasGlobalAuthFilter = /options\.Filters\.Add|Filters\.Add[<(][^)>]*[Aa]uthor[io]z|AuthorizationActionFilter/.test(code);
    const skipEndpointAuthCheck = classLevelAuth || fileHasGlobalAuthFilter || (globalContext?.hasGlobalAuthFilter === true);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isEndpoint = endpointPatterns.some(p => p.test(line));
      if (!isEndpoint) continue;

      if (skipEndpointAuthCheck) continue;

      // Buscar en 5 líneas anteriores algún decorador de autenticación
      const contextStart = Math.max(0, i - 5);
      const context = lines.slice(contextStart, i + 2).join('\n');
      const hasAuth = authPatterns.some(p => p.test(context));

      if (!hasAuth) {
        findings.push({
          id: randomUUID(),
          type: 'ENDPOINT_NO_AUTH',
          description: `Endpoint sin autenticación detectado: "${line.trim()}"`,
          severity: 'ALTA',
          law: 'Ley 21.663',
          article: 'Ley 21.663, Art. 6 — Obligaciones de seguridad + NIST AC-02 + ISO 27001 A.9.4.2',
          file: filePath,
          lineNumber: i + 1,
          codeSnippet: line.trim(),
          recommendation:
            'Agregar [Authorize] en C# o middleware de autenticación JWT. Ningún endpoint que maneje datos debe ser público.',
          estimatedFixHours: 2,
          tags: ['authentication', 'authorization', 'access-control'],
        });
      }
    }

    // ─── Regla 3: Algoritmos débiles de hashing ───────────────────────────────
    const weakHashPatterns = [
      { re: /MD5\.(Create|Hash|ComputeHash)/i, algo: 'MD5' },
      { re: /SHA1\.(Create|Hash|ComputeHash)/i, algo: 'SHA1' },
      { re: /new MD5CryptoServiceProvider/i, algo: 'MD5' },
      { re: /hashlib\.(md5|sha1)\(/i, algo: 'MD5/SHA1' },
      { re: /crypto\.createHash\(['"]md5['"]\)/i, algo: 'MD5' },
      { re: /crypto\.createHash\(['"]sha1['"]\)/i, algo: 'SHA1' },
    ];

    lines.forEach((line, idx) => {
      for (const { re, algo } of weakHashPatterns) {
        if (re.test(line)) {
          findings.push({
            id: randomUUID(),
            type: 'WEAK_HASH_ALGORITHM',
            description: `Algoritmo de hash débil (${algo}) detectado`,
            severity: 'ALTA',
            law: 'Ley 21.663',
            article: 'Ley 21.663, Art. 6 — Criptografía + NIST SC-13 + ISO 27001 A.10.1',
            file: filePath,
            lineNumber: idx + 1,
            codeSnippet: line.trim(),
            recommendation:
              'Reemplazar con SHA-256 (para integridad) o bcrypt/Argon2 (para passwords). MD5 y SHA1 están comprometidos.',
            estimatedFixHours: 2,
            tags: ['cryptography', 'weak-hash', 'security'],
          });
          break;
        }
      }
    });

    // ─── Regla 4: Conexión a BD sin TLS/SSL ──────────────────────────────────
    const insecureConnPatterns = [
      { re: /Encrypt\s*=\s*false/i, desc: 'Cifrado desactivado en SQL Server' },
      { re: /TrustServerCertificate\s*=\s*true/i, desc: 'Validación de certificado desactivada (SQL Server)' },
      { re: /sslmode\s*=\s*disable/i, desc: 'SSL desactivado en PostgreSQL' },
      { re: /ssl\s*:\s*false/i, desc: 'SSL desactivado en conexión de BD' },
    ];

    lines.forEach((line, idx) => {
      for (const { re, desc } of insecureConnPatterns) {
        if (re.test(line)) {
          findings.push({
            id: randomUUID(),
            type: 'INSECURE_DB_CONNECTION',
            description: `${desc} en la configuración de conexión`,
            severity: 'CRÍTICA',
            law: 'Ley 21.663',
            article: 'Ley 21.663, Art. 6 — Protección en tránsito + NIST SC-08 + ISO 27001 A.13.2',
            file: filePath,
            lineNumber: idx + 1,
            codeSnippet: line.trim(),
            recommendation:
              'Activar Encrypt=true y TrustServerCertificate=false. En PostgreSQL: sslmode=require.',
            estimatedFixHours: 1,
            tags: ['tls', 'ssl', 'database', 'encryption-in-transit'],
          });
          break;
        }
      }
    });

    // ─── Regla 5: CORS permisivo ───────────────────────────────────────────────
    const dangerousCorsPatterns = [
      { re: /AllowAnyOrigin\(\)/i, desc: 'CORS permite cualquier origen (*)' },
      { re: /origins:\s*\[['"]?\*['"]?\]/i, desc: 'CORS permite cualquier origen (*)' },
      { re: /Access-Control-Allow-Origin.*\*/i, desc: 'Header CORS con wildcard' },
    ];

    lines.forEach((line, idx) => {
      for (const { re, desc } of dangerousCorsPatterns) {
        if (re.test(line)) {
          findings.push({
            id: randomUUID(),
            type: 'CORS_WILDCARD',
            description: `Política CORS insegura: ${desc}`,
            severity: 'MEDIA',
            law: 'Ley 21.663',
            article: 'Ley 21.663, Art. 6 — Protección de límites + NIST SC-07 + OWASP Top 10 A5',
            file: filePath,
            lineNumber: idx + 1,
            codeSnippet: line.trim(),
            recommendation:
              'Definir orígenes específicos: WithOrigins("https://tudominio.cl"). Nunca usar wildcard en producción.',
            estimatedFixHours: 1,
            tags: ['cors', 'api-security', 'access-control'],
          });
          break;
        }
      }
    });

    // ─── Regla 6: Rate limiting ausente ──────────────────────────────────────
    const isApiFile = /Controller|Router|Routes|app\.use|router\./i.test(code);
    const hasRateLimit = /RateLimit|UseRateLimiting|throttle|rate.?limit/i.test(code);
    const hasLoginEndpoint = /login|signin|authenticate|token/i.test(code);

    if (isApiFile && hasLoginEndpoint && !hasRateLimit) {
      findings.push({
        id: randomUUID(),
        type: 'MISSING_RATE_LIMITING',
        description: 'Endpoint de autenticación sin rate limiting detectado (vulnerable a fuerza bruta)',
        severity: 'ALTA',
        law: 'Ley 21.663',
        article: 'Ley 21.663, Art. 6 — Monitoreo y control + NIST SI-04 + ISO 27001 A.12.6.1',
        file: filePath,
        recommendation:
          'Implementar rate limiting en endpoints de login: máx 5 intentos/min por IP. Usar AspNetCoreRateLimit o express-rate-limit.',
        estimatedFixHours: 3,
        tags: ['rate-limiting', 'brute-force', 'authentication'],
      });
    }

    return findings;
  }
}
