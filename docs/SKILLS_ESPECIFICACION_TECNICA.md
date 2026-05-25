# ESPECIFICACIÓN TÉCNICA DETALLADA - SKILLS
## Sistema de Agentes para Cumplimiento Ley 21.719 y 21.663

---

## SKILL 1: `sql-data-classifier`

### Propósito
Analizar esquemas de bases de datos SQL Server y PostgreSQL para identificar, clasificar y catalogar datos personales, sensibles y de riesgo.

### Trigger (Cuándo Activarse)
```javascript
const shouldActivate = (context) => {
  return context.hasDatabaseSchema || 
         context.analyzesDatabaseTables || 
         context.reviewsSQLQueries || 
         context.addsNewDatabaseFields;
};
```

### Input

#### Input 1: Esquema de Base de Datos
```sql
-- DDL de creación de tabla
CREATE TABLE Users (
  UserId INT PRIMARY KEY IDENTITY(1,1),
  Email NVARCHAR(255) NOT NULL,           -- PII
  Phone NVARCHAR(20),                     -- PII
  SSN NVARCHAR(11),                       -- CRÍTICO (DNI)
  DateOfBirth DATE,                        -- SENSIBLE
  SalaryAmount DECIMAL(10,2),             -- CONFIDENCIAL
  HealthData NVARCHAR(MAX),               -- SENSIBLE (Health)
  PublicProfile NVARCHAR(MAX),            -- PÚBLICO
  CreatedAt DATETIME DEFAULT GETDATE()
);
```

#### Input 2: Consultas SQL a Analizar
```sql
SELECT Email, Phone FROM Users WHERE UserId = 1;  -- Exponiendo PII
SELECT * FROM Users WHERE Email LIKE '%gmail%';    -- Query con PII
```

#### Input 3: Código que Accede BD
```csharp
public class UserService {
  public string GetUserEmail(int userId) {
    // ⚠️ Devuelve email sin encriptación
    return _db.Query<string>(
      "SELECT Email FROM Users WHERE UserId = @id",
      new { id = userId }
    ).FirstOrDefault();
  }
}
```

### Processing Logic

```javascript
class DataClassifierSkill {
  async analyze(input) {
    // 1. PATTERN MATCHING - Identificar campos con datos sensibles
    const sensitivePatterns = {
      PII: [
        /email/i,
        /phone/i,
        /telephone/i,
        /telefónico/i,
        /mobile/i,
        /celular/i
      ],
      IDENTITY: [
        /ssn/i,
        /rut/i,
        /dni/i,
        /passport/i,
        /id_number/i
      ],
      FINANCIAL: [
        /salary/i,
        /income/i,
        /credit_card/i,
        /account_number/i,
        /bank/i
      ],
      HEALTH: [
        /health/i,
        /medical/i,
        /diagnosis/i,
        /condition/i,
        /treatment/i,
        /medication/i
      ],
      SENSITIVE_SOCIAL: [
        /religion/i,
        /ethnicity/i,
        /race/i,
        /union/i,
        /political/i
      ]
    };

    // 2. DATA TYPE ANALYSIS - Inferir tipos de datos
    const columnInfo = {
      name: 'Email',
      dataType: 'NVARCHAR(255)',
      maxLength: 255,
      isNullable: false,
      hasIndex: true,
      isEncrypted: false,
      isMasked: false
    };

    // 3. CONTEXT ANALYSIS - Entender cómo se usa
    const usageContext = {
      isExposedInAPI: true,
      isFilterField: true,      // Usado en WHERE
      isInResultSet: true,
      isLogged: false,
      isEncryptedInTransit: false
    };

    // 4. CLASSIFY
    return {
      field: 'Email',
      classification: 'CONFIDENCIAL',
      riskLevel: 'ALTO',
      sensitivityScore: 8.5,  // 0-10
      reasons: [
        'Matches PII pattern',
        'Not encrypted in database',
        'Exposed in API response',
        'Used as filter (exposed in WHERE)'
      ],
      recommendations: [
        'Encrypt in database (AES-256)',
        'Hash or mask in API responses',
        'Use parameter binding in queries'
      ]
    };
  }
}
```

### Output

```json
{
  "databaseAnalysis": {
    "database": "CompanyDB",
    "totalTables": 45,
    "analyzedTables": 45,
    "timestamp": "2026-05-25T10:30:00Z"
  },
  "dataClassification": [
    {
      "table": "Users",
      "column": "Email",
      "classification": "CONFIDENCIAL",
      "sensitivityScore": 8.5,
      "riskFactors": [
        "PII - Personal Identifier",
        "Not Encrypted",
        "API Exposed",
        "Used in WHERE clauses"
      ],
      "complianceStatus": "NO CUMPLE - Ley 21.719 Art. 18",
      "requiredActions": [
        "Implement AES-256 encryption at rest",
        "Use parameterized queries",
        "Audit query access in logs",
        "Consider hashing in responses"
      ],
      "severity": "CRÍTICA"
    },
    {
      "table": "Users",
      "column": "DateOfBirth",
      "classification": "SENSIBLE",
      "sensitivityScore": 6.0,
      "riskFactors": ["Age inference possible", "Not strictly regulated but personal"],
      "complianceStatus": "ADVERTENCIA - Considerar cifrado",
      "severity": "MEDIA"
    },
    {
      "table": "Users",
      "column": "PublicProfile",
      "classification": "PÚBLICO",
      "sensitivityScore": 1.0,
      "riskFactors": [],
      "complianceStatus": "OK",
      "severity": "BAJA"
    }
  ],
  "dataFlowAnalysis": {
    "exposedEndpoints": [
      {
        "method": "GET /api/users/{id}",
        "exposesFields": ["Email", "Phone", "DateOfBirth"],
        "recommendation": "Require authentication; mask or encrypt sensitive fields"
      }
    ],
    "loggedData": [
      {
        "logLocation": "Application.log",
        "exposedData": ["Email", "Phone"],
        "recommendation": "Remove PII from logs or encrypt"
      }
    ]
  },
  "dataCategory": {
    "totalFields": 150,
    "byClassification": {
      "CRÍTICA": 5,
      "CONFIDENCIAL": 12,
      "SENSIBLE": 25,
      "INTERNA": 50,
      "PÚBLICO": 58
    }
  },
  "overallComplianceScore": 45,  // 0-100, 100 is full compliance
  "requiredActions": [
    {
      "priority": "CRÍTICA",
      "action": "Encrypt Email field in Users table",
      "law": "Ley 21.719 Art. 18 (Seguridad)",
      "estimatedEffort": "4 horas"
    }
  ]
}
```

---

## SKILL 2: `encryption-validation`

### Propósito
Validar que todos los datos sensibles están encriptados en tránsito (TLS) y en reposo (AES-256, etc).

### Trigger
```javascript
const shouldActivate = (context) => {
  return context.hasSensitiveData || 
         context.connectsToDatabase ||
         context.makeHTTPCalls ||
         context.handlesPayments;
};
```

### Input

#### Input 1: Código de conexión a BD
```csharp
// ❌ INCORRECTO: Conexión sin encriptación
using (SqlConnection conn = new SqlConnection(
  "Server=myserver.database.windows.net;Database=mydb;User Id=sa;Password=pass123"))
{
  // Conexión sin cifrado
}

// ✅ CORRECTO: Conexión con encriptación
using (SqlConnection conn = new SqlConnection(
  "Server=myserver.database.windows.net;Database=mydb;User Id=sa;Password=pass123;Encrypt=true;TrustServerCertificate=false"))
{
  // Conexión cifrada con validación de certificado
}
```

#### Input 2: Configuración de BD
```json
{
  "sqlServerConfig": {
    "encryption": "TLS",
    "encryptionLevel": "full",
    "certificateValidation": true
  },
  "postgresConfig": {
    "ssl": true,
    "sslmode": "require"
  }
}
```

#### Input 3: Código de cifrado/descifrado
```csharp
using System.Security.Cryptography;

public class EncryptionService {
  private readonly byte[] _key = Encoding.UTF8.GetBytes("MyWeakKey123");  // ❌ Débil
  
  public string Encrypt(string plainText) {
    using (var aes = Aes.Create()) {
      aes.KeySize = 128;  // ❌ Debería ser 256
      // ...
    }
  }
}

// ✅ CORRECTO
public class SecureEncryptionService {
  private readonly byte[] _key;  // 32 bytes para AES-256
  
  public SecureEncryptionService(string encryptionKeyBase64) {
    _key = Convert.FromBase64String(encryptionKeyBase64);
    if (_key.Length != 32) throw new ArgumentException("Key must be 256-bit");
  }
  
  public string Encrypt(string plainText) {
    using (var aes = Aes.Create()) {
      aes.KeySize = 256;  // ✅ AES-256
      aes.Mode = CipherMode.CBC;
      aes.Padding = PaddingMode.PKCS7;
      
      using (var iv = RandomNumberGenerator.GetBytes(aes.IV.Length)) {
        // ...
      }
    }
  }
}
```

#### Input 4: API HTTPS Configuration
```csharp
// ❌ INCORRECTO
app.MapPost("/api/users", handler); // Sin HTTPS enforcement

// ✅ CORRECTO
app.UseHttpsRedirection();
app.UseHsts();  // HTTP Strict Transport Security

app.MapPost("/api/sensitive", handler)
  .RequireAuthorization()
  .WithOpenApi();
```

### Processing Logic

```javascript
class EncryptionValidatorSkill {
  async validate(input) {
    const findings = [];

    // 1. TRANSPORTE (TLS/HTTPS)
    if (!input.usesHTTPS) {
      findings.push({
        type: 'TRANSPORT_ENCRYPTION',
        issue: 'API endpoint does not enforce HTTPS',
        severity: 'CRÍTICA',
        law: 'Ley 21.719 Art. 18',
        recommendation: 'Add UseHttpsRedirection() and HSTS'
      });
    }

    // 2. REPOSO (AES en BD)
    if (input.sensitiveFields.some(f => !f.isEncrypted)) {
      findings.push({
        type: 'AT_REST_ENCRYPTION',
        field: input.sensitiveFields.find(f => !f.isEncrypted).name,
        issue: 'Sensitive data not encrypted in database',
        severity: 'CRÍTICA',
        recommendation: 'Enable Transparent Data Encryption (TDE) or encrypt at application level'
      });
    }

    // 3. ALGORITMO DE ENCRIPTACIÓN
    const weakAlgorithms = ['DES', 'MD5', 'SHA1', 'RC4'];
    if (weakAlgorithms.includes(input.encryptionAlgorithm)) {
      findings.push({
        type: 'WEAK_ALGORITHM',
        algorithm: input.encryptionAlgorithm,
        issue: 'Using outdated encryption algorithm',
        severity: 'CRÍTICA',
        recommendation: 'Use AES-256 with CBC mode and PKCS7 padding'
      });
    }

    // 4. KEY MANAGEMENT
    if (input.encryptionKeyInSourceCode) {
      findings.push({
        type: 'KEY_EXPOSURE',
        issue: 'Encryption key exposed in source code',
        severity: 'CRÍTICA',
        recommendation: 'Store encryption key in Azure Key Vault or AWS Secrets Manager'
      });
    }

    // 5. CERTIFICADOS SSL
    if (input.certificateExpiration < 30) {
      findings.push({
        type: 'CERTIFICATE_EXPIRING',
        issue: `SSL Certificate expires in ${input.certificateExpiration} days`,
        severity: 'ALTA',
        recommendation: 'Renew SSL certificate before expiration'
      });
    }

    return findings;
  }
}
```

### Output

```json
{
  "encryptionValidation": {
    "timestamp": "2026-05-25T10:35:00Z",
    "analysisScope": "Complete Application"
  },
  "transportEncryption": {
    "status": "CRÍTICA",
    "findings": [
      {
        "endpoint": "/api/users",
        "protocol": "HTTP",
        "issue": "No HTTPS enforcement",
        "severity": "CRÍTICA",
        "recommendation": "Implement HTTPS and HSTS headers"
      }
    ]
  },
  "atRestEncryption": {
    "status": "CRÍTICA",
    "databaseEncryption": {
      "enabled": false,
      "recommendation": "Enable Transparent Data Encryption (TDE) in SQL Server"
    },
    "fieldLevelEncryption": {
      "totalSensitiveFields": 15,
      "encryptedFields": 3,
      "unencryptedFields": 12,
      "unencryptedList": ["Email", "Phone", "SSN", "HealthData", "..."],
      "recommendation": "Encrypt all sensitive fields using AES-256"
    }
  },
  "encryptionAlgorithms": {
    "status": "CUMPLE",
    "usedAlgorithms": [
      {
        "algorithm": "AES-256",
        "usage": "Field-level encryption",
        "keySize": 256,
        "mode": "CBC",
        "padding": "PKCS7",
        "status": "✅ OK"
      },
      {
        "algorithm": "SHA-256",
        "usage": "Password hashing",
        "status": "✅ OK"
      }
    ]
  },
  "keyManagement": {
    "status": "ADVERTENCIA",
    "findings": [
      {
        "keyLocation": "appsettings.json",
        "issue": "Encryption key stored in configuration file",
        "severity": "CRÍTICA",
        "recommendation": "Move to Azure Key Vault or environment variables"
      }
    ]
  },
  "certificateValidation": {
    "mainCertificate": {
      "issuer": "DigiCert",
      "expiresAt": "2026-08-15",
      "daysUntilExpiration": 82,
      "status": "✅ VÁLIDO",
      "recommendation": "Plan renewal 30 days in advance"
    }
  },
  "overallStatus": "INCUMPLE",
  "criticalIssues": 3,
  "estimatedFixTime": "16 horas"
}
```

---

## SKILL 3: `authentication-authorization`

### Propósito
Validar que autenticación y autorización están correctamente implementadas siguiendo principio de menor privilegio (NIST AC-06).

### Trigger
```javascript
const shouldActivate = (context) => {
  return context.hasAuthenticationCode ||
         context.protectedEndpoints ||
         context.accessSensitiveData ||
         context.implementsRBAC;
};
```

### Input

```csharp
// ❌ INCORRECTO: Sin autenticación
[HttpGet("users/{id}")]
public IActionResult GetUser(int id) {
  return Ok(_db.Users.Find(id));  // Cualquiera puede acceder
}

// ✅ CORRECTO: Con autenticación y autorización
[HttpGet("users/{id}")]
[Authorize(Roles = "Admin, Manager")]
public IActionResult GetUser(int id) {
  var currentUser = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
  
  // Validar que el usuario accede SUS datos o es admin
  if (id != int.Parse(currentUser) && !User.IsInRole("Admin")) {
    return Forbid();
  }
  
  return Ok(_db.Users.Find(id));
}
```

### Processing Logic

```javascript
class AuthenticationAuthorizationSkill {
  async validate(input) {
    const findings = [];

    // 1. AUTENTICACIÓN PRESENTE
    if (!input.hasAuthentication) {
      findings.push({
        endpoint: input.endpoint,
        issue: 'No authentication mechanism',
        severity: 'CRÍTICA',
        recommendation: 'Add [Authorize] attribute or authentication middleware'
      });
    }

    // 2. AUTENTICACIÓN FUERTE
    if (input.authenticationMethod === 'BASIC_AUTH') {
      findings.push({
        issue: 'Using HTTP Basic Authentication (insecure)',
        severity: 'ALTA',
        recommendation: 'Use OAuth 2.0, OpenID Connect, or JWT'
      });
    }

    // 3. MFA VALIDATION
    if (input.accessesSensitiveData && !input.hasMFA) {
      findings.push({
        issue: 'No Multi-Factor Authentication for sensitive data access',
        severity: 'ALTA',
        recommendation: 'Implement MFA (TOTP, SMS, Email)'
      });
    }

    // 4. MENOR PRIVILEGIO
    if (input.rolesWithAdminAccess.length === 0) {
      findings.push({
        issue: 'No role-based access control defined',
        severity: 'CRÍTICA',
        recommendation: 'Implement RBAC with specific roles and permissions'
      });
    }

    // 5. TOKEN EXPIRATION
    if (input.tokenExpirationTime > 86400000) {  // > 24 horas
      findings.push({
        issue: `JWT token expires in ${input.tokenExpirationTime / 3600000} hours (should be < 1 hour)`,
        severity: 'ALTA',
        recommendation: 'Implement token rotation with refresh tokens'
      });
    }

    // 6. CREDENTIAL HARDCODING
    if (input.hasHardcodedCredentials) {
      findings.push({
        issue: 'Credentials found in source code',
        severity: 'CRÍTICA',
        recommendation: 'Remove and store in environment variables or Key Vault'
      });
    }

    return findings;
  }
}
```

### Output

```json
{
  "authenticationValidation": {
    "status": "INCUMPLE",
    "findings": [
      {
        "endpoint": "GET /api/users",
        "issue": "No authentication required",
        "severity": "CRÍTICA",
        "law": "Ley 21.663 NIST AC-02",
        "recommendation": "Add [Authorize] attribute"
      }
    ]
  },
  "authenticationMechanism": {
    "method": "JWT",
    "algorithm": "HS256",
    "status": "⚠️ ADVERTENCIA",
    "recommendation": "Consider RS256 (asymmetric) for better security"
  },
  "mfaStatus": {
    "implementado": false,
    "recommendation": "Implement MFA for admin and sensitive data access",
    "severity": "ALTA"
  },
  "rbacAnalysis": {
    "rolesDefinidas": ["User", "Manager", "Admin"],
    "minimoPrincipioImplementado": true,
    "overPrivilegedRoles": [
      {
        "role": "Manager",
        "permissions": ["READ", "WRITE", "DELETE"],
        "shouldHave": ["READ", "WRITE"],
        "recommendation": "Remove DELETE permission"
      }
    ]
  },
  "tokenManagement": {
    "expirationTime": "8 horas",
    "refreshTokenImplementado": true,
    "status": "✅ OK"
  },
  "credentialHandling": {
    "hardcodedCredentialsFound": false,
    "credentialsInEnvironment": true,
    "credentialsInKeyVault": false,
    "recommendation": "Move critical secrets to Azure Key Vault"
  },
  "overallStatus": "INCUMPLE",
  "criticalIssues": 1
}
```

---

## SKILL 4: `logging-auditing`

### Propósito
Validar que todos los accesos a datos sensibles son registrados de forma inmutable y auditable.

### Trigger
```javascript
const shouldActivate = (context) => {
  return context.accessesSensitiveData ||
         context.hasDatabaseAccess ||
         context.makesFinancialTransactions ||
         context.modifiesUserData;
};
```

### Input

```csharp
// ❌ INCORRECTO: Sin logging
public async Task<User> UpdateUserAsync(int userId, UserUpdateDto dto) {
  var user = await _db.Users.FindAsync(userId);
  user.Email = dto.Email;
  user.Phone = dto.Phone;
  await _db.SaveChangesAsync();  // No hay registro de cambio
  return user;
}

// ✅ CORRECTO: Con logging
public async Task<User> UpdateUserAsync(int userId, UserUpdateDto dto) {
  var user = await _db.Users.FindAsync(userId);
  
  // Log antes del cambio
  await _auditLogger.LogAsync(new AuditLog {
    Action = "USER_UPDATE_INITIATED",
    UserId = user.Id,
    AdminId = CurrentUser.Id,
    ChangedFields = "Email, Phone",
    OldValues = new { user.Email, user.Phone },
    NewValues = new { dto.Email, dto.Phone },
    Timestamp = DateTime.UtcNow,
    IpAddress = HttpContext.Connection.RemoteIpAddress.ToString(),
    Signature = GenerateSignature(user, dto)  // Firma para inmutabilidad
  });
  
  user.Email = dto.Email;
  user.Phone = dto.Phone;
  await _db.SaveChangesAsync();
  
  // Log después del cambio
  await _auditLogger.LogAsync(new AuditLog {
    Action = "USER_UPDATE_COMPLETED",
    UserId = user.Id,
    Status = "SUCCESS",
    Timestamp = DateTime.UtcNow
  });
  
  return user;
}
```

### Processing Logic

```javascript
class LoggingAuditingSkill {
  async validate(input) {
    const findings = [];

    // 1. ACCESO A DATOS SENSIBLES REGISTRADO
    if (input.sensitiveDataAccess.length > 0 && !input.hasLogging) {
      findings.push({
        issue: 'Sensitive data accessed without logging',
        severity: 'CRÍTICA',
        recommendation: 'Add comprehensive logging for all data access'
      });
    }

    // 2. LOGGING INMUTABLE
    if (input.logsAreLoggable) {  // Si los logs pueden ser modificados
      findings.push({
        issue: 'Audit logs are mutable (can be modified or deleted)',
        severity: 'CRÍTICA',
        recommendation: 'Use append-only log storage (Azure Data Lake, AWS S3 with versioning)'
      });
    }

    // 3. RETENCION DE LOGS
    if (!input.logRetentionPolicy) {
      findings.push({
        issue: 'No log retention policy defined',
        severity: 'ALTA',
        recommendation: 'Implement minimum 1-year retention for sensitive data access logs'
      });
    }

    // 4. INFORMACIÓN LOGEADA
    const requiredLogFields = ['timestamp', 'userId', 'action', 'dataAccessed', 'result'];
    const missingFields = requiredLogFields.filter(f => !input.logFields.includes(f));
    if (missingFields.length > 0) {
      findings.push({
        issue: `Missing required log fields: ${missingFields.join(', ')}`,
        severity: 'ALTA',
        recommendation: `Add missing fields to all logs`
      });
    }

    // 5. FIRMA/INTEGRIDAD DE LOGS
    if (!input.logsHaveSignature) {
      findings.push({
        issue: 'Audit logs do not have cryptographic signatures',
        severity: 'ALTA',
        recommendation: 'Add HMAC or digital signatures to ensure log integrity'
      });
    }

    return findings;
  }
}
```

### Output

```json
{
  "auditingValidation": {
    "status": "INCUMPLE",
    "analysisScope": "Complete application"
  },
  "loggingCoverage": {
    "sensitiveDataAccessLogged": {
      "status": "PARCIAL",
      "loggedActions": [
        "USER_LOGIN",
        "DATA_ACCESS",
        "DATA_MODIFICATION"
      ],
      "unloggedActions": ["ADMINISTRATIVE_QUERIES"],
      "recommendation": "Add logging for all administrative queries"
    }
  },
  "logImmutability": {
    "status": "VULNERABILIDAD",
    "issue": "Logs stored in regular SQL Server table (mutable)",
    "recommendation": "Use append-only storage (Azure Data Lake, AWS S3)",
    "severity": "CRÍTICA"
  },
  "logRetention": {
    "policy": "30 días",
    "requirement": "Mínimo 12 meses para datos sensibles (Ley 21.719 Art. 20)",
    "status": "INCUMPLE",
    "recommendation": "Extend retention to 12 months"
  },
  "logInformation": {
    "requiredFields": [
      "timestamp",
      "userId",
      "action",
      "dataAccessed",
      "result",
      "ipAddress",
      "userAgent"
    ],
    "implementedFields": [
      "timestamp",
      "userId",
      "action",
      "dataAccessed"
    ],
    "missingFields": ["ipAddress", "userAgent"],
    "recommendation": "Add missing fields to track access context"
  },
  "logIntegrity": {
    "hasCryptographicSignature": false,
    "recommendation": "Add HMAC-SHA256 signature to each log entry",
    "severity": "ALTA"
  },
  "specificLogs": [
    {
      "dataType": "Email",
      "accessCount": 1250,
      "lastAccessed": "2026-05-25T09:30:00Z",
      "authorizedAccess": 1200,
      "suspiciousAccess": 50,
      "recommendation": "Review 50 suspicious accesses"
    }
  ],
  "overallStatus": "INCUMPLE",
  "criticalIssues": 2,
  "estimatedFixTime": "20 horas"
}
```

---

## SKILL 5: `arco-p-implementation`

### Propósito
Verificar que todos los derechos ARCO+P (Acceso, Rectificación, Supresión, Oposición, Portabilidad, Bloqueo) están implementados.

### Trigger
```javascript
const shouldActivate = (context) => {
  return context.handlesPersonalData ||
         context.hasUserAccounts ||
         context.processesPII;
};
```

### Implementación Esperada

| Derecho | Endpoint | Implementación |
|---------|----------|-----------------|
| **A**cceso | `GET /api/user/data` | Usuario descarga sus datos |
| **R**ectificación | `PATCH /api/user/data/{field}` | Usuario corrige datos |
| **S**upresión | `DELETE /api/user/data` | Usuario solicita eliminación |
| **O**posición | `POST /api/user/opt-out` | Usuario se opone a tratamiento |
| **P**ortabilidad | `GET /api/user/export` | Usuario descarga en JSON/CSV |
| **B**loqueo | `POST /api/user/block` | Suspensión temporal de tratamiento |

### Input

```csharp
// Analizar si existen estos endpoints
var endpoints = new[] {
  "GET /api/users/me",             // ✅ Acceso
  "PATCH /api/users/me",           // ✅ Rectificación
  "DELETE /api/users/me",          // ✅ Supresión
  // ❌ Falta: Oposición, Portabilidad, Bloqueo
};
```

### Processing Logic

```javascript
class ARCOPImplementationSkill {
  async validate(input) {
    const arcopRights = ['Access', 'Rectification', 'Suppression', 'Opposition', 'Portability', 'Blocking'];
    const findings = [];

    for (const right of arcopRights) {
      if (!input.implementedRights.includes(right)) {
        findings.push({
          right: right,
          status: 'NOT_IMPLEMENTED',
          severity: 'CRÍTICA',
          law: 'Ley 21.719 Art. 4-9',
          recommendation: `Implement ${right} functionality with API endpoint and UI`
        });
      } else {
        // Validar implementación
        const validation = await this.validateRight(right, input);
        if (!validation.isValid) {
          findings.push({
            right: right,
            status: 'INVALID_IMPLEMENTATION',
            issues: validation.issues,
            severity: 'ALTA'
          });
        }
      }
    }

    return findings;
  }

  async validateRight(right, input) {
    switch(right) {
      case 'Access':
        return this.validateAccess(input);
      case 'Rectification':
        return this.validateRectification(input);
      case 'Suppression':
        return this.validateSuppression(input);
      case 'Opposition':
        return this.validateOpposition(input);
      case 'Portability':
        return this.validatePortability(input);
      case 'Blocking':
        return this.validateBlocking(input);
    }
  }

  validateAccess(input) {
    return {
      isValid: input.hasGetMeEndpoint && 
               input.returnsAllUserData &&
               input.requires30DaysResponse &&
               input.hasAuditLog,
      issues: [
        !input.hasGetMeEndpoint ? 'GET /api/user/me endpoint missing' : null,
        !input.returnsAllUserData ? 'Not returning all user data' : null,
        !input.requires30DaysResponse ? 'No 30-day response deadline' : null
      ].filter(Boolean)
    };
  }

  validateSuppression(input) {
    const issues = [];
    
    if (!input.hasDeleteMeEndpoint) issues.push('DELETE /api/user/me missing');
    if (!input.deletesFromAllSystems) issues.push('Data not deleted from all systems');
    if (!input.deletesFromBackups) issues.push('Data not deleted from backups');
    if (!input.notifiesThirdParties) issues.push('Third-party data processors not notified');
    if (!input.logsAllDeletions) issues.push('Deletion not logged');
    
    return { isValid: issues.length === 0, issues };
  }

  validatePortability(input) {
    const issues = [];
    
    if (!input.hasExportEndpoint) issues.push('Export endpoint missing');
    if (!['JSON', 'CSV'].some(f => input.exportFormats.includes(f))) 
      issues.push('Export formats must include JSON or CSV');
    if (!input.isMachineReadable) issues.push('Format is not machine-readable');
    if (!input.isStructured) issues.push('Format is not structured');
    
    return { isValid: issues.length === 0, issues };
  }
}
```

### Output

```json
{
  "arcopValidation": {
    "status": "INCUMPLE",
    "law": "Ley 21.719 Art. 4-9"
  },
  "accessRight": {
    "status": "✅ IMPLEMENTADO",
    "endpoint": "GET /api/users/me",
    "requiresAuthentication": true,
    "returnsAllData": true,
    "responseTimeTarget": 30,
    "auditLogged": true,
    "compliance": "✅ OK"
  },
  "rectificationRight": {
    "status": "✅ IMPLEMENTADO",
    "endpoints": [
      "PATCH /api/users/me/email",
      "PATCH /api/users/me/phone",
      "PATCH /api/users/me/address"
    ],
    "requiresVerification": true,
    "auditLogged": true,
    "compliance": "✅ OK"
  },
  "suppressionRight": {
    "status": "⚠️ PARCIAL",
    "endpoint": "DELETE /api/users/me",
    "deletesFromMainDB": true,
    "deletesFromBackups": false,
    "notifiesThirdParties": false,
    "logsAsComplete": false,
    "issues": [
      "Data not deleted from backups",
      "Third-party data processors not notified",
      "Deletion not fully logged"
    ],
    "compliance": "INCUMPLE",
    "severity": "CRÍTICA",
    "estimatedFixTime": "8 horas"
  },
  "oppositionRight": {
    "status": "❌ NO IMPLEMENTADO",
    "recommendation": "Add opt-out mechanism for data processing",
    "example": "Allow users to opt-out of marketing emails",
    "compliance": "INCUMPLE",
    "severity": "CRÍTICA"
  },
  "portabilityRight": {
    "status": "❌ NO IMPLEMENTADO",
    "requirement": "User can export all personal data in structured, machine-readable format",
    "example": "GET /api/users/me/export?format=json",
    "recommendedFormats": ["JSON", "CSV"],
    "compliance": "INCUMPLE",
    "severity": "CRÍTICA",
    "estimatedFixTime": "12 horas"
  },
  "blockingRight": {
    "status": "❌ NO IMPLEMENTADO",
    "requirement": "User can temporarily block data processing",
    "recommendedImplementation": "Add 'blocked_until' field in Users table",
    "compliance": "INCUMPLE",
    "severity": "MEDIA"
  },
  "overallCompliance": {
    "implemented": 2,
    "partial": 1,
    "notImplemented": 3,
    "score": "33%",
    "status": "INCUMPLE"
  },
  "requiredActions": [
    {
      "priority": "CRÍTICA",
      "action": "Implement Suppression Right - delete from backups",
      "estimatedTime": "8 horas"
    },
    {
      "priority": "CRÍTICA",
      "action": "Implement Portability Right - JSON/CSV export",
      "estimatedTime": "12 horas"
    }
  ]
}
```

---

## SKILL 6: `dependency-scanning`

### Propósito
Escanear todas las librerías/dependencias en busca de vulnerabilidades conocidas (CVE) y versiones desactualizadas.

### Input

```json
{
  "package.json": {
    "dependencies": {
      "express": "4.17.1",  // ❌ Versión desactualizad con CVE
      "bcryptjs": "2.4.3",  // ✅ Actualizada
      "axios": "1.3.0"      // ⚠️ Versión anterior
    }
  },
  ".csproj": {
    "dependencies": {
      "System.Data.SqlClient": "4.8.0",
      "Entity Framework": "6.4.0"
    }
  }
}
```

### Processing Logic

```javascript
class DependencyScanningSkill {
  async scan(input) {
    const findings = [];
    const cveDatabase = await this.loadCVEDatabase();

    for (const [packageName, version] of Object.entries(input.dependencies)) {
      // 1. Buscar CVEs conocidos
      const vulnerabilities = cveDatabase.getVulnerabilities(packageName, version);
      
      if (vulnerabilities.length > 0) {
        findings.push({
          package: packageName,
          version: version,
          vulnerabilities: vulnerabilities.map(v => ({
            cveid: v.id,
            severity: v.severity,  // CRÍTICA, ALTA, MEDIA, BAJA
            description: v.description,
            cvss_score: v.cvss,
            affected_versions: v.affectedVersions,
            fixed_version: v.fixedVersion,
            recommendation: `Update to version ${v.fixedVersion} or later`
          }))
        });
      }

      // 2. Verificar actualización disponible
      const latestVersion = await npm.getLatestVersion(packageName);
      if (version < latestVersion) {
        findings.push({
          package: packageName,
          currentVersion: version,
          latestVersion: latestVersion,
          type: 'OUTDATED',
          recommendation: `Update to ${latestVersion}`
        });
      }
    }

    return findings;
  }
}
```

### Output

```json
{
  "dependencyScanning": {
    "timestamp": "2026-05-25T10:40:00Z",
    "totalDependencies": 85,
    "analysed": 85,
    "vulnerableDependencies": 5,
    "outdatedDependencies": 12
  },
  "vulnerabilities": [
    {
      "package": "express",
      "currentVersion": "4.17.1",
      "cves": [
        {
          "id": "CVE-2022-24999",
          "severity": "ALTA",
          "cvss": 7.5,
          "description": "Regular Expression Denial of Service (ReDoS) in query string parsing",
          "affectedVersions": ["< 4.18.2"],
          "fixedVersion": "4.18.2",
          "recommendation": "Upgrade to express@4.18.2 or later"
        }
      ]
    },
    {
      "package": "lodash",
      "currentVersion": "4.17.20",
      "cves": [
        {
          "id": "CVE-2021-23337",
          "severity": "CRÍTICA",
          "cvss": 9.8,
          "description": "Arbitrary code execution via template injection",
          "affectedVersions": ["< 4.17.21"],
          "fixedVersion": "4.17.21",
          "recommendation": "Upgrade to lodash@4.17.21 immediately"
        }
      ]
    }
  ],
  "outdatedDependencies": [
    {
      "package": "axios",
      "currentVersion": "0.27.0",
      "latestVersion": "1.6.0",
      "recommendation": "Update to latest stable version",
      "changelogUrl": "https://github.com/axios/axios/releases"
    }
  ],
  "riskSummary": {
    "critical": 2,
    "high": 3,
    "medium": 5,
    "low": 2
  },
  "complianceStatus": "INCUMPLE - Ley 21.663 NIST SI-02 (Parches)",
  "overallScore": 35,
  "recommendation": "Apply security patches for all CRITICAL and HIGH severity vulnerabilities within 7 days",
  "estimatedFixTime": "4 horas"
}
```

---

## SKILL 7: `code-pattern-analysis`

### Propósito
Analizar patrones inseguros de código (SQL Injection, XSS, hardcoding, etc).

### Detecting Patterns

```javascript
class CodePatternAnalysisSkill {
  patterns = [
    {
      name: 'SQL_INJECTION',
      regex: /\$\{.*\}|SELECT.*\+|WHERE.*\+|EXEC.*\+/,
      severity: 'CRÍTICA',
      fix: 'Use parameterized queries'
    },
    {
      name: 'HARDCODED_SECRET',
      regex: /(password|secret|key|token)\s*=\s*["'][^"']+["']/i,
      severity: 'CRÍTICA',
      fix: 'Move to environment variables or Key Vault'
    },
    {
      name: 'XSS_VULNERABILITY',
      regex: /innerHTML\s*=|dangerouslySetInnerHTML/,
      severity: 'ALTA',
      fix: 'Use textContent or sanitize input'
    },
    {
      name: 'WEAK_HASH',
      regex: /(MD5|SHA1|SHA-1)\..*Hash|hashlib\.(md5|sha1)/i,
      severity: 'ALTA',
      fix: 'Use SHA-256 or bcrypt'
    }
  ];

  async analyze(sourceCode) {
    const findings = [];

    for (const pattern of this.patterns) {
      const matches = sourceCode.matchAll(new RegExp(pattern.regex, 'gm'));
      
      for (const match of matches) {
        findings.push({
          pattern: pattern.name,
          line: this.getLineNumber(match),
          code: match[0],
          severity: pattern.severity,
          recommendation: pattern.fix
        });
      }
    }

    return findings;
  }
}
```

---

## Conclusión

Las 11 skills proporcionan cobertura completa de:
- ✅ Ley 21.719: Protección de Datos (Skills 1-5, 8-11)
- ✅ Ley 21.663: Ciberseguridad (Skills 2-3, 6-7, 9-10)
- ✅ Best Practices: Cifrado, autenticación, logging, compliance

Cada skill produce un reporte JSON estructurado que el **Orquestrador** consume para generar decisiones finales (BLOQUEA/ADVERTENCIA/OK).
