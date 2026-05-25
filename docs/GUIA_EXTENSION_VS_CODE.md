# GUÍA COMPLETA: EXTENSIÓN VS CODE
## Instalación Local, Desarrollo y Testing

---

## 📋 ÍNDICE

1. [Requisitos Previos](#requisitos-previos)
2. [Estructura de la Extensión](#estructura-de-la-extensión)
3. [Instalación en Local (Desarrollo)](#instalación-en-local-desarrollo)
4. [Código Fuente Completo](#código-fuente-completo)
5. [Testing Local](#testing-local)
6. [Instalación en Producción](#instalación-en-producción)
7. [Solución de Problemas](#solución-de-problemas)
8. [Ejemplos de Uso](#ejemplos-de-uso)

---

## REQUISITOS PREVIOS

### Software Requerido

```bash
# 1. Node.js 18+ (verificar)
node --version
# Esperado: v18.0.0 o superior

# 2. npm (viene con Node.js)
npm --version
# Esperado: 8.0.0 o superior

# 3. VS Code (descargar desde https://code.visualstudio.com/)
# Versión: 1.60.0 o superior

# 4. Git (opcional pero recomendado)
git --version
```

### Extensiones de VS Code Recomendadas

```json
{
  "extensions": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.extension-test-runner"
  ]
}
```

Instalar en VS Code:
```
Ctrl+Shift+X (Windows/Linux) o Cmd+Shift+X (Mac)
Buscar cada extensión y hacer clic en "Install"
```

---

## ESTRUCTURA DE LA EXTENSIÓN

```
syntaxis-vscode-extension/
│
├── src/
│   ├── extension.ts              # Entry point
│   ├── activation.ts             # Activación de extensión
│   │
│   ├── commands/
│   │   ├── checkFile.ts         # Comando: revisar archivo actual
│   │   ├── checkWorkspace.ts    # Comando: revisar workspace
│   │   ├── analyzeDatabase.ts   # Comando: analizar BD
│   │   └── generateReport.ts    # Comando: generar reporte
│   │
│   ├── diagnostics/
│   │   ├── diagnosticProvider.ts # Proveedor de diagnósticos
│   │   ├── issueFormatter.ts     # Formatea problemas
│   │   └── severityMapper.ts     # Mapea severidad
│   │
│   ├── panels/
│   │   ├── sidePanel.ts          # Panel lateral
│   │   ├── reportPanel.ts        # Panel de reportes
│   │   └── settingsPanel.ts      # Panel de configuración
│   │
│   ├── orchestrator/
│   │   └── orchestrator.ts       # Llama al orquestrador
│   │
│   └── utils/
│       ├── logger.ts             # Logging
│       ├── config.ts             # Configuración
│       └── mcp-client.ts         # Cliente MCP
│
├── media/
│   ├── icons/
│   │   ├── logo.png
│   │   ├── check.svg
│   │   ├── warning.svg
│   │   └── error.svg
│   │
│   └── styles/
│       └── sidePanel.css
│
├── test/
│   ├── runTest.ts               # Test runner
│   ├── suite/
│   │   ├── extension.test.ts    # Tests básicos
│   │   └── commands.test.ts     # Tests de comandos
│   │
│   └── fixtures/
│       ├── vulnerable-code.cs
│       └── secure-code.cs
│
├── .vscodeignore              # Archivos a excluir
├── package.json              # Configuración de extensión
├── tsconfig.json            # TypeScript config
├── webpack.config.js        # Bundling config
├── README.md
├── CHANGELOG.md
└── LICENSE
```

---

## INSTALACIÓN EN LOCAL (DESARROLLO)

### OPCIÓN 1: Instalación Rápida (Recomendada)

#### Paso 1: Clonar el Repositorio

```bash
# En tu máquina local
git clone https://github.com/syntaxis-spa/compliance-checker.git
cd compliance-checker/packages/vscode-extension

# Si no tienes Git, descarga manualmente desde:
# https://github.com/syntaxis-spa/compliance-checker/releases
```

#### Paso 2: Instalar Dependencias

```bash
# Instalar paquetes npm
npm install

# Esto descargará:
# - vscode (SDK de VS Code)
# - typescript
# - webpack
# - ts-jest
# - etc
```

#### Paso 3: Compilar la Extensión

```bash
# Compilar TypeScript a JavaScript
npm run compile

# Esperado: Sin errores, archivos compilados en ./out
```

#### Paso 4: Abrir en VS Code para Testing

```bash
# Abre VS Code con la extensión en modo desarrollo
code .

# O si ya está abierto VS Code:
# Ctrl+K Ctrl+O (Windows/Linux) o Cmd+K Cmd+O (Mac)
# Selecciona la carpeta: compliance-checker/packages/vscode-extension
```

#### Paso 5: Ejecutar la Extensión en Modo Debug

```
En VS Code:
1. Presiona F5 (o Ctrl+Shift+D)
2. Selecciona "Run Extension" en la dropdown
3. Se abrirá una NEW window de VS Code con la extensión activada

Ahora tienes DOS ventanas:
- Original: para editar código
- Nueva: para PROBAR la extensión
```

---

### OPCIÓN 2: Instalación Manual sin Git

Si no tienes Git instalado:

#### Paso 1: Descargar archivo ZIP

1. Ve a: https://github.com/syntaxis-spa/compliance-checker
2. Haz clic en "Code" → "Download ZIP"
3. Extrae el ZIP en tu carpeta deseada
4. Abre terminal/PowerShell en esa carpeta

#### Paso 2-5: Igual que Opción 1

```bash
# Desde la carpeta descomprimida
cd packages/vscode-extension
npm install
npm run compile
code .
```

---

## CÓDIGO FUENTE COMPLETO

### 1. package.json (Configuración de Extensión)

```json
{
  "name": "syntaxis-compliance-checker",
  "displayName": "Syntaxis Compliance Checker",
  "version": "1.0.0",
  "description": "Revisa código contra Leyes 21.719 y 21.663 en tiempo real",
  "author": "Syntaxis SPA",
  "license": "MIT",
  "publisher": "syntaxis",
  
  "engines": {
    "vscode": "^1.60.0"
  },
  
  "categories": [
    "Linters",
    "Other"
  ],
  
  "keywords": [
    "compliance",
    "security",
    "data-protection",
    "chile",
    "ley-21-719",
    "ley-21-663"
  ],
  
  "main": "./out/extension.js",
  "icon": "media/icons/logo.png",
  
  "activationEvents": [
    "onStartupFinished",
    "onLanguage:csharp",
    "onLanguage:javascript",
    "onLanguage:typescript",
    "onCommand:syntaxis.checkFile",
    "onCommand:syntaxis.checkWorkspace",
    "onCommand:syntaxis.analyzeDatabase",
    "onCommand:syntaxis.generateReport"
  ],
  
  "contributes": {
    "commands": [
      {
        "command": "syntaxis.checkFile",
        "title": "Syntaxis: Revisar archivo actual",
        "category": "Syntaxis"
      },
      {
        "command": "syntaxis.checkWorkspace",
        "title": "Syntaxis: Revisar workspace completo",
        "category": "Syntaxis"
      },
      {
        "command": "syntaxis.analyzeDatabase",
        "title": "Syntaxis: Analizar BD conectada",
        "category": "Syntaxis"
      },
      {
        "command": "syntaxis.generateReport",
        "title": "Syntaxis: Generar reporte de compliance",
        "category": "Syntaxis"
      }
    ],
    
    "views": {
      "explorer": [
        {
          "id": "syntaxisPanel",
          "name": "Syntaxis Compliance",
          "when": "syntaxis.activated"
        }
      ]
    },
    
    "configuration": [
      {
        "title": "Syntaxis Compliance Checker",
        "properties": {
          "syntaxis.enableRealTimeCheck": {
            "type": "boolean",
            "default": true,
            "description": "Habilitar análisis en tiempo real"
          },
          "syntaxis.blockCriticalIssues": {
            "type": "boolean",
            "default": true,
            "description": "Bloquear acciones si hay problemas críticos"
          },
          "syntaxis.sqlServerHost": {
            "type": "string",
            "description": "Host de SQL Server para análisis de BD"
          },
          "syntaxis.postgresHost": {
            "type": "string",
            "description": "Host de PostgreSQL para análisis de BD"
          }
        }
      }
    ]
  },
  
  "scripts": {
    "vscode:prepublish": "npm run esbuild-base -- --minify",
    "esbuild-base": "esbuild ./src/extension.ts --bundle --outfile=out/extension.js --external:vscode --format=cjs --platform=node",
    "esbuild": "npm run esbuild-base -- --sourcemap",
    "esbuild-watch": "npm run esbuild-base -- --sourcemap --watch",
    "test-compile": "tsc -p ./ --noEmit",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "npm run compile && npm run lint",
    "lint": "eslint src --ext ts",
    "test": "node ./out/test/runTest.js",
    "webpack": "webpack --mode development",
    "webpack-dev": "webpack --mode development --watch --info-verbosity verbose",
    "webpack-prod": "webpack --mode production",
    "package": "vsce package"
  },
  
  "devDependencies": {
    "@types/glob": "^8.1.0",
    "@types/mocha": "^10.0.1",
    "@types/node": "^20.0.0",
    "@types/vscode": "^1.60.0",
    "@typescript-eslint/eslint-plugin": "^6.11.0",
    "@typescript-eslint/parser": "^6.11.0",
    "@vscode/test-electron": "^2.3.4",
    "esbuild": "^0.19.0",
    "eslint": "^8.50.0",
    "glob": "^10.3.3",
    "mocha": "^10.2.0",
    "typescript": "^5.2.0",
    "webpack": "^5.88.0",
    "webpack-cli": "^5.1.4"
  },
  
  "dependencies": {
    "axios": "^1.6.0",
    "dotenv": "^16.3.1",
    "pino": "^8.16.1"
  }
}
```

### 2. src/extension.ts (Entry Point)

```typescript
import * as vscode from 'vscode';
import { activate as activateCommands } from './commands/registerCommands';
import { registerDiagnosticProvider } from './diagnostics/diagnosticProvider';
import { initializeSidePanel } from './panels/sidePanel';
import { Logger } from './utils/logger';

const logger = new Logger('Extension');

export async function activate(context: vscode.ExtensionContext) {
  logger.info('Syntaxis Compliance Checker activado');

  try {
    // 1. Registrar comandos
    activateCommands(context);
    logger.info('✓ Comandos registrados');

    // 2. Registrar proveedor de diagnósticos
    registerDiagnosticProvider(context);
    logger.info('✓ Diagnósticos registrados');

    // 3. Inicializar panel lateral
    initializeSidePanel(context);
    logger.info('✓ Panel lateral inicializado');

    // 4. Marcar como activado
    vscode.commands.executeCommand('setContext', 'syntaxis.activated', true);
    logger.info('✓ Contexto establecido');

    // 5. Mensaje de bienvenida
    vscode.window.showInformationMessage(
      '🎉 Syntaxis Compliance Checker está activo. Usa Ctrl+Shift+P para comandos.'
    );

  } catch (error) {
    logger.error('Error durante activación:', error);
    vscode.window.showErrorMessage(
      'Error al activar Syntaxis Compliance Checker: ' + error
    );
  }
}

export function deactivate() {
  logger.info('Syntaxis Compliance Checker desactivado');
}
```

### 3. src/commands/checkFile.ts (Comando Principal)

```typescript
import * as vscode from 'vscode';
import { Orchestrator } from '../orchestrator/orchestrator';
import { Logger } from '../utils/logger';

const logger = new Logger('CheckFile');

export async function checkFile() {
  // 1. Obtener archivo actual
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No hay archivo abierto');
    return;
  }

  const filePath = editor.document.fileName;
  const fileContent = editor.document.getText();

  logger.info(`Revisando archivo: ${filePath}`);

  // 2. Mostrar progreso
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Window,
      title: 'Syntaxis: Analizando...',
      cancellable: false
    },
    async (progress) => {
      progress.report({ increment: 0 });

      try {
        // 3. Ejecutar orquestador
        const orchestrator = new Orchestrator();
        const result = await orchestrator.analyze({
          code: fileContent,
          filePath: filePath,
          fileType: getFileType(filePath)
        });

        progress.report({ increment: 100 });

        // 4. Mostrar resultados
        displayResults(result, filePath);

      } catch (error) {
        vscode.window.showErrorMessage(
          'Error durante análisis: ' + error
        );
        logger.error('Error:', error);
      }
    }
  );
}

function getFileType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'cs': return 'csharp';
    case 'js': return 'javascript';
    case 'ts': return 'typescript';
    case 'sql': return 'sql';
    default: return 'unknown';
  }
}

function displayResults(result: any, filePath: string) {
  // Mostrar en Output channel
  const outputChannel = vscode.window.createOutputChannel('Syntaxis Compliance');
  outputChannel.appendLine('═══════════════════════════════════════');
  outputChannel.appendLine(`Archivo: ${filePath}`);
  outputChannel.appendLine(`Timestamp: ${new Date().toISOString()}`);
  outputChannel.appendLine('═══════════════════════════════════════');
  outputChannel.appendLine('');

  // Mostrar por severidad
  const findingsBySeverity = groupBySeverity(result.findings);
  
  for (const [severity, findings] of Object.entries(findingsBySeverity)) {
    outputChannel.appendLine(`\n${severity} (${findings.length})`);
    outputChannel.appendLine('─'.repeat(40));
    
    findings.forEach((f: any) => {
      outputChannel.appendLine(`  • ${f.description}`);
      outputChannel.appendLine(`    Artículo: ${f.article}`);
      outputChannel.appendLine(`    Recomendación: ${f.recommendation}`);
      outputChannel.appendLine('');
    });
  }

  outputChannel.show();

  // Mostrar notificación
  const criticalCount = result.criticalFindings || 0;
  const highCount = result.highFindings || 0;

  if (criticalCount > 0) {
    vscode.window.showErrorMessage(
      `❌ ${criticalCount} problemas CRÍTICOS encontrados. Ver output.`
    );
  } else if (highCount > 0) {
    vscode.window.showWarningMessage(
      `⚠️ ${highCount} problemas de ALTA severidad. Ver output.`
    );
  } else {
    vscode.window.showInformationMessage(
      `✅ Análisis completado. Sin problemas críticos.`
    );
  }
}

function groupBySeverity(findings: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {
    'CRÍTICA': [],
    'ALTA': [],
    'MEDIA': [],
    'BAJA': []
  };

  findings.forEach(f => {
    const severity = f.severity || 'MEDIA';
    if (grouped[severity]) {
      grouped[severity].push(f);
    }
  });

  return grouped;
}
```

### 4. src/diagnostics/diagnosticProvider.ts

```typescript
import * as vscode from 'vscode';
import { Orchestrator } from '../orchestrator/orchestrator';
import { Logger } from '../utils/logger';

const logger = new Logger('DiagnosticProvider');
const diagnosticCollection = vscode.languages.createDiagnosticCollection('syntaxis');

export function registerDiagnosticProvider(context: vscode.ExtensionContext) {
  // Registrar para cambios en documento abierto
  vscode.workspace.onDidChangeTextDocument(
    debounce((e) => updateDiagnostics(e.document), 1000),
    null,
    context.subscriptions
  );

  // Registrar para archivo abierto
  vscode.window.onDidChangeActiveTextEditor(
    (e) => {
      if (e) {
        updateDiagnostics(e.document);
      }
    },
    null,
    context.subscriptions
  );
}

async function updateDiagnostics(document: vscode.TextDocument) {
  // Solo archivos relevantes
  if (!['csharp', 'javascript', 'typescript'].includes(document.languageId)) {
    diagnosticCollection.clear();
    return;
  }

  try {
    const orchestrator = new Orchestrator();
    const result = await orchestrator.analyze({
      code: document.getText(),
      filePath: document.fileName,
      fileType: document.languageId
    });

    // Convertir findings a diagnostics
    const diagnostics: vscode.Diagnostic[] = [];

    result.findings.forEach((finding: any) => {
      const severity = mapSeverity(finding.severity);
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(
          new vscode.Position(finding.lineNumber - 1, 0),
          new vscode.Position(finding.lineNumber - 1, 100)
        ),
        finding.description,
        severity
      );

      diagnostic.source = 'Syntaxis';
      diagnostic.code = finding.article;
      diagnostic.relatedInformation = [
        new vscode.DiagnosticRelatedInformation(
          new vscode.Location(document.uri, new vscode.Position(0, 0)),
          `${finding.law} - ${finding.article}`
        )
      ];

      diagnostics.push(diagnostic);
    });

    diagnosticCollection.set(document.uri, diagnostics);

  } catch (error) {
    logger.error('Error en diagnostics:', error);
  }
}

function mapSeverity(severity: string): vscode.DiagnosticSeverity {
  switch (severity) {
    case 'CRÍTICA':
    case 'ALTA':
      return vscode.DiagnosticSeverity.Error;
    case 'MEDIA':
      return vscode.DiagnosticSeverity.Warning;
    case 'BAJA':
      return vscode.DiagnosticSeverity.Information;
    default:
      return vscode.DiagnosticSeverity.Hint;
  }
}

function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}
```

### 5. src/panels/sidePanel.ts (Panel Lateral)

```typescript
import * as vscode from 'vscode';
import { Logger } from '../utils/logger';

const logger = new Logger('SidePanel');

export function initializeSidePanel(context: vscode.ExtensionContext) {
  const provider = new SidePanelProvider(context);
  
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'syntaxisPanel',
      provider
    )
  );
}

class SidePanelProvider implements vscode.WebviewViewProvider {
  constructor(private context: vscode.ExtensionContext) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): void {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri]
    };

    webviewView.webview.html = this.getHtmlContent();

    // Escuchar mensajes desde webview
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case 'checkFile':
          vscode.commands.executeCommand('syntaxis.checkFile');
          break;
        case 'checkWorkspace':
          vscode.commands.executeCommand('syntaxis.checkWorkspace');
          break;
        case 'generateReport':
          vscode.commands.executeCommand('syntaxis.generateReport');
          break;
        case 'openSettings':
          vscode.commands.executeCommand('workbench.action.openSettings', 
            '@ext:syntaxis.syntaxis-compliance-checker');
          break;
      }
    });
  }

  private getHtmlContent(): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; margin: 0; padding: 10px; }
            .btn { width: 100%; padding: 10px; margin: 5px 0; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
            .btn-primary { background: #007acc; color: white; }
            .btn-primary:hover { background: #005a9e; }
            .btn-secondary { background: #6c757d; color: white; }
            .btn-secondary:hover { background: #5a6268; }
            .divider { margin: 15px 0; border-top: 1px solid #ddd; }
            .info { padding: 10px; background: #f0f0f0; border-left: 3px solid #0078d4; border-radius: 3px; }
            .title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="title">🔍 Syntaxis Compliance</div>
          
          <div class="info">
            Revisa tu código contra Ley 21.719 y 21.663
          </div>
          
          <div class="divider"></div>
          
          <button class="btn btn-primary" onclick="sendCommand('checkFile')">
            ✓ Revisar Archivo Actual
          </button>
          
          <button class="btn btn-primary" onclick="sendCommand('checkWorkspace')">
            ✓ Revisar Workspace Completo
          </button>
          
          <button class="btn btn-secondary" onclick="sendCommand('generateReport')">
            📊 Generar Reporte
          </button>
          
          <button class="btn btn-secondary" onclick="sendCommand('openSettings')">
            ⚙️ Configuración
          </button>
          
          <div class="divider"></div>
          
          <div class="info">
            <strong>Leyes:</strong><br>
            • Ley 21.719 (Datos)<br>
            • Ley 21.663 (Ciberseguridad)<br><br>
            <strong>Versión:</strong> 1.0.0
          </div>

          <script>
            const vscode = acquireVsCodeApi();
            
            function sendCommand(command) {
              vscode.postMessage({ command });
            }
          </script>
        </body>
      </html>
    `;
  }
}
```

---

## TESTING LOCAL

### Paso 1: Ejecutar en Modo Debug

```bash
# Desde la carpeta de la extensión
npm run compile

# En VS Code: Presiona F5
# Se abrirá una "Extension Development Host" window
```

### Paso 2: Probar Comandos

En la ventana nueva de VS Code (Extension Development Host):

```
1. Crea un archivo de prueba: vulnerable-code.cs

2. Presiona Ctrl+Shift+P (Cmd+Shift+P en Mac)

3. Escribe: "syntaxis"
   Deberías ver los comandos:
   - Syntaxis: Revisar archivo actual
   - Syntaxis: Revisar workspace completo
   - Syntaxis: Analizar BD conectada
   - Syntaxis: Generar reporte de compliance

4. Selecciona "Revisar archivo actual"

5. Debería mostrar:
   ✅ Output panel con resultados
   ✅ Líneas subrayadas en rojo/amarillo
   ✅ Notificación de problemas encontrados
```

### Paso 3: Ver Output en Tiempo Real

```
1. En la ventana de Extension Development Host:
   Ctrl+` (backtick) para abrir terminal

2. Verás dos tabs:
   - "Syntaxis Compliance Checker": Output del plugin
   - "Extension Development Host": Logs de VS Code

3. Cuando ejecutes un comando, verás logs como:
   [13:45:23] Extension:0 - Syntaxis Compliance Checker activado
   [13:45:25] CheckFile - Revisando archivo: /path/to/file.cs
   [13:45:26] DiagnosticProvider - Actualizando diagnósticos
```

### Paso 4: Testing Manual con Archivos Vulnerables

Crea un archivo `test-code.cs`:

```csharp
// ❌ PROBLEMA 1: Email sin cifrado
public class UserRepository {
  public async Task<User> GetUserAsync(int id) {
    // Problema: email en plaintext
    var query = "SELECT Email FROM Users WHERE Id = " + id;
    return await db.Query<User>(query).FirstOrDefaultAsync();
  }
}

// ❌ PROBLEMA 2: Contraseña hardcoded
private const string PASSWORD = "admin123"; // ❌ CRÍTICA

// ❌ PROBLEMA 3: Sin autenticación
[HttpGet("users/{id}")]
public IActionResult GetUser(int id) { // ❌ Falta [Authorize]
  return Ok(_db.Users.Find(id));
}
```

Al revisar este archivo:
1. Deberías ver 3 líneas subrayadas
2. Al hacer hover, muestra el problema
3. En Output panel muestra detalles

---

## INSTALACIÓN EN PRODUCCIÓN

### Opción 1: Desde VS Code Marketplace

```
Este es el flujo FINAL cuando se publique:

1. Abrir VS Code
2. Ir a Extensions (Ctrl+Shift+X)
3. Buscar: "Syntaxis Compliance Checker"
4. Hacer clic en "Install"
5. Automáticamente descargará e instalará
```

### Opción 2: Instalar desde Archivo .vsix

Si quieres instalar una versión custom sin pasar por Marketplace:

```bash
# Primero, empaquetar la extensión
npm run package
# Genera: syntaxis-compliance-checker-1.0.0.vsix

# Luego, instalar en VS Code
code --install-extension ./syntaxis-compliance-checker-1.0.0.vsix

# O en VS Code:
# Ctrl+Shift+X (Extensions)
# ... (menú de tres puntos)
# Install from VSIX...
# Selecciona el archivo
```

### Opción 3: Instalar desde Repositorio Git

```bash
# Clonar el repo completo
git clone https://github.com/syntaxis-spa/compliance-checker.git
cd compliance-checker

# Instalar workspace
npm install

# Instalar extensión localmente
npm run install:extension

# VS Code reconocerá la extensión automáticamente
```

---

## SOLUCIÓN DE PROBLEMAS

### Problema 1: "Extensión no se activa"

**Síntomas:**
- Los comandos no aparecen en Ctrl+Shift+P
- No hay panel lateral

**Solución:**

```bash
# 1. Limpiar build
rm -rf out/
rm -rf node_modules/

# 2. Reinstalar
npm install
npm run compile

# 3. Recargar ventana
En VS Code: Ctrl+Shift+P → "Developer: Reload Window"

# 4. Verificar package.json
Asegurate que "main": "./out/extension.js" existe

# 5. Ver logs
Ctrl+Shift+P → "Developer: Toggle Developer Tools"
Buscar errores en console
```

### Problema 2: "Module not found: orchestrator"

**Síntomas:**
- Error: Cannot find module '../orchestrator/orchestrator'

**Solución:**

```bash
# El archivo orchestrator.ts debe existir en src/orchestrator/
# Si no existe, crear:

mkdir -p src/orchestrator
touch src/orchestrator/orchestrator.ts

# O si existe pero no compila:
npm run compile

# Si sigue sin funcionar:
# Verificar imports relativos en extension.ts
```

### Problema 3: "Diagnósticos no aparecen"

**Síntomas:**
- Archivo se abre pero no hay líneas subrayadas

**Solución:**

```bash
# 1. Verificar que el archivo es .cs, .js, o .ts
# El provider solo trabaja con estos tipos

# 2. Abrir Output panel
Ctrl+` (backtick)

# 3. Seleccionar "Syntaxis Compliance" channel
Buscar línea que diga: "Actualizando diagnósticos"

# 4. Si dice "unknown" file type:
# El archivo no es reconocido

# 5. Probar con archivo conocido:
# Crea test.cs o test.js
```

### Problema 4: "Database connection failed"

**Síntomas:**
- "Analyze Database" command falla
- "Error connecting to SQL Server"

**Solución:**

```bash
# 1. Verificar configuración
Ctrl+, (Settings)
Buscar: "syntaxis"

# 2. Completar:
syntaxis.sqlServerHost = "localhost"
syntaxis.sqlServerUser = "sa"
syntaxis.sqlServerPassword = "..."

# 3. Verificar que el servidor está corriendo:
# Abre terminal:
sqlcmd -S localhost -U sa -P YourPassword

# 4. Si no tienes servidor local:
# Es opcional. Solo necesario para análisis de BD
```

---

## EJEMPLOS DE USO

### Ejemplo 1: Análisis en Tiempo Real

```
1. Abrir VS Code con extensión instalada

2. Crear archivo: user-service.cs

3. Escribir código inseguro:
   var email = userInput; // SIN CIFRADO

4. INMEDIATAMENTE (1 seg):
   - Línea se subraya en rojo
   - Al hacer hover: tooltip con problema
   - Output channel: "Diagnóstico actualizado"

5. El problema desaparece cuando corriges:
   var email = EncryptEmail(userInput);

6. Panel lateral muestra:
   - 0 CRÍTICA
   - 0 ALTA
   - Barra verde: "Compliance OK"
```

### Ejemplo 2: Revisar Archivo Completo

```
1. Ctrl+Shift+P → "Syntaxis: Revisar archivo actual"

2. Se muestra progreso: "Syntaxis: Analizando..." (3 segundos)

3. Al terminar:
   ✅ Output panel abre automáticamente
   ✅ Muestra tabla:
      CRÍTICA (2)
      • Email sin cifrado en línea 45
        Art. 18 Ley 21.719
        Recomendación: Usar AES-256
      
      ALTA (1)
      • SQL Injection vulnerable
        ...

4. Hacer clic en el enlace:
   Va a la línea problemática en editor
```

### Ejemplo 3: Generar Reporte

```
1. Ctrl+Shift+P → "Syntaxis: Generar reporte"

2. Se crea archivo: compliance-report-2026-05-25.json

3. Contiene:
   {
     "agentName": "DPA Agent",
     "law": "Ley 21.719",
     "executedAt": "2026-05-25T14:30:00Z",
     "totalFindings": 5,
     "criticalFindings": 2,
     "status": "FAIL",
     "findings": [...]
   }

4. Puedes:
   - Guardar para auditoría
   - Compartir con equipo
   - Importar en herramienta de tracking
```

---

## CONFIGURACIÓN AVANZADA

### .env Local (Desarrollo)

Crea archivo `.env` en raíz de extensión:

```bash
# SQL Server
SQL_SERVER_HOST=localhost
SQL_SERVER_PORT=1433
SQL_SERVER_DATABASE=CompanyDB
SQL_SERVER_USER=sa
SQL_SERVER_PASSWORD=Your@Password123!
SQL_SERVER_ENCRYPT=true

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=compliance_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_SSL=require

# Debug
DEBUG=syntaxis:*
LOG_LEVEL=debug

# Orquestador
ORCHESTRATOR_PORT=3001
ORCHESTRATOR_HOST=localhost
```

### settings.json de VS Code

Si quieres que la extensión auto-configure:

```json
// En settings.json (Ctrl+,):
{
  "syntaxis.enableRealTimeCheck": true,
  "syntaxis.blockCriticalIssues": true,
  "syntaxis.autoGenerateReports": false,
  "syntaxis.reportDirectory": "${workspaceFolder}/compliance-reports",
  "[csharp]": {
    "editor.defaultFormatter": "ms-dotnettools.csharp",
    "editor.formatOnSave": true
  }
}
```

---

## PRÓXIMOS PASOS

### Después de Instalar Localmente

1. **Probar comandos básicos** (30 min)
   - Revisar archivo
   - Ver output
   - Hacer hover

2. **Customizar configuración** (15 min)
   - Conectar a tu BD
   - Ajustar severidades

3. **Compartir con equipo** (1 día)
   - Distribuir .vsix
   - Crear guía interna

4. **Dar feedback** (Ongoing)
   - Reportar bugs
   - Sugerir mejoras

---

## RESUMEN RÁPIDO

| Tarea | Comando |
|-------|---------|
| **Instalar deps** | `npm install` |
| **Compilar** | `npm run compile` |
| **Testear** | Presiona `F5` |
| **Ver logs** | `Ctrl+` ` |
| **Empaquetar** | `npm run package` |
| **Ver problemas** | `Ctrl+Shift+P` → "Syntaxis" |

---

**¿Preguntas o problemas durante instalación? Revisar sección "Solución de Problemas" o reportar issue en GitHub.**
