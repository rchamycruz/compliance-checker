# DIAGRAMAS Y VISUALIZACIÓN DEL SISTEMA
## Agentes de Cumplimiento Normativo para Chile (Ley 21.719 y 21.663)

---

## DIAGRAMA 1: FLUJO COMPLETO DE ANÁLISIS

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          INPUT (Código + BD)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ .cs/.js/.ts  │  │ SQL Schema   │  │ Config Files │  │ Package.json│  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼───────────────┼──────────┘
          │                  │                  │               │
          └──────────────────┼──────────────────┼───────────────┘
                             │
                             ▼
                ┌─────────────────────────────┐
                │   PARSING & TOKENIZATION    │
                │                             │
                │ • AST extraction            │
                │ • SQL parsing               │
                │ • Dependency tree           │
                └──────────────┬──────────────┘
                               │
                               ▼
                ┌─────────────────────────────┐
                │   CONTEXT ANALYZER          │
                │                             │
                │ ¿Toca datos personales?     │
                │ ¿Acceso autenticado?        │
                │ ¿Hay vulnerabilidades?      │
                │ ¿Conflictos entre leyes?    │
                └──────────────┬──────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        ┌─────────────┐  ┌─────────────┐  ┌──────────────┐
        │ DPA AGENT   │  │ CSA AGENT   │  │ TRANSVERSAL  │
        │ (Ley 21719) │  │(Ley 21663)  │  │   AGENT      │
        └──────┬──────┘  └──────┬──────┘  └────────┬─────┘
               │                │              │
        ┌──────┴────────┐       │              │
        │               │       │              │
        ▼               ▼       ▼              ▼
    ┌─────────┐  ┌─────────┐ ┌─────────┐  ┌──────────┐
    │ Skill 1 │  │ Skill 3 │ │ Skill 6 │  │ Skill 11 │
    │ Skill 2 │  │ Skill 4 │ │ Skill 7 │  │          │
    │ Skill 5 │  │ Skill 8 │ │ Skill 9 │  │ + others │
    │ Skill 8 │  │ Skill 9 │ │Skill 10 │  │          │
    │Skill 11 │  │         │ │         │  │          │
    └────┬────┘  └────┬────┘ └────┬────┘  └────┬─────┘
         │             │          │             │
         └─────────────┼──────────┼─────────────┘
                       │          │
          ┌────────────▼──────────▼──────────────┐
          │   MCP CONNECTORS (READ-ONLY)         │
          │                                       │
          │ ┌─────────────────────────────────┐  │
          │ │ SQL Server Connector            │  │
          │ │ • Query validation              │  │
          │ │ • Connection pooling            │  │
          │ │ • Audit logging                 │  │
          │ └─────────────────────────────────┘  │
          │                                       │
          │ ┌─────────────────────────────────┐  │
          │ │ PostgreSQL Connector            │  │
          │ │ • Query validation              │  │
          │ │ • Connection pooling            │  │
          │ │ • Audit logging                 │  │
          │ └─────────────────────────────────┘  │
          └────────────────┬─────────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────┐
         │ RULES ENGINE & AGGREGATION      │
         │                                 │
         │ • Priorizar hallazgos           │
         │ • Aplicar reglas de cumplimiento│
         │ • Generar scores                │
         │ • Decidir: BLOQUEA/ADVERTENCIA  │
         └─────────────────┬───────────────┘
                           │
                           ▼
         ┌─────────────────────────────────┐
         │ REPORT GENERATION               │
         │                                 │
         │ ├─ JSON Report                  │
         │ ├─ Markdown Report              │
         │ ├─ HTML Report                  │
         │ └─ GitHub Comment               │
         └─────────────────┬───────────────┘
                           │
                           ▼
    ┌─────────────────────────────────────────┐
    │            OUTPUT                        │
    │                                         │
    │  Status: ✅ PASS / ⚠️ WARN / ❌ FAIL  │
    │  Files with issues, recommendations    │
    │  Artifacts for download                │
    └─────────────────────────────────────────┘
```

---

## DIAGRAMA 2: MAPEO LEYES → AGENTES → SKILLS

```
┌────────────────────────────────────────┐
│     LEY 21.719 (PROTECCIÓN DATOS)      │
│                                        │
│ Art. 4-10: Derechos ARCO+P            │ ──► SKILL: arco-p-implementation
│ Art. 18: Seguridad (Cifrado)          │ ──► SKILL: encryption-validation
│ Art. 19: Evaluación de Impacto        │ ──► SKILL: database-schema-review
│ Art. 20: Notificación de Brechas      │ ──► SKILL: logging-auditing
│ Consentimiento para datos sensibles   │ ──► SKILL: consent-validator
│ Principio de Responsabilidad Proactiva│ ──► SKILL: third-party-compliance
│                                        │
└──────────────┬───────────────────────┘
               │
               ▼
        ┌─────────────────┐
        │  DPA AGENT      │
        │ (Master: Art 1) │
        └────────┬────────┘
                 │
        ┌────────▼────────────────────┐
        │  5 SKILLS DEL DPA            │
        │ 1. sql-data-classifier       │
        │ 2. encryption-validation     │
        │ 3. logging-auditing          │
        │ 4. arco-p-implementation     │
        │ 5. consent-validator         │
        └─────────────────────────────┘

┌────────────────────────────────────────┐
│     LEY 21.663 (CIBERSEGURIDAD)        │
│                                        │
│ NIST AC-02: Autenticación             │ ──► SKILL: authentication-validator
│ NIST AC-06: Menor Privilegio          │ ──► SKILL: authentication-validator
│ NIST SI-02: Parches/Updates           │ ──► SKILL: dependency-scanner
│ NIST SI-06: Seguridad de BD           │ ──► SKILL: database-schema-review
│ NIST SI-10: Validación de entrada     │ ──► SKILL: code-pattern-analyzer
│ NIST SC-08: Cifrado en tránsito       │ ──► SKILL: encryption-validation
│ NIST AU-02: Auditoría                 │ ──► SKILL: logging-auditing
│ ISO 27001: Gobernanza seguridad       │ ──► SKILL: third-party-compliance
│ Incidentes < 3 horas                  │ ──► SKILL: logging-auditing
│                                        │
└──────────────┬───────────────────────┘
               │
               ▼
        ┌─────────────────┐
        │  CSA AGENT      │
        │ (Master: Art 1) │
        └────────┬────────┘
                 │
        ┌────────▼────────────────────┐
        │  5 SKILLS DEL CSA            │
        │ 1. authentication-validator  │
        │ 2. dependency-scanner        │
        │ 3. code-pattern-analyzer     │
        │ 4. api-security-reviewer     │
        │ 5. database-schema-review    │
        └─────────────────────────────┘
```

---

## DIAGRAMA 3: ÁRBOL DE DECISIONES (Rules Engine)

```
┌──────────────────────────────────────────────────────────────────┐
│                 AGENTE RETORNA HALLAZGOS                         │
│              (Lista de AgentFinding[])                           │
└───────────────┬──────────────────────────────────────────────────┘
                │
                ▼
        ┌───────────────────┐
        │ ¿Existe hallazgo  │
        │ CRÍTICA?          │
        └────────┬──────────┘
                 │
         ┌───────┴────────┐
         │ YES            │ NO
         │                │
    ┌────▼────┐      ┌────▼──────────┐
    │ COUNT++  │      │ ¿Existe ALTA? │
    │ CRÍTICA  │      └────┬──────────┘
    │          │           │
    └────┬─────┘    ┌──────┴───────┐
         │          │ YES          │ NO
         │      ┌───▼───┐      ┌──▼─────┐
         │      │COUNT++│      │Validar │
         │      │ALTA   │      │MEDIA   │
         │      │       │      │        │
         │      └───┬───┘      └──┬────┘
         │          │             │
         └──────┬───┴─────────────┘
                │
                ▼
        ┌──────────────────────┐
        │ SUMMARIZE FINDINGS   │
        │                      │
        │ ├─ Total             │
        │ ├─ Critical Count    │
        │ ├─ High Count        │
        │ ├─ Medium Count      │
        │ └─ Low Count         │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ DETERMINE FINAL STATUS   │
        └──────────┬───────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
    ┌───▼───────────────┐ ┌──▼─────────────────┐
    │ CRITICAL COUNT > 0│ │ HIGH COUNT > 0     │
    │       YES         │ │       YES          │
    │                   │ │                    │
    │ STATUS = ❌ FAIL  │ │ STATUS = ⚠️ WARN  │
    │                   │ │                    │
    │ ACTION:           │ │ ACTION:            │
    │ • BLOQUEA MERGE   │ │ • Requiere Revisión│
    │ • PR Status: RED  │ │ • PR Status: YELLOW│
    │ • Exit code: 1    │ │ • Exit code: 0     │
    └───────────────────┘ └────────────────────┘
                   │
                   │
        ┌──────────▼──────────┐
        │ BOTH COUNTS = 0     │
        │       YES           │
        │                     │
        │ STATUS = ✅ PASS   │
        │                     │
        │ ACTION:             │
        │ • Merge automático  │
        │ • PR Status: GREEN  │
        │ • Exit code: 0      │
        └─────────────────────┘
```

---

## DIAGRAMA 4: CICLO DE VIDA DE UN HALLAZGO

```
┌──────────────────────────────────────────────────────────┐
│                  SKILL DETECTS ISSUE                     │
│  (ej: Email sin cifrado en BD)                          │
└───────────────────┬──────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────────────┐
        │ CREATE AgentFinding OBJECT    │
        │                               │
        │ {                             │
        │   id: uuid(),                 │
        │   type: 'ENCRYPTION',         │
        │   description: '...',         │
        │   severity: 'CRÍTICA',        │
        │   law: 'Ley 21.719',          │
        │   article: 'Art. 18',         │
        │   lineNumber: 45,             │
        │   file: 'models/User.cs',     │
        │   recommendation: '...',      │
        │   estimatedFixTime: '2h',     │
        │   tags: ['data-protection']   │
        │ }                             │
        └──────────────┬────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ AGENT AGGREGATES FINDINGS    │
        │ • De todos los skills        │
        │ • En paralelo               │
        │ • Deduplicación             │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ RULES ENGINE APPLIES RULES   │
        │ • Matching artículos         │
        │ • Severity weighting         │
        │ • Scoring                    │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ GENERATE REPORT              │
        │ • JSON (máquina)             │
        │ • Markdown (doc)             │
        │ • HTML (visual)              │
        │ • GitHub Comment             │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ OUTPUT TO CONSUMER           │
        │                              │
        │ • Developer (VS Code):       │
        │   - Highlight línea 45       │
        │   - Hover muestra problema   │
        │   - Quick fix: recomendación │
        │                              │
        │ • GitHub Comment:            │
        │   - Link a reporte HTML      │
        │   - Recomendación inline     │
        │   - Bloqueando merge         │
        │                              │
        │ • Log & Audit:               │
        │   - Registra hallazgo        │
        │   - Para compliance audit    │
        └──────────────────────────────┘
```

---

## DIAGRAMA 5: MATRIZ SEVERITY × IMPACT

```
                    IMPACT (to business)
                  LOW      MEDIUM      HIGH       CRITICAL
            ┌─────────────────────────────────────────────┐
            │                                             │
      L     │  🟢 BAJA    │ 🟡 MEDIA  │ 🟠 ALTA   │ 🔴 CRÍTICA
  S E       │             │           │           │
  E V       │             │           │           │
  V E       │─────────────────────────────────────────────│
  E R       │             │           │           │
  R I       │  🟡 MEDIA   │ 🟠 ALTA   │ 🔴 CRÍTICA│ 🔴 CRÍTICA
  I T       │             │           │           │
  T Y       │             │           │           │
            │─────────────────────────────────────────────│
            │             │           │           │
      H     │  🟠 ALTA    │ 🔴 CRÍTICA│ 🔴 CRÍTICA│ 🔴 CRÍTICA
            │             │           │           │
      I     │             │           │           │
            │─────────────────────────────────────────────│
            │             │           │           │
      G     │  🔴 CRÍTICA │ 🔴 CRÍTICA│ 🔴 CRÍTICA│ 🔴 CRÍTICA
            │             │           │           │
      H     │             │           │           │
            └─────────────────────────────────────────────┘

Ejemplos por Cuadrante:

🟢 BAJA (Low Severity, Low Impact)
  • Comentario de código incompleto
  • Convención de naming no seguida (style, no security)

🟡 MEDIA (Med Severity, Med Impact)
  • Logging incompleto (detecta mayoría, pero falta uno)
  • Update de librería recomendado (no crítico, pero prudente)

🟠 ALTA (High Severity, Med/High Impact)
  • MFA no implementado en admin
  • SQL Injection en query secundaria
  • Credenciales en env file

🔴 CRÍTICA (High Severity, High Impact)
  • Email sin cifrado en BD principal
  • SQL Injection en query primaria
  • Consentimiento no documentado para datos sensibles
  • Credenciales en código fuente
  • Sin autenticación en endpoint PII
```

---

## DIAGRAMA 6: DISTRIBUCIÓN DE FINDINGS POR AGENTE

```
Ejemplo de Análisis Hipotético:

┌─────────────────────────────────────────────────────────┐
│         TYPICAL ANALYSIS RESULT (100% pull request)    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ DPA AGENT (Ley 21.719)                                │
│ ├─ sql-data-classifier:      2 hallazgos              │
│ │  └─ 1 CRÍTICA, 1 ALTA                               │
│ ├─ encryption-validation:    3 hallazgos              │
│ │  └─ 1 CRÍTICA, 2 ALTA                               │
│ ├─ logging-auditing:         1 hallazgo               │
│ │  └─ 1 MEDIA                                         │
│ ├─ arco-p-implementation:    2 hallazgos              │
│ │  └─ 1 CRÍTICA, 1 BAJA                               │
│ └─ consent-validator:        0 hallazgos              │
│                                                         │
│ TOTAL DPA: 8 hallazgos (3 CRÍTICA, 3 ALTA, 1 MEDIA)  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ CSA AGENT (Ley 21.663)                                │
│ ├─ authentication-validator: 2 hallazgos              │
│ │  └─ 1 ALTA, 1 MEDIA                                 │
│ ├─ code-pattern-analyzer:    4 hallazgos              │
│ │  └─ 2 CRÍTICA, 2 MEDIA                              │
│ ├─ dependency-scanner:       1 hallazgo               │
│ │  └─ 1 ALTA                                          │
│ ├─ api-security-reviewer:    1 hallazgo               │
│ │  └─ 1 MEDIA                                         │
│ └─ database-schema-review:   0 hallazgos              │
│                                                         │
│ TOTAL CSA: 8 hallazgos (2 CRÍTICA, 2 ALTA, 4 MEDIA)  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ TRANSVERSAL AGENT                                     │
│ ├─ third-party-compliance:   1 hallazgo               │
│ │  └─ 1 BAJA                                          │
│                                                         │
│ TOTAL TRANSVERSAL: 1 hallazgo (1 BAJA)               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ CONSOLIDATED REPORT:                                  │
│                                                         │
│  Total Findings:        17                            │
│  ├─ CRÍTICA:            5  ❌ BLOQUEA MERGE          │
│  ├─ ALTA:               5  ⚠️  REQUIERE REVISIÓN    │
│  ├─ MEDIA:              6  ℹ️  INFORMATIVO          │
│  └─ BAJA:               1  ✓  RECOMENDAR            │
│                                                         │
│  STATUS: ❌ FAIL - Merge bloqueado por 5 CRÍTICA     │
│                                                         │
│  ESTIMATED FIX TIME: 12-16 horas                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## DIAGRAMA 7: COMPARATIVA HERRAMIENTAS EXISTENTES

```
┌──────────────────────────────────────────────────────────────────┐
│  Herramienta          │ Ley 21.719 │ Ley 21.663 │ Integraciones │
├──────────────────────┼────────────┼────────────┼────────────────┤
│ SonarQube            │ Parcial    │ Sí         │ VS Code, GitHub│
│ (Open Source)        │            │            │                │
├──────────────────────┼────────────┼────────────┼────────────────┤
│ Snyk                 │ No         │ Sí (deps)  │ VS Code, GitHub│
│ (Freemium)           │            │            │                │
├──────────────────────┼────────────┼────────────┼────────────────┤
│ GitGuardian          │ No         │ Parcial    │ GitHub         │
│ (Secrets only)       │            │            │                │
├──────────────────────┼────────────┼────────────┼────────────────┤
│ TruffleHog           │ No         │ Parcial    │ CLI            │
│ (Open Source)        │            │            │                │
├──────────────────────┼────────────┼────────────┼────────────────┤
│ BigID                │ Sí         │ No         │ Enterprise     │
│ (Enterprise)         │            │            │                │
├──────────────────────┼────────────┼────────────┼────────────────┤
│ Cloudmersive         │ Parcial    │ No         │ API only       │
│ (API-based)          │            │            │                │
├──────────────────────┼────────────┼────────────┼────────────────┤
│ SYNTAXIS CHECKER 🆕 │ Sí ✅      │ Sí ✅      │ VS Code + GH ✅│
│ (This project)       │ Completo   │ Completo   │ + CLI + API    │
│                      │ Agentes    │ Agentes    │ + Custom       │
│                      │ Específicos│ Específicos│                │
└──────────────────────┴────────────┴────────────┴────────────────┘

KEY DIFFERENTIATORS:
✅ Específicamente diseñado para Chile (Ley 21.719 + 21.663)
✅ Agentes especializados (no genérico)
✅ Skills modulares y reutilizables
✅ Open architecture (fácil agregar nuevas leyes)
✅ MCP read-only guarantee (seguro incluso en prod)
✅ Integración full-stack (VS Code + GitHub + CLI + API)
✅ Reporting granular con recomendaciones concretas
✅ GitHub Action nativo para PR automation
```

---

## DIAGRAMA 8: TIMELINE VISUAL

```
2026-05-25 (TODAY)  ► PLAN APROBADO

2026-06 ─────────────────────────────────────┐
│ Semana 1-2: Setup Base                    │
│ ✓ Repositorio + estructura                │ PHASE 1: FOUNDATION
│ ✓ Config TypeScript                       │ (2 semanas)
│ ✓ First unit tests                        │
└─────────────────────────────────────────────┘
  │
  ▼
2026-07 ─────────────────────────────────────┐
│ Semana 3-6: Skills Básicas                │
│ ✓ sql-data-classifier                     │
│ ✓ encryption-validation                   │ PHASE 2: SKILLS
│ ✓ logging-auditing                        │ (4 semanas)
│ ✓ Primera integración con agent           │
└─────────────────────────────────────────────┘
  │
  ▼
2026-08 ─────────────────────────────────────┐
│ Semana 7-10: Agentes Principales         │
│ ✓ DPA Agent completo                      │
│ ✓ CSA Agent completo                      │
│ ✓ Transversal Agent                       │ PHASE 3: AGENTS
│ ✓ Orquestrador central                    │ (4 semanas)
└─────────────────────────────────────────────┘
  │
  ▼
2026-09 ─────────────────────────────────────┐
│ Semana 11-14: MCP + Reports              │
│ ✓ SQL Server Connector                    │
│ ✓ PostgreSQL Connector                    │
│ ✓ Report generators (JSON/MD/HTML)        │ PHASE 4: MCP + REPORTS
│ ✓ Security boundary layer                 │ (4 semanas)
└─────────────────────────────────────────────┘
  │
  ▼
2026-10 ─────────────────────────────────────┐
│ Semana 15-18: Integraciones               │
│ ✓ VS Code Extension                       │
│ ✓ GitHub Action                           │
│ ✓ CLI Tool                                │ PHASE 5: INTEGRATIONS
│ ✓ REST API                                │ (4 semanas)
└─────────────────────────────────────────────┘
  │
  ▼
2026-11 ─────────────────────────────────────┐
│ Semana 19-22: Testing & QA                │
│ ✓ Unit tests (>80% coverage)              │
│ ✓ Integration tests                       │
│ ✓ E2E tests                               │ PHASE 6: QA
│ ✓ Security audit                          │ (4 semanas)
└─────────────────────────────────────────────┘
  │
  ▼
2026-12 ─────────────────────────────────────┐
│ Semana 23-24: Docs + Release              │
│ ✓ Technical documentation                 │
│ ✓ User guides                             │
│ ✓ Team training                           │ PHASE 7: RELEASE
│ ✓ v1.0 Release                            │ (2 semanas)
│                                            │
│ 🎉 GO LIVE                                │
└─────────────────────────────────────────────┘

TIMELINE: 24 semanas (6 meses)
TEAM: 3-4 devs + 1 security engineer
BUDGET: $150,000 - $200,000 USD
```

---

## DIAGRAMA 9: STACK TECNOLÓGICO

```
┌─────────────────────────────────────────────────────────────┐
│                   TECHNOLOGY STACK                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  RUNTIME & LANGUAGE                                       │
│  ├─ Node.js 18+ (LTS)                                     │
│  ├─ TypeScript 5.0+                                       │
│  └─ Deno (alternative, future-proof)                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CORE FRAMEWORKS                                          │
│  ├─ Express.js (API Server)                              │
│  ├─ Commander.js (CLI)                                   │
│  └─ Mocha/Jest (Testing)                                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DATA & DATABASE                                          │
│  ├─ mssql (SQL Server driver)                            │
│  ├─ pg (PostgreSQL driver)                               │
│  ├─ sqlite3 (Local caching)                              │
│  └─ sql-parser (Query analysis)                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SECURITY & CRYPTO                                        │
│  ├─ crypto-js (Encryption utilities)                     │
│  ├─ bcryptjs (Password hashing)                          │
│  ├─ jsonwebtoken (JWT handling)                          │
│  └─ dotenv (Environment variables)                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CODE ANALYSIS                                            │
│  ├─ acorn (JavaScript AST)                               │
│  ├─ @typescript-eslint/parser (TypeScript AST)           │
│  ├─ regex-based pattern matching                         │
│  └─ dependency-check (npm audit)                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  LOGGING & MONITORING                                     │
│  ├─ pino (Structured logging)                            │
│  ├─ winston (Alternative logger)                         │
│  ├─ sentry (Error tracking - optional)                   │
│  └─ prometheus (Metrics - optional)                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TESTING                                                  │
│  ├─ jest (Unit testing)                                  │
│  ├─ supertest (HTTP testing)                             │
│  ├─ ts-jest (TypeScript testing)                         │
│  └─ nock (HTTP mocking)                                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CI/CD & DEPLOYMENT                                       │
│  ├─ GitHub Actions (Workflow automation)                 │
│  ├─ Docker (Containerization)                            │
│  ├─ Kubernetes (Orchestration - optional)                │
│  └─ Terraform (IaC - optional)                           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  VS CODE EXTENSION                                        │
│  ├─ Vscode API                                           │
│  ├─ WebView for side panel                               │
│  └─ Language server protocol (LSP)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## DIAGRAMA 10: SEGURIDAD GARANTÍAS

```
┌───────────────────────────────────────────────────────────────┐
│           SECURITY GUARANTEES & BOUNDARIES                    │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ✓ MCP SERVERS (Read-Only Guarantee)                        │
│    │                                                          │
│    ├─ Connection Pooling                                     │
│    │  └─ Max 5 connections per DB                            │
│    │  └─ Auto-close after 30s idle                          │
│    │  └─ Total max 100 connections global                    │
│    │                                                          │
│    ├─ Query Validation                                       │
│    │  └─ Whitelist: SELECT, DESC, SHOW only                 │
│    │  └─ Blacklist: INSERT, UPDATE, DELETE, DROP            │
│    │  └─ Validate before execution (not after)              │
│    │  └─ Max query length: 5KB                               │
│    │                                                          │
│    ├─ Execution Control                                      │
│    │  └─ Timeout: 30 seconds max                             │
│    │  └─ Rate limit: 100 queries/min per agent              │
│    │  └─ Cancel if timeout                                   │
│    │                                                          │
│    └─ Audit & Logging                                        │
│       └─ All queries logged (table, user, timestamp)        │
│       └─ Results logged (rows returned, execution time)      │
│       └─ Errors logged for debugging                         │
│       └─ Retention: 90 days minimum                          │
│       └─ Immutable (append-only)                             │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ✓ ENCRYPTION (Secrets Management)                          │
│    │                                                          │
│    ├─ Database Credentials                                   │
│    │  └─ Stored in environment variables                     │
│    │  └─ Never in code                                       │
│    │  └─ Loaded from .env (local) or secrets manager (prod)  │
│    │  └─ Never logged or exposed                             │
│    │                                                          │
│    ├─ Data in Transit                                        │
│    │  └─ TLS 1.3 for all connections                        │
│    │  └─ HTTPS for API endpoints                             │
│    │  └─ Certificate validation enabled                      │
│    │  └─ No fallback to HTTP                                 │
│    │                                                          │
│    └─ Data at Rest                                           │
│       └─ Encryption key stored separately                    │
│       └─ AES-256-CBC with IV                                 │
│       └─ HMAC for integrity                                  │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ✓ CODE ANALYSIS (Safety)                                   │
│    │                                                          │
│    ├─ No Direct Data Extraction                              │
│    │  └─ Schema introspection only                           │
│    │  └─ No SELECT * FROM sensitive_table                    │
│    │  └─ No data export features                             │
│    │  └─ Classifications based on column names               │
│    │                                                          │
│    ├─ No Persistence of Sensitive Data                       │
│    │  └─ Memory-only processing                              │
│    │  └─ No caching of query results                         │
│    │  └─ Cleanup after analysis                              │
│    │                                                          │
│    └─ Input Validation                                       │
│       └─ Validate all file inputs                            │
│       └─ Validate database parameters                        │
│       └─ Sanitize for command injection                      │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ✓ AUTHORIZATION (Access Control)                           │
│    │                                                          │
│    ├─ MCP Agents                                             │
│    │  └─ Isolated execution contexts                         │
│    │  └─ No cross-agent data sharing                         │
│    │  └─ Separate temp directories                           │
│    │                                                          │
│    ├─ File System Access                                     │
│    │  └─ Only source code directories                        │
│    │  └─ No access to /etc, /root, etc                       │
│    │  └─ Temporary files cleaned up                          │
│    │                                                          │
│    └─ Network Access                                         │
│       └─ Only to configured DB servers                       │
│       └─ No internet access (by default)                     │
│       └─ No DNS lookups except configured                    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

**FIN DE DIAGRAMAS**

Estos diagramas proporcionan:
- ✓ Visualización clara de la arquitectura
- ✓ Flujos de decisión entendibles
- ✓ Comparativa con alternativas
- ✓ Timeline realista
- ✓ Garantías de seguridad documentadas

Combinados con los otros documentos, forman una especificación técnica completa y lista para implementación.
