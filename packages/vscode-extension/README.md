# Syntaxis Compliance Checker

> Análisis automático de cumplimiento normativo para las leyes chilenas **Ley 21.719** (Protección de Datos Personales) y **Ley 21.663** (Marco de Ciberseguridad) — directamente en tu editor.

[![Version](https://img.shields.io/badge/versión-0.2.0-blue)](https://github.com/rchamycruz/compliance-checker)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.60.0-007ACC?logo=visualstudiocode)](https://code.visualstudio.com/)
[![Licencia](https://img.shields.io/badge/licencia-MIT-green)](LICENSE)
[![Repositorio](https://img.shields.io/badge/GitHub-rchamycruz%2Fcompliance--checker-181717?logo=github)](https://github.com/rchamycruz/compliance-checker)

---

## ¿Qué hace esta extensión?

**Syntaxis Compliance Checker** analiza tu código en tiempo real y detecta vulnerabilidades legales y de seguridad según la normativa chilena vigente:

| Agente | Ley | ¿Qué detecta? |
|---|---|---|
| 🛡️ **DPA Agent** | Ley 21.719 | Datos personales sin cifrado, SQL Injection, PII en logs |
| 🔒 **CSA Agent** | Ley 21.663 | Credenciales hardcodeadas, endpoints sin auth, BD sin TLS |

Los problemas aparecen **subrayados directamente en el código** (como errores de TypeScript), con descripción del problema, artículo de ley infringido y recomendación de corrección.

---

## Capturas

> *Los diagnósticos aparecen en el panel de Problemas y subrayados en el editor.*

---

## Requisitos

- **VS Code** 1.60 o superior
- **Node.js** 18 o superior (para compilar desde fuentes)
- Archivos `.cs`, `.ts`, `.js` o `.sql` en el workspace

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
# Genera: syntaxis-compliance-checker-0.2.0.vsix

# 4. Instalar en VS Code
code --install-extension syntaxis-compliance-checker-0.2.0.vsix
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

### Comandos disponibles

Accede con `Ctrl+Shift+P` y escribe `Syntaxis`:

| Comando | Descripción |
|---|---|
| `Syntaxis: Revisar archivo actual` | Analiza el archivo abierto y muestra resultados en el panel de salida |
| `Syntaxis: Revisar workspace completo` | Analiza todos los archivos `.cs/.ts/.js/.sql` del proyecto |
| `Syntaxis: Generar reporte` | Genera reporte en formato JSON, HTML y/o Markdown |

### Generación de reportes

Al ejecutar **"Generar reporte"**, la extensión pregunta:

1. **¿Qué analizar?** → Archivo actual o Workspace completo
2. **¿Formato?** → JSON / HTML / Markdown / Todos

Los reportes se guardan en `compliance-reports/` dentro del workspace con el timestamp de generación:

```
mi-proyecto/
└── compliance-reports/
    ├── compliance-2026-05-25T14-00-00.json
    ├── compliance-2026-05-25T14-00-00.html
    └── compliance-2026-05-25T14-00-00.md
```

---

## Qué detecta

### 🛡️ Ley 21.719 — Protección de Datos Personales

| Tipo | Severidad | Ejemplo detectado |
|---|---|---|
| `PII_UNENCRYPTED` | 🔴 CRÍTICA | `public string Email { get; set; }` sin cifrado |
| `SQL_INJECTION` | 🔴 CRÍTICA | `"SELECT * FROM users WHERE id = " + input` |
| `PII_IN_LOGS` | 🟠 ALTA | `console.log(user.email)` |

### 🔒 Ley 21.663 — Marco de Ciberseguridad

| Tipo | Severidad | Ejemplo detectado |
|---|---|---|
| `HARDCODED_CREDENTIAL` | 🔴 CRÍTICA | `password = "Admin123"` |
| `INSECURE_DB_CONNECTION` | 🔴 CRÍTICA | `Encrypt=false` en connection string |
| `ENDPOINT_NO_AUTH` | 🟠 ALTA | `[HttpGet]` sin `[Authorize]` |

### Puntuación

Cada análisis genera un **score de 0 a 100**:
- Hallazgo CRÍTICA → `-25 puntos`
- Hallazgo ALTA → `-10 puntos`

| Estado | Condición |
|---|---|
| ✅ `PASS` | Sin hallazgos críticos ni altos |
| ⚠️ `WARN` | Hallazgos de severidad ALTA |
| ❌ `FAIL` | Uno o más hallazgos CRÍTICOS (bloquea merge en CI/CD) |

---

## Configuración

Esta versión no requiere configuración adicional. La extensión se activa automáticamente al abrir archivos compatibles.

---

## Integración con GitHub Actions

Este repositorio incluye un workflow de GitHub Actions (`.github/workflows/compliance-check.yml`) que ejecuta el mismo análisis en cada Pull Request y bloquea el merge si hay hallazgos críticos.

---

## Desarrollo y contribución

```bash
# Clonar
git clone https://github.com/rchamycruz/compliance-checker.git
cd compliance-checker/packages/vscode-extension

# Instalar dependencias
npm install

# Compilar en modo watch
npm run watch

# Abrir en VS Code y presionar F5 para depurar
code .
```

1. Haz fork del repositorio
2. Crea tu rama: `git checkout -b feature/mi-mejora`
3. Haz commit: `git commit -m 'feat: descripción del cambio'`
4. Push: `git push origin feature/mi-mejora`
5. Abre un Pull Request en [GitHub](https://github.com/rchamycruz/compliance-checker/pulls)

---

## Changelog

### v0.2.0
- ✅ Análisis en tiempo real con debounce (800ms)
- ✅ Motor de análisis inline (sin dependencias externas en runtime)
- ✅ Generación de reportes JSON, HTML y Markdown
- ✅ Análisis de workspace completo con barra de progreso cancelable
- ✅ Fix: sin memory leaks en OutputChannel

### v0.1.0
- ✅ Versión inicial con comandos básicos

---

## Licencia

MIT — Ver [LICENSE](LICENSE) para más detalles.

---

## Autor

**Rodrigo Chamy** · [rchamycruz](https://github.com/rchamycruz)

¿Tienes problemas o sugerencias? Abre un [issue](https://github.com/rchamycruz/compliance-checker/issues) o inicia una [discusión](https://github.com/rchamycruz/compliance-checker/discussions).
