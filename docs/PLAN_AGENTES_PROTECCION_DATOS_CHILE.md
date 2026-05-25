# PLAN ESTRATÉGICO: AGENTES Y SKILLS EXPERTOS EN PROTECCIÓN DE DATOS Y CIBERSEGURIDAD
## Para: Syntaxis SPA - Revisión de Código y Cumplimiento Normativo en Chile

---

## 📋 ÍNDICE
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Leyes Identificadas](#leyes-identificadas)
3. [Arquitectura General](#arquitectura-general)
4. [Agentes Específicos](#agentes-específicos)
5. [Skills Requeridas](#skills-requeridas)
6. [Orquestrador Central](#orquestador-central)
7. [Servidores MCP](#servidores-mcp)
8. [Integración VS Code y GitHub](#integración-vs-code-y-github)
9. [Plan de Implementación Detallado](#plan-de-implementación-detallado)
10. [Guía de Cumplimiento Técnico](#guía-de-cumplimiento-técnico)

---

## RESUMEN EJECUTIVO

**Objetivo:** Crear un sistema de agentes inteligentes que:
- Revisen código de desarrollo en C# .NET Core, JavaScript/TypeScript
- Analicen estructuras de bases de datos (SQL Server, PostgreSQL)
- Garanticen cumplimiento con leyes chilenas de protección de datos y ciberseguridad
- Se integren en VS Code (para desarrolladores) y GitHub Actions (automatización)
- Generen informes de compliance y bloqueen merge requests si hay incumplimientos críticos

**Alcance:** La Ley 21.719 aplica a cualquier organización, pública o privada, que trate datos personales de residentes en Chile, entrando en vigencia el 1 de diciembre de 2026.

**Contexto de Syntaxis SPA:**
- Desarrollas software que queda en manos del cliente (dominio del cliente)
- Bases de datos propias para soporte (bajo tu control)
- Conexiones a bases de datos externas (sin control, sin modificación)
- Stack: .NET Core Backend, React/Vue Frontend, SQL Server/PostgreSQL

---

## LEYES IDENTIFICADAS

### 1. **LEY 21.719 - PROTECCIÓN DE DATOS PERSONALES**
**Vigencia:** 1 de diciembre de 2026 (24 meses de transición)

#### Ámbito de Aplicación:
- Exige el garantizar los derechos ARCO+P y la seguridad proactiva de la información sensible
- Aplica extraterritorialmente: si tratas datos de chilenos, aplica aunque estés en otro país
- Sanciones: hasta 20.000 UTM en infracciones gravísimas

#### Derechos ARCO+P (ARSOPB):
- **A:** Acceso - conocer qué datos se tratan, con qué finalidad y a quién se comunican
- **R:** Rectificación - solicitar la corrección de datos inexactos o incompletos
- **S:** Supresión (cancelación) - solicitar la eliminación de datos cuando ya no sean necesarios
- **O:** Oposición - oponerse al tratamiento de datos en ciertos supuestos
- **P:** Portabilidad - recibir los datos en un formato estructurado, de uso común y lectura mecánica (como CSV o JSON), y transferirlos a otro responsable del tratamiento
- **B:** Bloqueo temporal - solicitar la suspensión temporal del tratamiento mientras se resuelve una solicitud

#### Obligaciones Técnicas:
1. **Cifrado de datos** en tránsito y en reposo
2. **Evaluación de impacto (EIPD)** para tratamientos de alto riesgo
3. **Notificación de brechas** sin dilación indebida (idealmente 72 horas)
4. **Plazo de respuesta** a solicitudes ARCO+P: 30 días (prorrogable 30 más)
5. **Auditoría de consentimiento** para datos sensibles
6. **Registros de actividad** (logging completo)
7. **Acuerdos de Tratamiento de Datos (DPA)** con terceros/proveedores

#### Datos Sensibles Especialmente Protegidos:
- Datos de salud (licencias médicas)
- Afiliación sindical
- Origen étnico
- Datos biométricos
- Historial financiero/crediticio
- Datos de niños y adolescentes (requiere consentimiento parental verificable)

#### Principios Rectores:
- Licitud
- Finalidad
- Proporcionalidad
- Calidad
- Seguridad
- **Responsabilidad Proactiva (Accountability)**: No basta decir que cumples, debes probarlo

---

### 2. **LEY 21.663 - MARCO DE CIBERSEGURIDAD**
**Vigencia:** Marzo de 2025 (EN VIGOR AHORA)

#### Ámbito de Aplicación:
- Establece un marco obligatorio de gobernanza, prevención y respuesta ante incidentes para organismos públicos y empresas que prestan servicios esenciales
- Sectores afectados: Telecomunicaciones, energía, salud, transporte, banca, servicios digitales
- Syntaxis SPA desarrolla software para clientes: si esos clientes prestan servicios esenciales, la ley les aplica a ellos (y parcialmente a ti como proveedor)

#### Obligaciones Clave:
1. **Designación obligatoria de delegado de ciberseguridad** con competencias verificables
2. **Registro en ANCI** (Agencia Nacional de Ciberseguridad)
3. **Sistema de Gestión de Seguridad de la Información (SGSI)** alineado a ISO 27001 o NIST
4. **Notificación de incidentes** a ANCI en menos de 3 horas
5. **Autenticación robusta** (MFA, sin solo contraseñas débiles)
6. **Plan de continuidad operativa** actualizado
7. **Auditorías periódicas**

#### Puntos Críticos para Developers:
- **Principio de "Responsabilidad Proactiva"**: Documentar todo lo que haces
- **Estándares mínimos:** ISO 27001, NIST Cybersecurity Framework
- **Segregación de datos:** No mezclar datos críticos con datos de baja sensibilidad
- **Copias de respaldo:** Deben estar encriptadas y separadas
- **Acceso a datos sensibles:** Solo personal autorizado, con logging de cada acceso

---

### 3. **LEY 20.285 - ACCESO A LA INFORMACIÓN PÚBLICA (CONTEXTO)**
**Vigencia:** 2008 (complementaria)

- Interactúa con la 21.719 en términos de transparencia
- Si desarrollas software para el sector público, aplica
- Para Syntaxis: Relevante si los clientes son entidades públicas

---

## ARQUITECTURA GENERAL

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORQUESTRADOR PRINCIPAL                        │
│          (Agente Master - MCP Framework + GitHub Copilot)        │
│  Responsable de: Flujo, logging, decisiones, reportes finales   │
└──────────┬──────────────────────────────────────────────────────┘
           │
        ┌──┴─────────────────────────────────────────┬─────────────┐
        │                                             │             │
┌───────▼────────────┐                    ┌──────────▼──┐   ┌──────▼──────┐
│  AGENTE LEY 21.719 │                    │AGENTE LEY   │   │  AGENTE     │
│ Protección Datos   │                    │21.663       │   │ ADICIONALES │
│ (DPA - Data        │                    │Ciberseguridad│  │ (Transversal│
│  Protection Agent) │                    │(CSA)        │   │  Checks)    │
└────────┬───────────┘                    └──────┬──────┘   └─────┬──────┘
         │                                       │               │
    ┌────▼────────┐                     ┌────────▼────┐      ┌────▼────┐
    │SKILLS DPA   │                     │SKILLS CSA   │      │ SKILLS  │
    │             │                     │             │      │ TRANS   │
    └─────┬───────┘                     └────────┬────┘      └────┬────┘
          │                                      │                │
    ┌─────▼──────────────────────────────────────▼────────────────▼────┐
    │                      MCP SERVERS (READ-ONLY)                     │
    │  ┌─────────────────────┐          ┌──────────────────────┐      │
    │  │  MCP SQL SERVER     │          │  MCP PostgreSQL      │      │
    │  │  (Connection Pool)  │          │  (Connection Pool)   │      │
    │  │  - Query Analysis   │          │  - Query Analysis    │      │
    │  │  - Schema Inspect   │          │  - Schema Inspect    │      │
    │  │  - Data Classification      │  - Data Classification│      │
    │  │  - No WRITE Access  │          │  - No WRITE Access   │      │
    │  └─────────────────────┘          └──────────────────────┘      │
    └──────────────────────────────────────────────────────────────────┘
          │
          │ (Metadata only, no raw data extraction)
          │
    ┌─────▼────────────────────────────────────────────────────┐
    │   DATA CLASSIFICATION ENGINE                             │
    │   - Tipos de datos: PII, Sensible, Público, Anónimo     │
    │   - Patrones: email, DNI, teléfono, tarjeta crédito    │
    │   - Contexto: por tabla, columna, aplicación            │
    └──────────────────────────────────────────────────────────┘
```

---

## AGENTES ESPECÍFICOS

### AGENTE 1: DPA (Data Protection Agent) - Ley 21.719

**Responsabilidades:**
- Analizar tratamiento de datos personales en el código
- Verificar implementación de derechos ARCO+P
- Revisar encriptación de datos sensibles
- Validar logging y auditoria
- Verificar consentimiento para datos sensibles

**Inputs que Procesa:**
- Código fuente (.cs, .js, .ts)
- Consultas SQL / SQL statements
- Configuración de APIs
- Esquema de bases de datos
- Variables de entorno / secrets

**Outputs (Informe):**
- ✅ CUMPLE / ⚠️ ADVERTENCIA / ❌ INCUMPLIMIENTO
- Línea de código problemática
- Artículo de la ley afectado
- Recomendación de corrección

**Ejemplos de Chequeos:**

| Chequeo | Ley 21.719 | Acción |
|---------|-----------|--------|
| Datos sensibles sin cifrado en BD | Art. 18 (Seguridad) | ❌ BLOQUEA MERGE |
| GET endpoint sin autenticación en datos personales | Art. 5 (Acceso controlado) | ❌ BLOQUEA MERGE |
| No hay logging de acceso a datos PII | Art. 6 (Transparencia) | ⚠️ ADVERTENCIA |
| Contraseña en código o env file sin cifrado | Art. 18 | ❌ BLOQUEA MERGE |
| DELETE sin validar derechos de supresión | Art. 7 (Supresión) | ⚠️ ADVERTENCIA |
| Exportación sin formato estructurado (Portabilidad) | Art. 9 | ⚠️ ADVERTENCIA |
| Consentimiento no documentado en código | Art. 4 (Consentimiento) | ❌ BLOQUEA MERGE |
| Datos de menores sin consentimiento parental | Art. 10 | ❌ BLOQUEA MERGE |

---

### AGENTE 2: CSA (Cybersecurity Agent) - Ley 21.663

**Responsabilidades:**
- Verificar estándares ISO 27001 / NIST en código
- Analizar vulnerabilidades comunes (OWASP Top 10)
- Validar autenticación y autorización
- Revisar gestión de secretos
- Verificar principios de defensa en profundidad

**Inputs que Procesa:**
- Código fuente (.cs, .js, .ts)
- Configuración de infraestructura
- Dependencias y librerías
- Políticas de acceso
- Configuración de APIs

**Outputs (Informe):**
- Severidad: CRÍTICA / ALTA / MEDIA / BAJA
- Vulnerabilidad identificada
- CVSS Score (si aplica)
- Recomendación NIST/ISO 27001

**Ejemplos de Chequeos:**

| Chequeo | Ley 21.663 | Severidad |
|---------|-----------|-----------|
| SQL Injection vulnerable | NIST: SI-06 (Seguridad de BD) | CRÍTICA |
| XSS vulnerable en formularios | NIST: SI-10 (Validación) | CRÍTICA |
| No hay MFA en acceso administrativo | NIST: AC-02 (Autenticación) | ALTA |
| Credenciales en plaintext en config | NIST: SC-07 (Gestión de secretos) | CRÍTICA |
| Logging insuficiente de acciones críticas | NIST: AU-02 (Auditoría) | ALTA |
| Conexión a BD sin SSL/TLS | NIST: SC-08 (Cifrado en tránsito) | ALTA |
| Librerías desactualizadas con CVE conocidos | NIST: SI-02 (Parches) | CRÍTICA |
| No hay validación de entrada en API | NIST: SI-10 (Validación) | CRÍTICA |
| Acceso excesivo a datos (Over-privileging) | NIST: AC-06 (Principio de menor privilegio) | ALTA |
| Ausencia de rate limiting en APIs | NIST: SI-04 (Monitoreo) | MEDIA |

---

### AGENTE 3: TRANSVERSAL (Cross-Cutting Concerns Agent)

**Responsabilidades:**
- Verificar cumplimiento de ambas leyes en conjunto
- Validar documentación de compliance
- Revisar procesos de solicitudes ARCO+P
- Verificar comunicación entre equipos
- Detectar conflictos entre normativas

**Chequeos Transversales:**

| Chequeo | Leyes | Acción |
|---------|-------|--------|
| Brecha de seguridad sin plan de notificación | 21.719 + 21.663 | ⚠️ ADVERTENCIA |
| Datos de cliente sin DPA firmado | 21.719 | ❌ BLOQUEA MERGE |
| API publica exponiendo datos personales | 21.719 + 21.663 | ❌ BLOQUEA MERGE |
| Cambios en estructura de BD sin EIPD | 21.719 | ⚠️ ADVERTENCIA |
| Terceros proveedores sin verificar compliance | 21.719 + 21.663 | ⚠️ ADVERTENCIA |
| Migración de datos sin plan de seguridad | 21.719 + 21.663 | ❌ BLOQUEA MERGE |

---

## SKILLS REQUERIDAS

### SKILL 1: `sql-data-classifier.md`
**Descripción:** Clasifica datos en bases de datos SQL Server y PostgreSQL

**Funcionalidad:**
- Analiza esquemas de BD
- Identifica campos PII (email, DNI, teléfono, tarjeta crédito)
- Clasifica sensibilidad: PÚBLICA, INTERNA, CONFIDENCIAL, CRÍTICA
- Genera mapa de datos con recomendaciones de cifrado
- Detecta patrones de exposición (ej: campo de email en WHERE VISIBLE)

**Entrada:** Connectionstring, nombre de tabla, consulta SQL
**Salida:** JSON con clasificación de datos

**Respuesta a Triggers:**
- Usuario menciona "clasificar datos"
- Usuario menciona "qué datos son sensibles"
- Agente necesita understanding de datastore

---

### SKILL 2: `encryption-validation.md`
**Descripción:** Valida encriptación de datos en tránsito y en reposo

**Funcionalidad:**
- Verifica SSL/TLS en conexiones a BD
- Detecta cifrado en campos de BD
- Valida algoritmos de encriptación (AES-256, etc)
- Identifica datos sin cifrado en reposo
- Revisa configuración de certificados

**Entrada:** Código de conexión, configuración de BD, esquema
**Salida:** Reporte de encriptación

---

### SKILL 3: `authentication-authorization.md`
**Descripción:** Valida autenticación y autorización (principio de menor privilegio)

**Funcionalidad:**
- Detecta acceso sin autenticación
- Verifica MFA (Multi-Factor Authentication)
- Valida roles y permisos (RBAC)
- Detecta hardcoding de credenciales
- Revisa tokens JWT, OAuth 2.0

**Entrada:** Código de autenticación, configuración de APIs, estructura de datos de sesión
**Salida:** Reporte de autenticación/autorización

---

### SKILL 4: `logging-auditing.md`
**Descripción:** Valida logging y auditoría de acceso a datos

**Funcionalidad:**
- Verifica si hay logs de acceso a datos PII
- Valida que logs sean inmutables
- Revisa retención de logs
- Detecta acceso sin registrar
- Verifica integridad de logs (hash, firma digital)

**Entrada:** Código de logging, configuración de BD auditing, políticas de retención
**Salida:** Reporte de auditoría

---

### SKILL 5: `arco-p-implementation.md`
**Descripción:** Verifica implementación de derechos ARCO+P

**Funcionalidad:**
- Valida endpoint de Acceso (GET de propios datos)
- Verifica endpoint de Rectificación (PATCH/PUT)
- Valida endpoint de Supresión (DELETE con validaciones)
- Verifica Oposición (flag en BD para opt-out)
- Valida Portabilidad (exportar en JSON/CSV)
- Verifica Bloqueo (suspensión temporal)

**Entrada:** Código de APIs, esquema de BD, endpoints disponibles
**Salida:** Reporte de implementación ARCO+P

---

### SKILL 6: `dependency-scanning.md`
**Descripción:** Escanea librerías y dependencias con vulnerabilidades conocidas

**Funcionalidad:**
- Analiza package.json, .csproj, requirements.txt
- Busca CVE conocidos
- Detecta versiones desactualizadas
- Identifica dependencias transitivas vulnerables
- Calcula CVSS scores

**Entrada:** Archivos de dependencias, lista de librerías
**Salida:** Reporte de vulnerabilidades ordenadas por severidad

---

### SKILL 7: `code-pattern-analysis.md`
**Descripción:** Analiza patrones inseguros en código

**Funcionalidad:**
- Detecta SQL Injection
- Identifica XSS vulnerabilities
- Detecta hardcoding de secretos
- Valida validación de entrada
- Identifica over-privileging de acceso

**Entrada:** Código fuente (.cs, .js, .ts)
**Salida:** Lista de vulnerabilidades por línea

---

### SKILL 8: `consent-management.md`
**Descripción:** Valida gestión de consentimiento para datos sensibles

**Funcionalidad:**
- Verifica si hay consentimiento explícito documentado
- Valida consentimiento de menores (requiere padre/tutor)
- Verifica revocabilidad del consentimiento
- Detecta consent bypass
- Valida fecha y hora del consentimiento

**Entrada:** Código de obtención de consentimiento, registros de BD
**Salida:** Reporte de conformidad de consentimiento

---

### SKILL 9: `database-schema-review.md`
**Descripción:** Revisa esquemas de BD para compliance

**Funcionalidad:**
- Analiza estructura de tablas
- Detecta campos sensibles sin cifrado
- Valida índices (¿exponen datos?)
- Revisa vistas y stored procedures
- Detecta datos duplicados sin justificación
- Valida triggers de auditoría

**Entrada:** DDL de BD, scripts de creación
**Salida:** Reporte de problemas en esquema

---

### SKILL 10: `api-security-review.md`
**Descripción:** Revisa seguridad de APIs

**Funcionalidad:**
- Valida CORS configuration
- Detecta rate limiting ausente
- Verifica validación de entrada
- Revisa manejo de errores (info leakage)
- Detecta exposición de endpoints sensibles
- Valida versioning y deprecation

**Entrada:** OpenAPI/Swagger specs, código de endpoints
**Salida:** Reporte de seguridad de API

---

### SKILL 11: `third-party-compliance.md`
**Descripción:** Valida cumplimiento de proveedores terceros

**Funcionalidad:**
- Verifica DPA (Data Processing Agreements) firmados
- Valida que terceros cumplan Ley 21.719
- Detecta transferencias internacionales de datos
- Valida cláusulas de confidencialidad
- Revisa SLA de seguridad

**Entrada:** Lista de proveedores, archivos de DPA, configuración
**Salida:** Reporte de cumplimiento de terceros

---

## ORQUESTADOR CENTRAL

### Arquitectura del Orquestador (Master Agent)

```javascript
/orchestrator
├── index.js                          // Entry point
├── config/
│   ├── agents.config.js              // Config de agentes
│   ├── skills.config.js              // Config de skills
│   ├── mcp-servers.config.js         // Config de MCP servers
│   └── rules-engine.js               // Reglas de cumplimiento
├── agents/
│   ├── dpa-agent.js                  // Agente 21.719
│   ├── csa-agent.js                  // Agente 21.663
│   ├── transversal-agent.js          // Agente transversal
│   └── base-agent.js                 // Clase base
├── skills/
│   ├── sql-data-classifier.js
│   ├── encryption-validator.js
│   ├── auth-validator.js
│   ├── logging-validator.js
│   └── ... (más skills)
├── mcp-connectors/
│   ├── sql-server-connector.js
│   ├── postgresql-connector.js
│   └── base-connector.js
├── report-generator/
│   ├── json-report.js
│   ├── html-report.js
│   ├── markdown-report.js
│   └── github-comment.js             // Para GitHub Actions
├── integrations/
│   ├── vscode-extension.js
│   ├── github-action.js
│   ├── cli.js
│   └── api-server.js
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

### Flujo de Ejecución del Orquestador

```
1. INPUT (Código, BD, Configuración)
   ↓
2. PARSING & TOKENIZATION
   ├── Parse código (.cs, .js, .ts)
   ├── Parse BD schema
   ├── Parse configuración
   └── Parse dependencias
   ↓
3. DISPATCHER (¿Qué agentes necesito?)
   ├── ¿Toca datos personales? → DPA Agent
   ├── ¿Acceso autenticado? → DPA Agent
   ├── ¿Hay vulnerabilidades? → CSA Agent
   ├── ¿Cumple NIST? → CSA Agent
   └── ¿Conflictos entre leyes? → Transversal Agent
   ↓
4. PARALLEL EXECUTION (Agentes ejecutan en paralelo)
   │
   ├─ DPA Agent ejecuta sus skills
   │  ├─ sql-data-classifier
   │  ├─ encryption-validation
   │  ├─ arco-p-implementation
   │  ├─ consent-management
   │  └─ logging-auditing
   │
   ├─ CSA Agent ejecuta sus skills
   │  ├─ authentication-authorization
   │  ├─ dependency-scanning
   │  ├─ code-pattern-analysis
   │  ├─ api-security-review
   │  └─ database-schema-review
   │
   └─ Transversal Agent ejecuta sus skills
      ├─ third-party-compliance
      ├─ conflict-detection
      └─ documentation-validation
   ↓
5. MCP CONNECTORS (Análisis de BD en Read-Only)
   ├─ SQL Server Connector (queries de introspección)
   └─ PostgreSQL Connector (queries de introspección)
   ↓
6. DATA CLASSIFICATION ENGINE
   └─ Clasifica resultados según contexto
   ↓
7. RULES ENGINE
   ├─ Aplica reglas: ¿BLOQUEA? ¿ADVERTENCIA? ¿OK?
   └─ Prioriza incumplimientos
   ↓
8. REPORT GENERATION
   ├─ JSON report
   ├─ Markdown report
   ├─ HTML report (VS Code)
   └─ GitHub comment (GitHub Actions)
   ↓
9. OUTPUT
   ├─ Si CRÍTICA: Salida = ❌ BLOQUEA MERGE
   ├─ Si ALTA: Salida = ⚠️ REQUIERE REVISIÓN
   └─ Si OK: Salida = ✅ APROBADO
```

---

## SERVIDORES MCP

### MCP Server 1: SQL Server Connector

**Configuración:**
```json
{
  "name": "mcp-sql-server",
  "protocol": "mcp",
  "connectionPool": {
    "min": 2,
    "max": 5,
    "idleTimeout": 30000
  },
  "allowedOperations": ["DESCRIBE", "INTROSPECT", "ANALYZE"],
  "restrictedOperations": ["INSERT", "UPDATE", "DELETE", "DROP", "CREATE"],
  "auditLog": true,
  "timeout": 30000
}
```

**Operaciones Disponibles:**
- `DESCRIBE TABLE [table_name]` - Estructura de tabla
- `DESCRIBE DATABASE [db_name]` - Todas las tablas
- `INTROSPECT COLUMNS [table]` - Tipos de datos, nulabilidad
- `ANALYZE INDEXES [table]` - Índices disponibles
- `ANALYZE TRIGGERS [table]` - Triggers activos
- `LIST COMPUTED_COLUMNS [table]` - Columnas computadas

**Seguridad:**
- Connection string encriptado en environment
- No permite operaciones de escritura (READ-ONLY GUARANTEE)
- Audita cada query ejecutado
- Rate limiting: máx 100 queries/minuto por agente
- Timeout: 30 segundos máximo

**Ejemplo de Query Permitida:**
```sql
-- ✅ PERMITIDA
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_CATALOG = @database
```

**Ejemplo de Query Bloqueada:**
```sql
-- ❌ BLOQUEADA
UPDATE users SET email='hack@evil.com'; -- UPDATE no permitido
DELETE FROM logs;                        -- DELETE no permitido
DROP TABLE sensitive_data;              -- DROP no permitido
```

---

### MCP Server 2: PostgreSQL Connector

**Configuración:**
```json
{
  "name": "mcp-postgresql",
  "protocol": "mcp",
  "connectionPool": {
    "min": 2,
    "max": 5,
    "idleTimeout": 30000
  },
  "allowedOperations": ["DESCRIBE", "INTROSPECT", "ANALYZE"],
  "restrictedOperations": ["INSERT", "UPDATE", "DELETE", "DROP", "CREATE"],
  "auditLog": true,
  "timeout": 30000
}
```

**Operaciones Disponibles:**
- `SELECT * FROM information_schema.tables`
- `SELECT * FROM information_schema.columns`
- `SELECT * FROM pg_indexes`
- `SELECT * FROM pg_trigger`

**Seguridad:** (Igual a SQL Server)

---

### MCP Connection Pool y Security

```javascript
// security-boundary.js
class MCPSecurityBoundary {
  constructor(connConfig) {
    this.connPool = new ConnectionPool(connConfig);
    this.auditLog = new AuditLogger();
    this.queryValidator = new SQLQueryValidator({
      allowedKeywords: ['SELECT', 'DESC', 'SHOW'],
      blockedKeywords: ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE'],
      maxQueryLength: 5000,
      maxExecutionTime: 30000
    });
  }

  async executeQuery(query, metadata) {
    // 1. Validar query
    const validated = await this.queryValidator.validate(query);
    if (!validated.isValid) {
      throw new SecurityError('Query contains restricted operations');
    }

    // 2. Audit log
    this.auditLog.log({
      timestamp: new Date(),
      agent: metadata.agentName,
      query: query.substring(0, 500), // Truncar para seguridad
      status: 'INITIATED'
    });

    // 3. Ejecutar con timeout
    const result = await Promise.race([
      this.connPool.query(query),
      this.createTimeout(30000)
    ]);

    // 4. Audit log resultado
    this.auditLog.log({
      agent: metadata.agentName,
      rowsReturned: result.rowCount,
      status: 'SUCCESS'
    });

    return result;
  }

  createTimeout(ms) {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), ms)
    );
  }
}
```

---

## INTEGRACIÓN VS CODE Y GITHUB

### Integración VS Code

**Extension: `syntaxis-compliance-checker`**

```json
{
  "name": "syntaxis-compliance-checker",
  "displayName": "Syntaxis Compliance Checker",
  "version": "1.0.0",
  "description": "Revisa código contra Leyes 21.719 y 21.663 en tiempo real",
  "activationEvents": [
    "onStartupFinished",
    "onLanguage:csharp",
    "onLanguage:javascript",
    "onLanguage:typescript"
  ],
  "contributes": {
    "commands": [
      {
        "command": "syntaxis.checkFile",
        "title": "Syntaxis: Revisar archivo actual"
      },
      {
        "command": "syntaxis.checkWorkspace",
        "title": "Syntaxis: Revisar workspace completo"
      },
      {
        "command": "syntaxis.analyzeDatabase",
        "title": "Syntaxis: Analizar BD conectada"
      },
      {
        "command": "syntaxis.generateReport",
        "title": "Syntaxis: Generar reporte de compliance"
      }
    ]
  }
}
```

**Características:**
- Análisis en tiempo real mientras escribes (linting)
- Hover tooltips con explicaciones
- Code actions / quick fixes
- Side panel con reportes
- Integración con problemas de VS Code
- Historial de checks

**Salida en VS Code:**
```
/path/to/file.cs:45:10 ❌ CRÍTICO
Datos personales (email) sin cifrado en BD
  Artículo: Ley 21.719 Art. 18 (Seguridad)
  Acción: Implementar cifrado AES-256 en campo 'email'
  Documentación: https://...

Quick Fix:
[ ] Aplicar cifrado automáticamente
```

---

### Integración GitHub Actions

**Workflow: `.github/workflows/compliance-check.yml`**

```yaml
name: Compliance Check (Ley 21.719 y 21.663)

on:
  pull_request:
    types: [opened, synchronize, reopened]
    paths:
      - '**.cs'
      - '**.js'
      - '**.ts'
      - '**.sql'
      - '**/appsettings.json'
      - '**/package.json'

jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Para análisis de diff

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Syntaxis Compliance Checker
        run: npm install -g @syntaxis/compliance-checker

      - name: Get changed files
        id: files
        run: |
          echo "changed=$(git diff --name-only origin/main HEAD | tr '\n' ',')" >> $GITHUB_OUTPUT

      - name: Run Compliance Check
        id: check
        run: |
          syntaxis-check \
            --files "${{ steps.files.outputs.changed }}" \
            --database-url "${{ secrets.DATABASE_URL }}" \
            --format json \
            --output compliance-report.json
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Parse Results
        id: parse
        run: node scripts/parse-compliance.js compliance-report.json

      - name: Comment on PR (if issues found)
        if: steps.parse.outputs.hasIssues == 'true'
        uses: actions/github-script@v6
        with:
          script: |
            const report = require('./compliance-report.json');
            const critical = report.issues.filter(i => i.severity === 'CRÍTICA').length;
            const high = report.issues.filter(i => i.severity === 'ALTA').length;
            
            const comment = `
            ## 🔍 Compliance Check Report
            
            **Critical Issues:** ${critical}
            **High Issues:** ${high}
            
            ${critical > 0 ? '❌ **MERGE BLOQUEADO**' : '✅ Proceder con revisión manual'}
            
            [Ver reporte completo](https://...)
            `;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });

      - name: Block PR if critical issues
        if: steps.parse.outputs.criticalCount > 0
        run: exit 1

      - name: Upload Report Artifact
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: compliance-report
          path: compliance-report.json
```

---

## PLAN DE IMPLEMENTACIÓN DETALLADO

### FASE 1: INVESTIGACIÓN Y SETUP (Semana 1-2)
- [x] Investigar Leyes 21.719 y 21.663 (COMPLETADO)
- [ ] Crear estructura de directorios del proyecto
- [ ] Configurar repositorio GitHub con seguridad
- [ ] Establecer CI/CD básico
- [ ] Setup de testing framework

**Deliverable:** Estructura base del proyecto + README

---

### FASE 2: DESARROLLO DE SKILLS (Semana 3-6)
- [ ] Skill 1: `sql-data-classifier.md`
- [ ] Skill 2: `encryption-validation.md`
- [ ] Skill 3: `authentication-authorization.md`
- [ ] Skill 4: `logging-auditing.md`
- [ ] Skill 5: `arco-p-implementation.md`
- [ ] Skill 6: `dependency-scanning.md`
- [ ] Skill 7: `code-pattern-analysis.md`
- [ ] Skill 8: `consent-management.md`
- [ ] Skill 9: `database-schema-review.md`
- [ ] Skill 10: `api-security-review.md`
- [ ] Skill 11: `third-party-compliance.md`

**Deliverable:** Todas las skills documentadas y con tests unitarios

---

### FASE 3: DESARROLLO DE AGENTES (Semana 7-10)
- [ ] Base Agent (clase abstracta)
- [ ] DPA Agent (Ley 21.719)
- [ ] CSA Agent (Ley 21.663)
- [ ] Transversal Agent
- [ ] Orquestrador Central

**Deliverable:** Agentes integrando skills con orquestación

---

### FASE 4: MCP CONNECTORS (Semana 11-12)
- [ ] SQL Server MCP Connector
- [ ] PostgreSQL MCP Connector
- [ ] Security boundary layer
- [ ] Connection pooling
- [ ] Auditing

**Deliverable:** MCPs operacionales, read-only, auditados

---

### FASE 5: REPORT GENERATORS (Semana 13-14)
- [ ] JSON Report Generator
- [ ] Markdown Report Generator
- [ ] HTML Report Generator
- [ ] GitHub Comment Generator
- [ ] Executive Summary

**Deliverable:** Reportes en múltiples formatos

---

### FASE 6: INTEGRACIONES (Semana 15-18)
- [ ] VS Code Extension (`syntaxis-compliance-checker`)
- [ ] GitHub Action (`.github/workflows/compliance-check.yml`)
- [ ] CLI tool
- [ ] REST API server
- [ ] Logging centralizado

**Deliverable:** Extensión VS Code + GitHub Action operacionales

---

### FASE 7: TESTING Y QA (Semana 19-22)
- [ ] Unit tests (skills)
- [ ] Integration tests (agentes)
- [ ] E2E tests (VS Code + GitHub)
- [ ] Security audit
- [ ] Load testing

**Deliverable:** Cobertura >80%, todos los tests pasando

---

### FASE 8: DOCUMENTACIÓN Y CAPACITACIÓN (Semana 23-24)
- [ ] Technical documentation
- [ ] User guide (desarrolladores)
- [ ] Admin guide (DevOps)
- [ ] Troubleshooting guide
- [ ] Video tutorials
- [ ] Capacitación del equipo

**Deliverable:** Documentación completa + capacitación realizada

---

## GUÍA DE CUMPLIMIENTO TÉCNICO

### Para Desarrolladores en Syntaxis SPA

#### ✅ BUENAS PRÁCTICAS - Ley 21.719

**Buen Ejemplo 1: Cifrado de datos sensibles en C# .NET**
```csharp
using System.Security.Cryptography;

public class UserRepository 
{
    // ✅ CORRECTO: Datos sensibles cifrados en reposo
    public async Task<User> CreateUserAsync(string email, string password)
    {
        var encryptedEmail = AesEncryption.Encrypt(email, _encryptionKey);
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword(password);
        
        var user = new User 
        {
            EmailEncrypted = encryptedEmail,  // Cifrado
            PasswordHash = hashedPassword,      // Hash (no reversible)
            CreatedAt = DateTime.UtcNow,
            ConsentDate = DateTime.UtcNow,     // Documentar consentimiento
            ConsentVersion = "2.1"             // Versión de política
        };
        
        await _context.Users.AddAsync(user);
        
        // ✅ Log de acceso
        _auditLogger.Log(new AuditEntry 
        {
            Action = "USER_CREATED",
            UserId = null,
            Email = "system",
            Timestamp = DateTime.UtcNow,
            DataClassification = "CRÍTICA"
        });
        
        return user;
    }
}
```

**Buen Ejemplo 2: Implementar derechos ARCO+P en API**
```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UserDataController : ControllerBase
{
    // ✅ ACCESO: Usuario puede descargar sus datos
    [HttpGet("export/{userId}")]
    public async Task<IActionResult> ExportUserData(string userId)
    {
        // Validar que el usuario accede SUS datos
        if (userId != User.FindFirst(ClaimTypes.NameIdentifier)?.Value)
        {
            return Forbid("No tienes permiso para acceder a estos datos");
        }
        
        var user = await _userRepository.GetByIdAsync(userId);
        var userData = new 
        {
            user.Email,  // Decifrar antes de retornar
            user.Name,
            user.Phone,
            CreatedAt = user.CreatedAt,
            ConsentHistory = user.ConsentHistory
        };
        
        // ✅ Portabilidad: Formato estructurado
        var json = JsonConvert.SerializeObject(userData);
        
        // ✅ Log de acceso
        _auditLogger.Log(new AuditEntry 
        {
            Action = "DATA_ACCESS_REQUEST",
            UserId = userId,
            DataType = "USER_DATA",
            TimestampRequested = DateTime.UtcNow
        });
        
        return Ok(new { data = json, format = "json" });
    }
    
    // ✅ RECTIFICACIÓN: Usuario puede corregir datos
    [HttpPut("update/{userId}")]
    public async Task<IActionResult> UpdateUserData(string userId, UserUpdateDto dto)
    {
        if (userId != User.FindFirst(ClaimTypes.NameIdentifier)?.Value)
            return Forbid();
        
        var user = await _userRepository.GetByIdAsync(userId);
        
        if (!string.IsNullOrEmpty(dto.Email) && dto.Email != user.Email)
        {
            user.Email = AesEncryption.Encrypt(dto.Email, _key);
            user.UpdatedAt = DateTime.UtcNow;
        }
        
        await _context.SaveChangesAsync();
        
        // ✅ Log
        _auditLogger.Log(new AuditEntry 
        {
            Action = "DATA_RECTIFICATION",
            UserId = userId,
            ChangedFields = "email",
            Timestamp = DateTime.UtcNow
        });
        
        return Ok("Datos actualizados");
    }
    
    // ✅ SUPRESIÓN: Usuario puede solicitar eliminación
    [HttpDelete("delete/{userId}")]
    public async Task<IActionResult> DeleteUserData(string userId)
    {
        if (userId != User.FindFirst(ClaimTypes.NameIdentifier)?.Value)
            return Forbid();
        
        var user = await _userRepository.GetByIdAsync(userId);
        
        // ✅ Eliminar en BD principal
        _context.Users.Remove(user);
        
        // ✅ Eliminar en respaldos (importante!)
        await _backupService.DeleteUserFromBackupsAsync(userId);
        
        // ✅ Notificar a terceros que tienen datos
        await _thirdPartyService.RequestDataDeletionAsync(userId);
        
        await _context.SaveChangesAsync();
        
        // ✅ Log inmutable
        _auditLogger.Log(new AuditEntry 
        {
            Action = "DATA_DELETION_REQUESTED",
            UserId = userId,
            Timestamp = DateTime.UtcNow,
            Status = "COMPLETED"
        });
        
        return Ok("Solicitud de supresión procesada");
    }
}
```

**Buen Ejemplo 3: Validación de consentimiento**
```csharp
public class ConsentService
{
    // ✅ CONSENTIMIENTO: Documentar y validar
    public async Task<bool> ValidateConsentAsync(string userId, string dataType)
    {
        var consent = await _context.Consents
            .Where(c => c.UserId == userId && c.DataType == dataType)
            .OrderByDescending(c => c.DateGiven)
            .FirstOrDefaultAsync();
        
        if (consent == null || !consent.IsActive || consent.RevokedAt != null)
        {
            throw new ConsentMissingException(
                $"Usuario {userId} no ha consentido tratamiento de {dataType}"
            );
        }
        
        // Para menores: requiere consentimiento parental
        var user = await _userRepository.GetByIdAsync(userId);
        if (user.DateOfBirth > DateTime.Now.AddYears(-18))
        {
            if (!consent.IsParentalConsent)
            {
                throw new ConsentMissingException(
                    "Menor de edad requiere consentimiento parental"
                );
            }
        }
        
        return true;
    }
}
```

#### ✅ BUENAS PRÁCTICAS - Ley 21.663

**Buen Ejemplo 1: Autenticación robusta**
```csharp
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    // ✅ MFA: Autenticación Multi-Factor
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email);
        
        // ✅ Verificar contraseña
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            _auditLogger.LogFailedLogin(request.Email, "Invalid password");
            return Unauthorized();
        }
        
        // ✅ Generar OTP (One-Time Password) para MFA
        var otpCode = _otpGenerator.Generate();
        user.OtpCode = otpCode;
        user.OtpExpiresAt = DateTime.UtcNow.AddMinutes(5);
        await _context.SaveChangesAsync();
        
        // ✅ Enviar OTP por email
        await _emailService.SendOtpAsync(user.Email, otpCode);
        
        return Ok(new { message = "OTP enviado a tu email" });
    }
    
    // ✅ Validar OTP
    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp(VerifyOtpRequest request)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email);
        
        if (user.OtpCode != request.OtpCode || user.OtpExpiresAt < DateTime.UtcNow)
        {
            return Unauthorized("OTP inválido o expirado");
        }
        
        user.OtpCode = null;
        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        
        // ✅ Generar JWT seguro
        var token = _tokenService.GenerateToken(user, TimeSpan.FromHours(1));
        
        // ✅ Log de login exitoso
        _auditLogger.Log(new AuditEntry 
        {
            Action = "LOGIN_SUCCESS",
            UserId = user.Id,
            IpAddress = HttpContext.Connection.RemoteIpAddress.ToString(),
            Timestamp = DateTime.UtcNow
        });
        
        return Ok(new { token });
    }
}
```

**Buen Ejemplo 2: Principio de menor privilegio**
```csharp
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    // ✅ Solo admins pueden ver datos sensibles
    [HttpGet("users/{userId}/audit-log")]
    public async Task<IActionResult> GetUserAuditLog(string userId)
    {
        // Verificar que el usuario es admin
        var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
        if (userRole != "Admin")
        {
            return Forbid();
        }
        
        var auditLog = await _auditLogger.GetByUserIdAsync(userId);
        
        // ✅ Log que un admin accedió datos sensibles
        _auditLogger.Log(new AuditEntry 
        {
            Action = "ADMIN_ACCESSED_AUDIT_LOG",
            AdminId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
            TargetUserId = userId,
            Timestamp = DateTime.UtcNow,
            DataClassification = "CRÍTICA"
        });
        
        return Ok(auditLog);
    }
}
```

**Buen Ejemplo 3: SQL Injection Prevention**
```javascript
// ✅ INCORRECTO: Vulnerable a SQL Injection
async function getUserByEmail_BAD(email) {
  const query = `SELECT * FROM users WHERE email = '${email}'`;
  return await db.query(query);
}

// ✅ CORRECTO: Usar parameterized queries
async function getUserByEmail_GOOD(email) {
  const query = `SELECT * FROM users WHERE email = @email`;
  return await db.query(query, { email });
}

// ✅ CORRECTO: Con ORM (Entity Framework, TypeORM)
async function getUserByEmail_BEST(email) {
  return await userRepository.findOne({ 
    where: { email } 
  });
}
```

---

### Checklist Pre-Deployment

Antes de cada merge a `main`:

```bash
□ Todo código revisado contra Ley 21.719 (DPA)
□ Todo código revisado contra Ley 21.663 (CSA)
□ Datos sensibles cifrados en tránsito (HTTPS/TLS)
□ Datos sensibles cifrados en reposo (AES-256)
□ Autenticación implementada (MFA recomendado)
□ Logging implementado para acceso a datos
□ Validación de entrada en 100% de endpoints
□ No hay credenciales en código
□ Dependencias actualizadas (sin CVE críticos)
□ SQL Injection/XSS/CSRF mitigados
□ Consentimiento documentado para datos sensibles
□ DPA firmados con terceros
□ Tests de seguridad pasando
□ Reporte de compliance APROBADO
```

---

## CONCLUSIÓN

Este plan proporciona una arquitectura completa para:

1. **Cumplimiento legal** con Leyes 21.719 y 21.663 en Chile
2. **Automatización** de revisión de código mediante agentes
3. **Integración** en flujo de trabajo del desarrollador (VS Code + GitHub)
4. **Escalabilidad** con arquitectura modular de agentes y skills
5. **Seguridad** mediante MCP connectors read-only auditados

El siguiente paso es comenzar la **Fase 1** con la estructura del proyecto y los primeros tests unitarios.

---

## CONTACTO Y PRÓXIMOS PASOS

Para consultas sobre implementación:
- Revisar este documento completo
- Crear issues en GitHub para cada agente/skill
- Usar GitHub Projects para tracking
- Configurar reuniones de arquitectura semanales

**Fecha estimada de first release:** 24 semanas desde inicio
**Equipo recomendado:** 3-4 desarrolladores + 1 security engineer
