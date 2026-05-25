// src/agents/dpa-agent.ts
// Agente especializado en Ley 21.719 - Protección de Datos Personales

import { randomUUID } from 'crypto';
import { AnalysisInput, Finding } from '../types/index.js';
import { BaseAgent } from './base-agent.js';

export class DPAAgent extends BaseAgent {
  readonly name = 'DPA Agent (Ley 21.719)';
  readonly law = 'Ley 21.719' as const;

  async analyze(input: AnalysisInput): Promise<Finding[]> {
    const findings: Finding[] = [];
    const { code, filePath, fileType } = input;
    const lines = code.split('\n');

    // ─── Regla 1: Datos PII sin cifrado en propiedades/campos ────────────────
    const piiFields = [
      /\b(email|correo|mail)\b/i,
      /\b(phone|telefono|celular|mobile)\b/i,
      /\b(rut|dni|ssn|passport|pasaporte)\b/i,
      /\b(password|contrasena|clave)\b/i,
      /\b(creditcard|credit_card|tarjeta)\b/i,
      /\b(healthdata|salud|diagnosis|diagnostico)\b/i,
    ];

    const encryptionIndicators = [
      /encrypt/i, /Encrypt/i, /cifra/i, /hash/i, /Hash/i,
      /bcrypt/i, /AES/i, /RSA/i, /\.Encrypt\(/i,
    ];

    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      const isPII = piiFields.some(p => p.test(line));
      const isEncrypted = encryptionIndicators.some(e => e.test(line));
      const isComment = line.trim().startsWith('//') || line.trim().startsWith('*');
      const isPropertyDecl = /\b(string|varchar|nvarchar|TEXT)\b/i.test(line);

      if (isPII && !isEncrypted && !isComment && isPropertyDecl) {
        const piiMatch = piiFields.find(p => p.test(line));
        findings.push({
          id: randomUUID(),
          type: 'PII_UNENCRYPTED',
          description: `Campo con datos personales sin cifrado detectado: "${line.trim()}"`,
          severity: 'CRÍTICA',
          law: 'Ley 21.719',
          article: 'Ley 21.719, Art. 18 — Medidas de seguridad (vigente dic. 2026)',
          file: filePath,
          lineNumber: lineNo,
          codeSnippet: line.trim(),
          recommendation:
            'Cifrar el campo con AES-256 en reposo. Usar Always Encrypted (SQL Server) o pgcrypto (PostgreSQL).',
          estimatedFixHours: 3,
          tags: ['encryption', 'pii', 'data-at-rest'],
        });
      }
    });

    // ─── Regla 2: SQL Injection (exposición de datos personales) ─────────────
    const sqlInjectionPatterns = [
      { re: /["'`]\s*\+\s*(query|sql|where|filter|search)/i, desc: 'Concatenación directa en query SQL' },
      { re: /\$".*\{.*\}.*SELECT/i, desc: 'Interpolación en query SQL (C# string interpolation)' },
      { re: /`.*\$\{.*\}.*SELECT/i, desc: 'Interpolación en query SQL (template literal)' },
      { re: /String\.Format\(.*SELECT/i, desc: 'String.Format en query SQL' },
      { re: /"SELECT.*"\s*\+/, desc: 'Concatenación de string en SELECT' },
    ];

    lines.forEach((line, idx) => {
      for (const { re, desc } of sqlInjectionPatterns) {
        if (re.test(line) && !line.trim().startsWith('//')) {
          findings.push({
            id: randomUUID(),
            type: 'SQL_INJECTION_PII_RISK',
            description: `SQL Injection potencial que puede exponer datos personales: ${desc}`,
            severity: 'CRÍTICA',
            law: 'Ley 21.719',
            article: 'Ley 21.719, Art. 18 + Art. 20 — Seguridad y notificación de brechas (vigente dic. 2026)',
            file: filePath,
            lineNumber: idx + 1,
            codeSnippet: line.trim(),
            recommendation:
              'Usar parámetros (@param) o un ORM (Entity Framework, Dapper). Nunca concatenar inputs en queries.',
            estimatedFixHours: 2,
            tags: ['sql-injection', 'security', 'pii'],
          });
          break;
        }
      }
    });

    // ─── Regla 3: Consentimiento no documentado ───────────────────────────────
    if (fileType === 'csharp' || fileType === 'typescript' || fileType === 'javascript') {
      const createsUser = /\b(CreateUser|RegisterUser|AddUser|InsertUser|new User|NewUser)\b/i.test(code);
      const hasConsent = /\b(consent|consentimiento|acepto|acepta|optin|opt_in|terminos|terms)\b/i.test(code);

      if (createsUser && !hasConsent) {
        findings.push({
          id: randomUUID(),
          type: 'MISSING_CONSENT',
          description: 'Se detecta creación de usuario sin registro de consentimiento explícito',
          severity: 'ALTA',
          law: 'Ley 21.719',
          article: 'Ley 21.719, Art. 4 — Consentimiento + Art. 10 — Datos de menores (vigente dic. 2026)',
          file: filePath,
          recommendation:
            'Registrar la fecha, versión de política y medio por el que se obtuvo el consentimiento. Campo: consent_date, consent_version.',
          estimatedFixHours: 4,
          tags: ['consent', 'gdpr-like', 'arco-p'],
        });
      }
    }

    // ─── Regla 4: Ausencia de derechos ARCO+P ────────────────────────────────
    if (fileType === 'csharp' || fileType === 'typescript') {
      const isController = /Controller|Router|Routes/i.test(code);
      if (isController) {
        const hasDelete = /\[HttpDelete\]|\.delete\(|router\.delete/i.test(code);
        const hasExport = /export|portabilidad|download.*data|export.*csv|export.*json/i.test(code);
        const hasOptOut = /opt.?out|oposicion|bloqueo|block.*user/i.test(code);

        if (!hasDelete) {
          findings.push({
            id: randomUUID(),
            type: 'MISSING_ARCO_SUPPRESSION',
            description: 'Controlador detectado sin endpoint de supresión (DELETE) de datos personales',
            severity: 'ALTA',
            law: 'Ley 21.719',
            article: 'Ley 21.719, Art. 7 — Derecho de Supresión/Cancelación (vigente dic. 2026)',
            file: filePath,
            recommendation:
              'Implementar DELETE /api/users/me que elimine datos de BD principal, respaldos y notifique a terceros.',
            estimatedFixHours: 8,
            tags: ['arco-p', 'suppression', 'right-to-erasure'],
          });
        }

        if (!hasExport) {
          findings.push({
            id: randomUUID(),
            type: 'MISSING_ARCO_PORTABILITY',
            description: 'No se detecta endpoint de portabilidad de datos (exportar en JSON/CSV)',
            severity: 'ALTA',
            law: 'Ley 21.719',
            article: 'Ley 21.719, Art. 9 — Derecho de Portabilidad (vigente dic. 2026)',
            file: filePath,
            recommendation:
              'Implementar GET /api/users/me/export?format=json|csv con todos los datos personales en formato legible por máquina.',
            estimatedFixHours: 6,
            tags: ['arco-p', 'portability', 'data-export'],
          });
        }

        if (!hasOptOut) {
          findings.push({
            id: randomUUID(),
            type: 'MISSING_ARCO_OPPOSITION',
            description: 'No se detecta mecanismo de oposición al tratamiento de datos',
            severity: 'MEDIA',
            law: 'Ley 21.719',
            article: 'Ley 21.719, Art. 8 + Art. 8ter — Derecho de Oposición y Bloqueo (vigente dic. 2026)',
            file: filePath,
            recommendation:
              'Agregar campo blocked_at en la tabla de usuarios y lógica para suspender tratamiento de datos.',
            estimatedFixHours: 4,
            tags: ['arco-p', 'opposition', 'blocking'],
          });
        }
      }
    }

    // ─── Regla 5: Logging de datos sensibles ─────────────────────────────────
    const logWithPII = [
      /console\.(log|warn|error)\s*\(.*\b(email|password|rut|phone|credit)\b/i,
      /logger\.(info|warn|error|debug)\s*\(.*\b(email|password|rut|phone)\b/i,
      /_logger\.(LogInformation|LogWarning|LogError)\s*\(.*\b(email|password|rut)\b/i,
    ];

    lines.forEach((line, idx) => {
      for (const re of logWithPII) {
        if (re.test(line)) {
          findings.push({
            id: randomUUID(),
            type: 'PII_IN_LOGS',
            description: `Datos personales registrados en logs: "${line.trim().substring(0, 80)}..."`,
            severity: 'ALTA',
            law: 'Ley 21.719',
            article: 'Ley 21.719, Art. 18 + Art. 3 — Seguridad y principio de minimización (vigente dic. 2026)',
            file: filePath,
            lineNumber: idx + 1,
            codeSnippet: line.trim(),
            recommendation:
              'Nunca loggear datos personales directamente. Usar IDs o hashes. Ejemplo: logger.Info("User {UserId} updated", user.Id)',
            estimatedFixHours: 1,
            tags: ['logging', 'pii-leak', 'data-minimization'],
          });
          break;
        }
      }
    });

    return findings;
  }
}
