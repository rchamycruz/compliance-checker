# Syntaxis Compliance Checker

> Análisis automático de cumplimiento normativo para las leyes chilenas **Ley 21.719** (Protección de Datos Personales) y **Ley 21.663** (Marco de Ciberseguridad) — directamente en tu editor.

[![Version](https://img.shields.io/badge/versión-0.8.0-blue)](https://github.com/rchamycruz/compliance-checker)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.90.0-007ACC?logo=visualstudiocode)](https://code.visualstudio.com/)
[![Licencia](https://img.shields.io/badge/licencia-MIT-green)](LICENSE)
[![Repositorio](https://img.shields.io/badge/GitHub-rchamycruz%2Fcompliance--checker-181717?logo=github)](https://github.com/rchamycruz/compliance-checker)
[![Syntaxis Spa](https://img.shields.io/badge/Syntaxis%20Spa-syntaxis.cl-6366f1)](https://www.syntaxis.cl)

Desarrollado por **[Syntaxis Spa](https://www.syntaxis.cl)** — Ingeniería de software para el cumplimiento normativo chileno.

---

## ¿Qué hace esta extensión?

**Syntaxis Compliance Checker** analiza tu código y detecta vulnerabilidades legales y de seguridad según la normativa chilena vigente. A partir de la **v0.8.0**, soporta dos modos de análisis:

| Modo | Descripción | Requisito |
|---|---|---|
| 🔍 **Análisis Estático** *(default)* | Reglas deterministas offline, instantáneo | Ninguno |
| 🤖 **Análisis con IA** | Agentes LLM especializados por ley, comprensión semántica profunda | GitHub Copilot o API key |

En ambos modos, los problemas aparecen **subrayados directamente en el código** (como errores de TypeScript), con descripción del problema, artículo de ley infringido y recomendación de corrección.

| Agente | Ley | ¿Qué detecta? |
|---|---|---|
| 🛡️ **DPA Agent** | Ley 21.719 | Datos personales sin cifrado, SQL Injection, PII en logs, falta de consentimiento, derechos ARCO+P |
| 🔒 **CSA Agent** | Ley 21.663 | Credenciales hardcodeadas, endpoints sin auth, BD sin TLS, hashes débiles, CORS wildcard |

---

## Requisitos

- **VS Code** 1.90 o superior
- **Node.js** 18 o superior (para compilar desde fuentes)
- Archivos `.cs`, `.ts`, `.js` o `.sql` en el workspace
- GitHub Copilot activo **o** API key de OpenAI/Anthropic *(solo para modo IA)*

---

## Instalación

### Opción A — Desde archivo `.vsix` (recomendado)

```bash
# 1. Clonar el repositorio
git clone https://github.com/rchamycruz/compliance-checker.git
cd compliance-checker/packages/vscode-extension

# 2. Instalar dependencias y compilar
npm install
npm run compile

# 3. Empaquetar
npm run package
# Genera: syntaxis-compliance-checker-0.8.0.vsix

# 4. Instalar en VS Code
code --install-extension syntaxis-compliance-checker-0.8.0.vsix
```

### Opción B — Desde la UI de VS Code

1. Abre el panel de Extensiones (`Ctrl+Shift+X`)
2. Haz clic en `···` (menú superior derecho)
3. Selecciona **"Install from VSIX..."**
4. Elige el archivo `.vsix` generado

> ✅ La extensión queda instalada **a nivel de usuario** y está disponible en todos tus proyectos automáticamente.

### Opción C — Modo desarrollo (F5)

```bash
cd compliance-checker/packages/vscode-extension
npm install && npm run compile
code .
# Presiona F5 para abrir una ventana de extensión en modo depuración
```

---

## Uso

### Análisis en tiempo real

La extensión analiza automáticamente al abrir o editar cualquier archivo `.cs`, `.ts`, `.js` o `.sql`. Los problemas aparecen:

- **Subrayados en rojo** en el editor (severidad CRÍTICA o ALTA)
- **Subrayados en amarillo** (severidad MEDIA)
- En el panel **Problemas** (`Ctrl+Shift+M`)

En modo IA el análisis aplica un debounce de 2 segundos (vs 800ms en modo estático) para no saturar la API.

### Comandos disponibles

Accede con `Ctrl+Shift+P` y escribe `Syntaxis`:

| Comando | Descripción |
|---|---|
| `Syntaxis: Revisar archivo actual` | Analiza el archivo abierto y muestra resultados en el panel de salida |
| `Syntaxis: Revisar workspace completo` | Analiza todos los archivos `.cs/.ts/.js/.sql` del proyecto |
| `Syntaxis: Generar reporte` | Genera reporte en formato JSON, HTML y/o Markdown |
| `Syntaxis: Configurar API Key de IA` | Guarda tu API key de forma segura (SecretStorage) |
| `Syntaxis: Verificar conexión con IA` | Testea la conexión al proveedor de IA configurado |

---

## Configuración

Abre Settings (`Ctrl+,`) y busca **Syntaxis** para ver todas las opciones.

### Modo de análisis

| Setting | Valores | Default |
|---|---|---|
| `syntaxis.analysisMode` | `static` · `ai` | `static` |

### Configuración del modo IA

| Setting | Descripción | Default |
|---|---|---|
| `syntaxis.ai.provider` | Proveedor de IA | `github-copilot` |
| `syntaxis.ai.model` | Modelo a usar | `gpt-4o-mini` |
| `syntaxis.ai.azureEndpoint` | URL del endpoint Azure OpenAI | *(vacío)* |

### Proveedores de IA disponibles

| Proveedor | API Key | Cómo configurar |
|---|---|---|
| **`github-copilot`** *(recomendado)* | ❌ No necesita | Solo requiere tener Copilot activo en VS Code |
| `openai` | ✅ Necesita | Ejecuta `Syntaxis: Configurar API Key de IA` |
| `anthropic` | ✅ Necesita | Ejecuta `Syntaxis: Configurar API Key de IA` |
| `azure-openai` | ✅ Necesita | Configura también `syntaxis.ai.azureEndpoint` |

> 🔐 Las API keys se almacenan en **VS Code SecretStorage** — nunca en `settings.json` ni en disco en texto claro.

### Activar el modo IA paso a paso

1. En Settings, cambia `syntaxis.analysisMode` a `ai`
2. Elige tu proveedor en `syntaxis.ai.provider`
3. Si usas **GitHub Copilot**: listo, no necesitas nada más
4. Si usas **OpenAI/Anthropic/Azure**: ejecuta `Syntaxis: Configurar API Key de IA` e ingresa tu key
5. (Opcional) Verifica con `Syntaxis: Verificar conexión con IA`

---

## Generación de reportes

Al ejecutar **"Generar reporte"**, la extensión pregunta:

1. **¿Qué analizar?** → Archivo actual o Workspace completo
2. **¿Formato?** → JSON / HTML / Markdown / Todos

Los reportes se guardan en `compliance-reports/` dentro del workspace:

```
mi-proyecto/
└── compliance-reports/
    ├── compliance-2026-05-26T14-00-00.json
    ├── compliance-2026-05-26T14-00-00.html
    └── compliance-2026-05-26T14-00-00.md
```

---

## Qué detecta

### 🛡️ Ley 21.719 — Protección de Datos Personales

| Tipo | Severidad | Ejemplo |
|---|---|---|
| `PII_UNENCRYPTED` | 🔴 CRÍTICA | `public string Email { get; set; }` sin cifrado |
| `SQL_INJECTION_PII_RISK` | 🔴 CRÍTICA | `"SELECT * FROM users WHERE id = " + input` |
| `PII_IN_LOGS` | 🟠 ALTA | `console.log(user.email)` |
| `MISSING_CONSENT` | 🟠 ALTA | Crear usuario sin registrar consentimiento |
| `MISSING_ARCO_SUPPRESSION` | 🟠 ALTA | Controlador sin endpoint DELETE de datos |
| `MISSING_ARCO_PORTABILITY` | 🟠 ALTA | Sin endpoint de exportación de datos |
| `MISSING_ARCO_OPPOSITION` | 🟡 MEDIA | Sin mecanismo de oposición al tratamiento |

### 🔒 Ley 21.663 — Marco de Ciberseguridad

| Tipo | Severidad | Ejemplo |
|---|---|---|
| `HARDCODED_CREDENTIAL` | 🔴 CRÍTICA | `password = "Admin123"` |
| `INSECURE_DB_CONNECTION` | 🔴 CRÍTICA | `Encrypt=false` en connection string |
| `ENDPOINT_NO_AUTH` | 🟠 ALTA | `[HttpGet]` sin `[Authorize]` |
| `WEAK_HASH_ALGORITHM` | 🟠 ALTA | `MD5.Create().ComputeHash(data)` |
| `CORS_WILDCARD` | 🟡 MEDIA | `AllowAnyOrigin()` |
| `MISSING_RATE_LIMITING` | 🟠 ALTA | Endpoint de login sin rate limiting |

### Puntuación de compliance

| Estado | Condición | Score |
|---|---|---|
| ✅ `PASS` | Sin hallazgos críticos ni altos | 80–100 |
| ⚠️ `WARN` | Hallazgos ALTA | 60–79 |
| ❌ `FAIL` | Uno o más CRÍTICOS (bloquea merge en CI/CD) | 0–59 |

---

## Integración con GitHub Actions

Este repositorio incluye un workflow de GitHub Actions (`.github/workflows/compliance-check.yml`) que ejecuta el mismo análisis en cada Pull Request y bloquea el merge si hay hallazgos críticos.

---

## Desarrollo y contribución

```bash
git clone https://github.com/rchamycruz/compliance-checker.git
cd compliance-checker/packages/vscode-extension

npm install
npm run watch    # modo watch

code .           # F5 para depurar
```

1. Fork del repositorio
2. Rama: `git checkout -b feature/mi-mejora`
3. Commit: `git commit -m 'feat: descripción'`
4. Push: `git push origin feature/mi-mejora`
5. Pull Request en [GitHub](https://github.com/rchamycruz/compliance-checker/pulls)

---

## Changelog

### v0.8.0
- 🤖 **Modo Análisis con IA**: agentes LLM especializados por ley con sistema de Skills
- 🤖 **GitHub Copilot** como proveedor de IA default (sin API key adicional, vía `vscode.lm`)
- 🔑 Soporte para **OpenAI**, **Anthropic** y **Azure OpenAI** como proveedores alternativos
- 🔐 API keys almacenadas en **VS Code SecretStorage** (nunca en settings.json)
- ⚙️ Nuevas configuraciones: `syntaxis.analysisMode`, `syntaxis.ai.provider`, `syntaxis.ai.model`
- ➕ Nuevos comandos: `Configurar API Key de IA`, `Verificar conexión con IA`
- ✅ Modo estático sin cambios — compatibilidad total con versiones anteriores

### v0.7.0
- ✅ Prompts sugeridos por hallazgo para corregir con IA
- ✅ Tooltip "¿Cómo se calcula el Score?" en la tarjeta del score
- ✅ Clic en tarjetas de severidad navega a la sección correspondiente

### v0.6.0
- ✅ Logo de Syntaxis embebido en el reporte HTML
- ✅ Links `vscode://file/` clickeables en columna Ubicación del reporte
- ✅ Hora del sistema (zona horaria local) en lugar de UTC
- ✅ Score calculado con fórmula ponderada por severidad

### v0.5.0
- ✅ Fix: hallazgos ordenados por severidad en todos los reportes

### v0.4.0
- ✅ Logo oficial de Syntaxis Spa en la extensión

### v0.3.0
- ✅ Citas textuales de la ley en cada hallazgo (expandibles)
- ✅ Sección "¿Por qué implementar esta corrección?" con contexto legal

### v0.2.0
- ✅ Análisis en tiempo real con debounce
- ✅ Motor de análisis inline sin dependencias externas en runtime
- ✅ Generación de reportes JSON, HTML y Markdown

### v0.1.0
- ✅ Versión inicial con comandos básicos

---

## Licencia

MIT — Ver [LICENSE](LICENSE) para más detalles.

---

## Autor

**Rodrigo Chamy** · [rchamycruz](https://github.com/rchamycruz)

---

## Acerca de Syntaxis Spa

**[Syntaxis Spa](https://www.syntaxis.cl)** es una empresa chilena de ingeniería de software especializada en cumplimiento normativo, seguridad y desarrollo de soluciones tecnológicas para el mercado latinoamericano.

🌐 [www.syntaxis.cl](https://www.syntaxis.cl)

¿Tienes problemas o sugerencias? Abre un [issue](https://github.com/rchamycruz/compliance-checker/issues) o inicia una [discusión](https://github.com/rchamycruz/compliance-checker/discussions).