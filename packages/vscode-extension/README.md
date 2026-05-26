# Syntaxis Compliance Checker

> Análisis automático de cumplimiento normativo para las leyes chilenas **Ley 21.719** (Protección de Datos Personales) y **Ley 21.663** (Marco de Ciberseguridad) — directamente en tu editor.

[![Version](https://img.shields.io/badge/versión-0.10.1-blue)](https://github.com/rchamycruz/compliance-checker)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.93.0-007ACC?logo=visualstudiocode)](https://code.visualstudio.com/)
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
| 🤖 **Análisis con IA** | Agentes LLM especializados por ley, comprensión semántica profunda | **GitHub Copilot Chat** o API key |

> ⚠️ **Importante**: el modo IA con GitHub Copilot requiere la extensión **GitHub Copilot Chat** (`github.copilot-chat`), **no** solo GitHub Copilot (completions inline). Son dos extensiones distintas.

En ambos modos, los problemas aparecen **subrayados directamente en el código** (como errores de TypeScript), con descripción del problema, artículo de ley infringido y recomendación de corrección.

| Agente | Ley | ¿Qué detecta? |
|---|---|---|
| 🛡️ **DPA Agent** | Ley 21.719 | Datos personales sin cifrado, SQL Injection, PII en logs, falta de consentimiento, derechos ARCO+P |
| 🔒 **CSA Agent** | Ley 21.663 | Credenciales hardcodeadas, endpoints sin auth, BD sin TLS, hashes débiles, CORS wildcard |

---

## Requisitos

- **VS Code** 1.93 o superior
- **Node.js** 18 o superior (para compilar desde fuentes)
- Archivos `.cs`, `.ts`, `.js` o `.sql` en el workspace
- **GitHub Copilot Chat** activo (`github.copilot-chat`) **o** API key de OpenAI/Anthropic *(solo para modo IA)*

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
# Genera: syntaxis-compliance-checker-0.10.1.vsix

# 4. Instalar en VS Code
code --install-extension syntaxis-compliance-checker-0.10.1.vsix
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

En modo IA el análisis **no se ejecuta automáticamente** (requiere comando explícito para no saturar la API). En modo estático se aplica un debounce de 800ms al editar.

### Comandos disponibles

Accede con `Ctrl+Shift+P` y escribe `Syntaxis`:

| Comando | Descripción |
|---|---|
| `Syntaxis: Revisar archivo actual` | Analiza el archivo abierto y muestra resultados en el panel de salida |
| `Syntaxis: Revisar workspace completo` | Analiza todos los archivos `.cs/.ts/.js/.sql` del proyecto |
| `Syntaxis: Generar reporte` | Genera reporte en formato JSON, HTML y/o Markdown |
| `Syntaxis: Seleccionar modelo de IA` | **NUEVO** — QuickPick con modelos disponibles (Copilot: detectados dinámicamente) |
| `Syntaxis: Configurar API Key de IA` | Guarda tu API key de forma segura (SecretStorage) |
| `Syntaxis: Verificar conexión con IA` | Testea la conexión y reporta qué modelo Copilot está disponible |

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
| `syntaxis.ai.model` | Modelo preferido (ver lista abajo) | `auto` |
| `syntaxis.ai.azureEndpoint` | URL del endpoint Azure OpenAI | *(vacío)* |

### Proveedores y modelos disponibles

| Proveedor | API Key | Modelos |
|---|---|---|
| **`github-copilot`** *(recomendado)* | ❌ No necesita | Detectados dinámicamente según tu suscripción. Usa `Syntaxis: Seleccionar modelo de IA` para ver los disponibles. |
| `openai` | ✅ Necesita | `gpt-4o`, `gpt-4o-mini`, `gpt-4.1`, `gpt-4.1-mini`, `o1`, `o3`, `o4-mini`, y más |
| `anthropic` | ✅ Necesita | `claude-sonnet-4-6`, `claude-opus-4-6`, `claude-sonnet-4-5`, `claude-opus-4-5`, `claude-haiku-4-5`, `claude-3-7-sonnet-latest`, y más |
| `azure-openai` | ✅ Necesita | Nombre del deployment en tu recurso Azure |

> **GitHub Copilot Chat**: requiere la extensión `github.copilot-chat` instalada y activa (distinta a `github.copilot`).
> 🔐 Las API keys se almacenan en **VS Code SecretStorage** — nunca en `settings.json` ni en disco en texto claro.

### Activar el modo IA paso a paso

1. En Settings, cambia `syntaxis.analysisMode` a `ai`
2. Elige tu proveedor en `syntaxis.ai.provider`
3. Si usas **GitHub Copilot**:
   - Instala la extensión **GitHub Copilot Chat** (si no la tienes)
   - Ejecuta `Syntaxis: Seleccionar modelo de IA` para elegir el modelo disponible
   - O deja `syntaxis.ai.model` en `auto` para selección automática
4. Si usas **OpenAI/Anthropic/Azure**: ejecuta `Syntaxis: Configurar API Key de IA` e ingresa tu key
5. (Opcional) Verifica con `Syntaxis: Verificar conexión con IA`

---

## Generación de reportes

Al ejecutar **"Generar reporte"**, la extensión pregunta:

1. **¿Qué analizar?** → Archivo actual o Workspace completo
2. **¿Formato?** → JSON / HTML / Markdown / Todos

Ambas opciones respetan el **modo de análisis configurado** (`syntaxis.analysisMode`): si está en modo IA, tanto el análisis de archivo individual como el de workspace completo utilizan los agentes LLM. El progreso muestra `[IA]` por archivo cuando el modo IA está activo.

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

### v0.10.1
- 🔧 **Fix**: `Generar reporte → Workspace completo` ahora usa el modo IA cuando `syntaxis.analysisMode` es `ai` (antes siempre usaba REGEX independiente de la configuración)
- 🔧 **Fix**: el campo `generatedBy` del reporte consolidado refleja `[IA]` cuando el análisis se realizó con IA
- 🔧 **Fix**: progreso por archivo muestra indicador `[IA]` en modo IA para workspace completo

### v0.10.0
- 🔧 **Fix crítico**: integración con GitHub Copilot Chat ahora funciona correctamente (`extensionDependencies: github.copilot-chat`)
- 🔧 **Fix crítico**: errores de Copilot ya no se silencian — el usuario ve mensajes de error accionables
- 🔧 **Fix**: API de streaming corregida a `response.text` (VS Code 1.93+ LM API)
- 🔧 **Fix**: eliminada doble llamada a `analyzeWithAI` en `Revisar archivo actual` (2× costo/latencia)
- 🆕 **Nuevo comando**: `Syntaxis: Seleccionar modelo de IA` — QuickPick dinámico con modelos reales de la suscripción Copilot
- 🆕 **Selector de modelos completo**: enum con todos los modelos OpenAI (`gpt-4.1`, `o3`, `o4-mini`) y Anthropic (`claude-sonnet-4-6`, `claude-opus-4-6`, `claude-sonnet-4-5`, etc.)
- 🆕 **Modelo preferido para Copilot**: `syntaxis.ai.model` ahora aplica como preferencia con fallback automático
- 🔧 **Fix**: `Verificar conexión con IA` prueba todas las familias de modelos (no solo `gpt-4o`)
- 🔧 **Fix**: modo AI ya no dispara análisis automático en cada keystroke

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