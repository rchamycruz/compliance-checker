# ESTRUCTURA DEL PROYECTO Y CONFIGURACIÓN INICIAL
## Sistema de Agentes para Cumplimiento Ley 21.719 y 21.663

---

## 1. ESTRUCTURA DE DIRECTORIOS

```
syntaxis-compliance-checker/
│
├── README.md
├── ARCHITECTURE.md
├── CONTRIBUTING.md
├── LICENSE
├── package.json
├── tsconfig.json
├── .env.example
│
├── src/
│   ├── index.ts                          # Entry point
│   ├── orchestrator.ts                   # Agente orquestador principal
│   │
│   ├── config/
│   │   ├── agents.config.ts              # Configuración de agentes
│   │   ├── skills.config.ts              # Configuración de skills
│   │   ├── mcp-servers.config.ts         # MCP servers
│   │   ├── rules-engine.ts               # Reglas de cumplimiento
│   │   └── constants.ts                  # Constantes
│   │
│   ├── agents/
│   │   ├── base-agent.ts                 # Clase base abstracta
│   │   ├── dpa-agent.ts                  # Data Protection Agent (Ley 21.719)
│   │   ├── csa-agent.ts                  # Cybersecurity Agent (Ley 21.663)
│   │   ├── transversal-agent.ts          # Cross-cutting concerns
│   │   └── types.ts                      # Tipos compartidos
│   │
│   ├── skills/
│   │   ├── base-skill.ts                 # Clase base
│   │   ├── sql-data-classifier/
│   │   │   ├── classifier.ts
│   │   │   ├── patterns.ts
│   │   │   └── tests/
│   │   ├── encryption-validator/
│   │   │   ├── validator.ts
│   │   │   ├── algorithms.ts
│   │   │   └── tests/
│   │   ├── authentication-validator/
│   │   │   ├── validator.ts
│   │   │   └── tests/
│   │   ├── logging-auditor/
│   │   │   ├── auditor.ts
│   │   │   └── tests/
│   │   ├── arco-p-implementation/
│   │   │   ├── validator.ts
│   │   │   └── tests/
│   │   ├── dependency-scanner/
│   │   │   ├── scanner.ts
│   │   │   ├── cve-database.ts
│   │   │   └── tests/
│   │   ├── code-pattern-analyzer/
│   │   │   ├── analyzer.ts
│   │   │   ├── patterns.ts
│   │   │   └── tests/
│   │   ├── consent-validator/
│   │   │   ├── validator.ts
│   │   │   └── tests/
│   │   ├── database-schema-reviewer/
│   │   │   ├── reviewer.ts
│   │   │   └── tests/
│   │   ├── api-security-reviewer/
│   │   │   ├── reviewer.ts
│   │   │   └── tests/
│   │   └── third-party-compliance/
│   │       ├── validator.ts
│   │       └── tests/
│   │
│   ├── mcp-connectors/
│   │   ├── base-connector.ts
│   │   ├── sql-server-connector.ts
│   │   ├── postgresql-connector.ts
│   │   ├── security-boundary.ts          # Security layer para MCPs
│   │   ├── query-validator.ts
│   │   ├── connection-pool.ts
│   │   └── audit-logger.ts
│   │
│   ├── report-generators/
│   │   ├── base-report-generator.ts
│   │   ├── json-report-generator.ts
│   │   ├── markdown-report-generator.ts
│   │   ├── html-report-generator.ts
│   │   ├── github-comment-generator.ts   # Para GitHub Actions
│   │   ├── types.ts
│   │   └── templates/
│   │       ├── report.html
│   │       └── github-comment.md
│   │
│   ├── integrations/
│   │   ├── vscode-extension/
│   │   │   ├── extension.ts
│   │   │   ├── package.json
│   │   │   ├── commands.ts
│   │   │   ├── diagnostics.ts
│   │   │   └── side-panel.ts
│   │   ├── github-action/
│   │   │   ├── action.yml
│   │   │   ├── action.ts
│   │   │   └── setup-environment.ts
│   │   ├── cli.ts                        # Command-line interface
│   │   ├── api-server.ts                 # REST API
│   │   └── slack-integration.ts          # Optional: Slack notifications
│   │
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── error-handler.ts
│   │   ├── helpers.ts
│   │   ├── file-reader.ts
│   │   ├── code-parser.ts
│   │   └── security.ts
│   │
│   └── types/
│       ├── index.ts
│       ├── agent.ts
│       ├── skill.ts
│       ├── report.ts
│       └── compliance.ts
│
├── tests/
│   ├── unit/
│   │   ├── agents/
│   │   ├── skills/
│   │   ├── mcp-connectors/
│   │   └── utils/
│   ├── integration/
│   │   ├── orchestrator.test.ts
│   │   ├── agent-skill-integration.test.ts
│   │   └── mcp-integration.test.ts
│   └── e2e/
│       ├── vscode-extension.test.ts
│       ├── github-action.test.ts
│       └── full-workflow.test.ts
│
├── examples/
│   ├── vulnerable-code.cs               # Código con problemas para testing
│   ├── vulnerable-code.js
│   ├── secure-code.cs                   # Código correcto
│   ├── sample-database.sql
│   └── README.md
│
├── .github/
│   ├── workflows/
│   │   ├── compliance-check.yml          # GitHub Action de compliance
│   │   ├── test.yml                      # Unit/integration tests
│   │   ├── security-audit.yml            # Security audit en CI/CD
│   │   └── release.yml                   # Release automation
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
│
├── docs/
│   ├── architecture/
│   │   ├── overview.md
│   │   ├── agents.md
│   │   ├── skills.md
│   │   ├── mcp.md
│   │   └── data-flow.md
│   ├── user-guide/
│   │   ├── vscode-extension.md
│   │   ├── github-actions.md
│   │   ├── cli-usage.md
│   │   └── api-reference.md
│   ├── admin-guide/
│   │   ├── installation.md
│   │   ├── configuration.md
│   │   ├── security-setup.md
│   │   └── troubleshooting.md
│   └── compliance/
│       ├── ley-21-719-mapping.md         # Qué skill cumple qué artículo
│       ├── ley-21-663-mapping.md
│       └── best-practices.md
│
├── deployment/
│   ├── docker/
│   │   ├── Dockerfile
│   │   ├── docker-compose.yml
│   │   └── .dockerignore
│   ├── kubernetes/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── configmap.yaml
│   ├── terraform/                        # Infrastructure as Code
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── scripts/
│       ├── install.sh
│       ├── configure.sh
│       └── migrate-database.sh
│
├── security/
│   ├── encryption-keys.example.yml
│   ├── dpa.template.md                   # Data Processing Agreement template
│   └── security-audit-checklist.md
│
└── CHANGELOG.md
```

---

## 2. CONFIGURACIÓN INICIAL

### 2.1 package.json

```json
{
  "name": "@syntaxis/compliance-checker",
  "version": "1.0.0",
  "description": "Agente de cumplimiento normativo para Ley 21.719 y 21.663 en Chile",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts",
    "start": "node dist/index.js",
    "cli": "ts-node src/integrations/cli.ts",
    "vscode:install": "npm run build && code --install-extension dist/vscode-extension",
    "github-action": "ts-node src/integrations/github-action.ts",
    "api-server": "ts-node src/integrations/api-server.ts"
  },
  "dependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "dotenv": "^16.3.1",
    "axios": "^1.6.0",
    "express": "^4.18.2",
    "sqlite3": "^5.1.6",
    "sql-parser": "^1.4.2",
    "minimist": "^1.2.8",
    "pino": "^8.16.1",
    "joi": "^17.11.0",
    "jsonschema": "^1.4.1",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/express": "^4.17.20",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "ts-node": "^10.9.1",
    "eslint": "^8.50.0",
    "@typescript-eslint/eslint-plugin": "^6.11.0",
    "@typescript-eslint/parser": "^6.11.0",
    "prettier": "^3.1.0",
    "supertest": "^6.3.3"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [
    "compliance",
    "data-protection",
    "cybersecurity",
    "chile",
    "ley-21-719",
    "ley-21-663"
  ],
  "author": "Syntaxis SPA",
  "license": "MIT"
}
```

### 2.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 2.3 .env.example

```bash
# ============================================
# COMPLIANCE CHECKER CONFIGURATION
# ============================================

# Environment
NODE_ENV=development
LOG_LEVEL=info

# ============================================
# DATABASE CONNECTIONS (MCP SERVERS)
# ============================================

# SQL Server
SQL_SERVER_HOST=your-sql-server.database.windows.net
SQL_SERVER_PORT=1433
SQL_SERVER_DATABASE=your-database
SQL_SERVER_USER=your-user
SQL_SERVER_PASSWORD=your-password
SQL_SERVER_ENCRYPT=true
SQL_SERVER_TRUST_CERTIFICATE=false

# PostgreSQL
POSTGRES_HOST=your-postgres-server.c.my-project.internal
POSTGRES_PORT=5432
POSTGRES_DATABASE=your-database
POSTGRES_USER=your-user
POSTGRES_PASSWORD=your-password
POSTGRES_SSL=require

# ============================================
# SECURITY & ENCRYPTION
# ============================================

# Encryption keys (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
ENCRYPTION_KEY_256=YOUR_BASE64_ENCODED_256_BIT_KEY_HERE
SIGNING_KEY=YOUR_HMAC_SIGNING_KEY_HERE

# MCP Security
MCP_QUERY_TIMEOUT_MS=30000
MCP_MAX_QUERIES_PER_MINUTE=100
MCP_AUDIT_LOG_ENABLED=true

# ============================================
# COMPLIANCE RULES
# ============================================

# Ley 21.719 - Protección de Datos
DATA_PROTECTION_ENABLED=true
ENCRYPTION_REQUIRED=true
ARCO_P_VALIDATION_ENABLED=true

# Ley 21.663 - Ciberseguridad
CYBERSECURITY_VALIDATION_ENABLED=true
NIST_CSF_ENABLED=true
ISO_27001_ENABLED=true

# ============================================
# REPORT GENERATION
# ============================================

REPORT_FORMAT=json,markdown,html
REPORT_OUTPUT_DIR=./reports
GITHUB_COMMENT_ON_PR=true
GENERATE_EXECUTIVE_SUMMARY=true

# ============================================
# GITHUB INTEGRATION
# ============================================

GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_REPO_OWNER=syntaxis
GITHUB_REPO_NAME=your-repo
GITHUB_ACTION_BLOCK_ON_CRITICAL=true

# ============================================
# API SERVER (si se ejecuta como servicio)
# ============================================

API_PORT=3000
API_HOST=localhost
API_ENABLE_HTTPS=false
API_CERT_PATH=/path/to/cert.pem
API_KEY_PATH=/path/to/key.pem

# ============================================
# THIRD-PARTY INTEGRATIONS
# ============================================

# Slack (opcional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_CHANNEL=#compliance-alerts

# Sentry (error tracking)
SENTRY_DSN=https://your-key@sentry.io/your-project-id

# ============================================
# DEVELOPMENT
# ============================================

DEBUG=syntaxis:*
ENABLE_PROFILING=false
```

---

## 3. EJEMPLO: AGENT BASE CLASS

```typescript
// src/agents/base-agent.ts
import { Logger } from '../utils/logger';
import { Skill } from '../types/skill';
import { AgentFinding, AgentReport } from '../types/agent';

export abstract class BaseAgent {
  protected name: string;
  protected description: string;
  protected skills: Map<string, Skill> = new Map();
  protected logger: Logger;
  protected law: string;

  constructor(name: string, law: string) {
    this.name = name;
    this.law = law;
    this.logger = new Logger(`Agent:${name}`);
  }

  /**
   * Registra una skill con este agente
   */
  registerSkill(skillName: string, skill: Skill): void {
    this.skills.set(skillName, skill);
    this.logger.info(`Skill registered: ${skillName}`);
  }

  /**
   * Ejecuta el análisis (debe implementarse por cada agente)
   */
  abstract analyze(input: any): Promise<AgentReport>;

  /**
   * Determina si este agente debe ejecutarse
   */
  abstract shouldActivate(context: any): boolean;

  /**
   * Ejecuta todas las skills registradas en paralelo
   */
  protected async executeSkills(input: any): Promise<AgentFinding[]> {
    const skillPromises = Array.from(this.skills.values()).map(skill => 
      skill.execute(input)
        .catch(error => {
          this.logger.error(`Skill ${skill.name} failed:`, error);
          return {
            name: skill.name,
            status: 'ERROR',
            error: error.message,
            findings: []
          };
        })
    );

    const results = await Promise.all(skillPromises);
    
    // Flatten findings
    const allFindings: AgentFinding[] = [];
    for (const result of results) {
      if (result.findings) {
        allFindings.push(...result.findings);
      }
    }

    return allFindings;
  }

  /**
   * Prioriza y ordena los hallazgos
   */
  protected prioritizeFindings(findings: AgentFinding[]): AgentFinding[] {
    const severityOrder = {
      'CRÍTICA': 0,
      'ALTA': 1,
      'MEDIA': 2,
      'BAJA': 3
    };

    return findings.sort((a, b) => {
      const aScore = severityOrder[a.severity as keyof typeof severityOrder] ?? 999;
      const bScore = severityOrder[b.severity as keyof typeof severityOrder] ?? 999;
      return aScore - bScore;
    });
  }

  /**
   * Genera reporte final del agente
   */
  protected generateReport(findings: AgentFinding[]): AgentReport {
    const critical = findings.filter(f => f.severity === 'CRÍTICA').length;
    const high = findings.filter(f => f.severity === 'ALTA').length;
    
    return {
      agentName: this.name,
      law: this.law,
      executedAt: new Date(),
      totalFindings: findings.length,
      criticalFindings: critical,
      highFindings: high,
      status: critical > 0 ? 'FAIL' : high > 0 ? 'WARNING' : 'PASS',
      findings: this.prioritizeFindings(findings)
    };
  }
}
```

---

## 4. EJEMPLO: DPA AGENT (Ley 21.719)

```typescript
// src/agents/dpa-agent.ts
import { BaseAgent } from './base-agent';
import { AgentReport } from '../types/agent';

export class DPAAgent extends BaseAgent {
  constructor() {
    super(
      'DPA (Data Protection Agent)',
      'Ley 21.719 - Protección de Datos Personales'
    );
  }

  shouldActivate(context: any): boolean {
    return context.handlesPersonalData || 
           context.hasDatabaseSchema || 
           context.processesPII;
  }

  async analyze(input: any): Promise<AgentReport> {
    this.logger.info('Starting DPA analysis...');

    try {
      // 1. Ejecutar skills relevantes
      const findings = await this.executeSkills(input);

      // 2. Aplicar reglas específicas de Ley 21.719
      const processedFindings = this.applyLawRules(findings);

      // 3. Generar reporte
      return this.generateReport(processedFindings);
    } catch (error) {
      this.logger.error('DPA analysis failed:', error);
      throw error;
    }
  }

  private applyLawRules(findings: any[]): any[] {
    // Verificar artículos específicos de Ley 21.719
    const lawArticles = {
      'Art. 4': 'Derechos ARCO+P',
      'Art. 5': 'Acceso',
      'Art. 6': 'Rectificación',
      'Art. 7': 'Supresión',
      'Art. 8': 'Oposición',
      'Art. 9': 'Portabilidad',
      'Art. 10': 'Bloqueo',
      'Art. 18': 'Seguridad (Cifrado)',
      'Art. 19': 'Evaluación de Impacto (EIPD)',
      'Art. 20': 'Notificación de Brechas'
    };

    return findings.map(finding => ({
      ...finding,
      law: 'Ley 21.719',
      article: this.matchArticle(finding, lawArticles)
    }));
  }

  private matchArticle(finding: any, articles: Record<string, string>): string {
    // Lógica para mapear hallazgos a artículos específicos
    if (finding.type === 'ENCRYPTION') return 'Art. 18';
    if (finding.type === 'ARCO_P') return 'Art. 4-10';
    if (finding.type === 'EIPD') return 'Art. 19';
    if (finding.type === 'BREACH_NOTIFICATION') return 'Art. 20';
    return 'Art. General';
  }
}
```

---

## 5. GITHUB ACTION WORKFLOW

```yaml
# .github/workflows/compliance-check.yml
name: Compliance Check (Ley 21.719 y 21.663)

on:
  pull_request:
    types: [opened, synchronize, reopened]
  workflow_dispatch:

permissions:
  contents: read
  pull-requests: write
  checks: write

jobs:
  compliance:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    services:
      sql-server:
        image: mcr.microsoft.com/mssql/server:2019-latest
        env:
          SA_PASSWORD: Test1234!
          ACCEPT_EULA: Y

      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build compliance checker
        run: npm run build

      - name: Get changed files
        id: changed-files
        uses: tj-actions/changed-files@v40
        with:
          files: |
            src/**/*.{cs,js,ts,sql}
            package.json
            appsettings.json

      - name: Run compliance check
        id: compliance
        if: steps.changed-files.outputs.any_changed == 'true'
        run: |
          npm run cli -- check \
            --files "${{ steps.changed-files.outputs.all_changed_files }}" \
            --output compliance-report.json \
            --format json,markdown
        env:
          SQL_SERVER_HOST: localhost
          SQL_SERVER_USER: sa
          SQL_SERVER_PASSWORD: Test1234!
          POSTGRES_HOST: localhost
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres

      - name: Parse compliance results
        id: parse
        if: always()
        run: |
          node -e "
          const fs = require('fs');
          const report = JSON.parse(fs.readFileSync('compliance-report.json'));
          const critical = report.findings.filter(f => f.severity === 'CRÍTICA').length;
          const high = report.findings.filter(f => f.severity === 'ALTA').length;
          console.log('::set-output name=critical::' + critical);
          console.log('::set-output name=high::' + high);
          "

      - name: Upload compliance report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: compliance-report
          path: compliance-report.*
          retention-days: 30

      - name: Comment on PR
        if: always() && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('compliance-report.json'));
            
            let comment = `## 🔍 Compliance Check Report\n\n`;
            comment += `**Critical Issues:** ❌ ${{ steps.parse.outputs.critical }}\n`;
            comment += `**High Issues:** ⚠️ ${{ steps.parse.outputs.high }}\n\n`;
            
            if (parseInt('${{ steps.parse.outputs.critical }}') > 0) {
              comment += `### ❌ MERGE BLOQUEADO\n`;
              comment += `Existen ${parseInt('${{ steps.parse.outputs.critical }}')} problemas críticos que deben resolverse.\n\n`;
            } else if (parseInt('${{ steps.parse.outputs.high }}') > 0) {
              comment += `### ⚠️ REQUIERE REVISIÓN\n`;
              comment += `Existen ${parseInt('${{ steps.parse.outputs.high }}')} problemas de alta severidad.\n\n`;
            } else {
              comment += `### ✅ APROBADO\n`;
              comment += `No se encontraron problemas de cumplimiento críticos.\n\n`;
            }
            
            // Añadir detalles de hallazgos
            const findings = report.findings.slice(0, 5);
            if (findings.length > 0) {
              comment += `### Top Findings\n`;
              findings.forEach(f => {
                comment += `- **${f.severity}**: ${f.description} (${f.law})\n`;
              });
            }
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });

      - name: Block merge if critical issues
        if: steps.parse.outputs.critical > 0
        run: |
          echo "❌ MERGE BLOQUEADO: Existen problemas críticos de cumplimiento"
          exit 1
```

---

## 6. TIPOS TYPESCRIPT

```typescript
// src/types/agent.ts
export interface AgentFinding {
  id?: string;
  type: string;
  description: string;
  severity: 'CRÍTICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  law: string;
  article?: string;
  lineNumber?: number;
  file?: string;
  code?: string;
  recommendation: string;
  estimatedFixTime?: string;
  cvssScore?: number;
  tags?: string[];
}

export interface AgentReport {
  agentName: string;
  law: string;
  executedAt: Date;
  executionTimeMs?: number;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  status: 'PASS' | 'WARNING' | 'FAIL';
  findings: AgentFinding[];
  summary?: string;
}

export interface Agent {
  name: string;
  analyze(input: any): Promise<AgentReport>;
  shouldActivate(context: any): boolean;
}
```

---

## 7. PRÓXIMOS PASOS

1. **Crear estructura base:**
   ```bash
   git init
   npm init -y
   npm install
   # Crear directorios
   mkdir -p src/agents src/skills src/mcp-connectors src/report-generators
   ```

2. **Configurar linting y testing:**
   ```bash
   npm install --save-dev eslint prettier jest @types/jest ts-jest
   npx eslint --init
   ```

3. **Implementar first skill:**
   - Comenzar con `sql-data-classifier` (menos complejidad)
   - Escribir unit tests mientras se desarrolla
   - Integrar con base-agent

4. **Testing manual:**
   ```bash
   npm run build
   npm test
   npm run cli check --files examples/vulnerable-code.cs
   ```

5. **CI/CD inicial:**
   - Crear `.github/workflows/test.yml` con pruebas unitarias
   - Crear `.github/workflows/build.yml` para compilación
   - Luego add compliance-check.yml

---

Esta estructura sigue best practices:
- ✅ Separación de concerns
- ✅ Testing a todos los niveles
- ✅ Documentación integral
- ✅ CI/CD ready
- ✅ Escalabilidad

```

