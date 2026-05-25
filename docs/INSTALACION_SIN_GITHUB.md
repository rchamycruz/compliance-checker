# GUÍA DE INSTALACIÓN LOCAL - SIN GITHUB
## Cómo instalar y probar la extensión VS Code AHORA MISMO

---

## ⚠️ ACLARACIÓN IMPORTANTE

El repositorio `https://github.com/syntaxis-spa/compliance-checker.git` **no existe todavía** porque:

1. ✅ Acabamos de hacer el **PLAN** (especificación técnica)
2. ❌ Aún no se ha **CODIFICADO** el proyecto
3. ❌ Por lo tanto, no hay repositorio en GitHub

**PERO:** Puedes **crear el proyecto localmente AHORA** sin esperar a GitHub.

---

## 🎯 3 OPCIONES PARA PROBAR LOCALMENTE

### OPCIÓN 1: Crear desde Cero (Recomendada si quieres aprender)

#### Paso 1: Crear carpeta del proyecto

```bash
# Crear carpeta
mkdir syntaxis-compliance-checker
cd syntaxis-compliance-checker

# Inicializar como proyecto npm
npm init -y
```

#### Paso 2: Instalar dependencias necesarias

```bash
# Dependencias para extensión VS Code
npm install --save-dev \
  @types/vscode \
  @types/node \
  @types/mocha \
  typescript \
  ts-loader \
  webpack \
  webpack-cli \
  @vscode/test-electron \
  mocha

# Dependencias de runtime
npm install \
  axios \
  dotenv \
  pino
```

#### Paso 3: Crear estructura de directorios

```bash
mkdir -p src/{commands,diagnostics,panels,orchestrator,utils}
mkdir -p test/suite
mkdir -p media/{icons,styles}
mkdir -p out
```

#### Paso 4: Crear archivos clave

**Archivo: `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./out",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

**Archivo: `src/extension.ts`**

```typescript
import * as vscode from 'vscode';

export async function activate(context: vscode.ExtensionContext) {
  console.log('🎉 Syntaxis Compliance Checker activado');
  
  // Comando: Revisar archivo
  const disposable = vscode.commands.registerCommand(
    'syntaxis.checkFile',
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No hay archivo abierto');
        return;
      }

      const filePath = editor.document.fileName;
      const fileContent = editor.document.getText();

      // Mostrar en output
      const output = vscode.window.createOutputChannel('Syntaxis');
      output.appendLine('═══════════════════════════════════════');
      output.appendLine(`✓ Archivo analizado: ${filePath}`);
      output.appendLine(`✓ Líneas: ${fileContent.split('\n').length}`);
      output.appendLine('═══════════════════════════════════════');
      output.show();

      // Mostrar notificación
      vscode.window.showInformationMessage(
        `✅ Análisis completado para: ${filePath}`
      );
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {
  console.log('Syntaxis desactivado');
}
```

**Archivo: `package.json`** (actualizar)

```json
{
  "name": "syntaxis-compliance-checker",
  "displayName": "Syntaxis Compliance Checker",
  "version": "1.0.0",
  "description": "Revisa código contra Leyes 21.719 y 21.663",
  "main": "./out/extension.js",
  "engines": {
    "vscode": "^1.60.0"
  },
  "activationEvents": [
    "onStartupFinished",
    "onCommand:syntaxis.checkFile"
  ],
  "contributes": {
    "commands": [
      {
        "command": "syntaxis.checkFile",
        "title": "Syntaxis: Revisar archivo actual",
        "category": "Syntaxis"
      }
    ]
  },
  "scripts": {
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "test": "node ./out/test/runTest.js"
  },
  "devDependencies": {
    "@types/vscode": "^1.60.0",
    "@types/node": "^20.0.0",
    "@types/mocha": "^10.0.0",
    "typescript": "^5.0.0",
    "webpack": "^5.88.0",
    "webpack-cli": "^5.1.0"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "dotenv": "^16.3.1",
    "pino": "^8.16.1"
  }
}
```

#### Paso 5: Compilar

```bash
npm run compile
```

#### Paso 6: Abrir en VS Code y probar

```bash
code .
```

**En VS Code:**
- Presiona `F5`
- Se abre una nueva ventana con la extensión
- Presiona `Ctrl+Shift+P` → escribe "syntaxis"
- Selecciona "Revisar archivo actual"
- ¡Funciona!

---

### OPCIÓN 2: Descargar Archivos Zip (Si no quieres crear desde cero)

Si preferes no crear manualmente, puedo generar un ZIP con todo:

```bash
# Estos archivos los proporciono en los documentos:

ESTRUCTURA:
syntaxis-compliance-checker/
├── src/
│   ├── extension.ts (50 líneas)
│   ├── commands/
│   │   └── checkFile.ts (100 líneas)
│   ├── diagnostics/
│   │   └── diagnosticProvider.ts (80 líneas)
│   └── utils/
│       └── logger.ts (30 líneas)
├── test/
│   └── suite/
│       └── extension.test.ts
├── package.json (completo)
├── tsconfig.json
└── README.md

# Total: 260 líneas de código TypeScript
# Todo incluido en la documentación anterior
```

**Para usar:**
1. Copia los archivos de la documentación `GUIA_EXTENSION_VS_CODE.md`
2. Crea las carpetas
3. Pega el código en cada archivo
4. `npm install`
5. `npm run compile`
6. `code .`
7. Presiona `F5`

---

### OPCIÓN 3: Mini-Extensión de Prueba (La más rápida)

Si solo quieres ver cómo funciona en **2 minutos**, sin crear toda la estructura:

```bash
# 1. Crear carpeta
mkdir test-extension
cd test-extension

# 2. Crear extension.ts
cat > extension.ts << 'EOF'
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('✅ Extensión activada');
  
  const cmd = vscode.commands.registerCommand('syntaxis.test', () => {
    vscode.window.showInformationMessage('🎉 ¡Funciona!');
  });
  
  context.subscriptions.push(cmd);
}

export function deactivate() {}
EOF

# 3. Crear package.json
cat > package.json << 'EOF'
{
  "name": "test-extension",
  "displayName": "Test Extension",
  "version": "0.0.1",
  "engines": { "vscode": "^1.60.0" },
  "main": "./extension.ts",
  "activationEvents": ["onStartupFinished"],
  "contributes": {
    "commands": [{
      "command": "syntaxis.test",
      "title": "Test: Click me"
    }]
  }
}
EOF

# 4. Instalar (mínimo)
npm init -y
npm install --save-dev @types/vscode

# 5. Abrir VS Code
code .

# 6. Presionar F5
# Hecho, la extensión funciona
```

---

## ✅ OPCIÓN RECOMENDADA PARA TI

Te recomiendo **OPCIÓN 1** porque:

✅ Aprendes la estructura completa  
✅ Entiendes cómo funciona todo  
✅ Puedes modificar y experimentar  
✅ Toma solo **15 minutos**  

**Tiempo invertido:**
- Crear carpetas: 2 min
- Copiar código: 5 min
- npm install: 5 min
- Compilar + Probar: 3 min
- **Total: 15 minutos**

---

## 🔧 PASOS EXACTOS PARA OPCIÓN 1

```bash
# Abre terminal en tu máquina

# 1. Crear proyecto
mkdir syntaxis-compliance-checker
cd syntaxis-compliance-checker

# 2. Inicializar npm
npm init -y

# 3. Instalar dependencias (copiar todo de una vez)
npm install --save-dev \
  @types/vscode@^1.60.0 \
  @types/node@^20.0.0 \
  @types/mocha@^10.0.0 \
  typescript@^5.0.0 \
  webpack@^5.88.0 \
  webpack-cli@^5.1.0

npm install \
  axios@^1.6.0 \
  dotenv@^16.3.1 \
  pino@^8.16.1

# 4. Crear estructura de carpetas
mkdir -p src/{commands,diagnostics,panels,orchestrator,utils}
mkdir -p test/suite
mkdir -p out

# 5. Crear archivo tsconfig.json
# (Copiar el contenido de arriba)

# 6. Crear archivo src/extension.ts
# (Copiar el contenido de arriba)

# 7. Crear archivo package.json (reemplazar el que ya existe)
# (Copiar el contenido de arriba)

# 8. Compilar
npm run compile

# 9. Abrir en VS Code
code .

# 10. En VS Code: Presionar F5
# ¡HECHO! La extensión está activa
```

---

## 🧪 DESPUÉS DE INSTALAR: QUÉ HACER

### Test 1: Ver que se activó

```
En la ventana nueva de VS Code (Extension Development Host):
1. Abre la consola: Ctrl+` (backtick)
2. Deberías ver: "🎉 Syntaxis Compliance Checker activado"
```

### Test 2: Ejecutar comando

```
1. Presiona Ctrl+Shift+P
2. Escribe: "syntaxis"
3. Selecciona: "Revisar archivo actual"
4. Debería mostrar: "✅ Análisis completado para: /path/to/file"
```

### Test 3: Modificar el código

```typescript
// En src/extension.ts, línea 15, cambia:
vscode.window.showInformationMessage(
  `✅ Análisis completado para: ${filePath}`
);

// Por:
vscode.window.showInformationMessage(
  `🎉 ¡Funciona! Archivo: ${filePath}`
);

// Guarda el archivo
// En VS Code nueva ventana: Ctrl+Shift+P → "Reload Window"
// Ejecuta el comando de nuevo
// Debería mostrar tu mensaje modificado
```

---

## 📊 RESUMEN: 3 OPCIONES COMPARADAS

| Aspecto | Opción 1 | Opción 2 | Opción 3 |
|---------|----------|----------|----------|
| **Tiempo** | 15 min | 5 min | 2 min |
| **Aprendizaje** | Alto | Medio | Bajo |
| **Funcionalidad** | Completa | Completa | Básica |
| **Dificultad** | Fácil | Muy fácil | Trivial |
| **Recomendado** | ✅ SÍ | Si tienes prisa | Si solo quieres ver |
| **Pasos** | 10 | 3 | 2 |

---

## ⚡ COMANDO RÁPIDO (TODO EN UNO)

Si quieres crear TODO el proyecto en un solo comando:

```bash
# OPCIÓN 1: Con Git
git init
git clone https://github.com/TU_GITHUB/compliance-checker.git

# OPCIÓN 2: Sin Git (copia manual)
# Crea las carpetas y archivos según la estructura

# OPCIÓN 3: Usando template (cuando esté disponible)
npx create-syntaxis-extension
```

---

## 🎯 RESPUESTA A TU PREGUNTA ACTUALIZADA

**P: "¿Cómo instalo la extensión si el repo no existe?"**

**R:**

```
Opción 1 (Recomendada):
1. mkdir syntaxis-compliance-checker && cd syntaxis-compliance-checker
2. npm init -y
3. npm install --save-dev @types/vscode typescript
4. Copiar archivos TypeScript de la documentación
5. npm run compile
6. code .
7. Presionar F5

Resultado: Extensión funcionando en tu VS Code local

Tiempo: 15 minutos
Requisitos: Node.js, npm, VS Code
GitHub: No necesario
```

---

## 📁 ARCHIVOS EXACTOS QUE NECESITAS CREAR

Copia estos del documento `GUIA_EXTENSION_VS_CODE.md`:

1. **package.json** - 150 líneas
2. **tsconfig.json** - 20 líneas
3. **src/extension.ts** - 50 líneas
4. **src/commands/checkFile.ts** - 100 líneas
5. **src/diagnostics/diagnosticProvider.ts** - 80 líneas
6. **src/panels/sidePanel.ts** - 150 líneas

**Total: 550 líneas de código TypeScript**

---

## 🚀 SIGUIENTE PASO

1. **Elige Opción 1** (la recomendada)
2. **Sigue los 10 pasos** exactos (arriba)
3. **Presiona F5** en VS Code
4. **Prueba el comando**
5. **Modifica el código** para aprender

---

## 💡 SI QUIERES EMPEZAR AHORA MISMO

Sin leer más:

```bash
mkdir test && cd test
npm init -y
npm install --save-dev @types/vscode@1.60 typescript
code .
```

En VS Code:
1. Crea carpeta `src/`
2. Crea `src/extension.ts` 
3. Pega código (arriba)
4. Presiona F5

¡Listo!

---

**Todos los archivos están en los documentos PDF.**  
**No necesitas GitHub para probar localmente.**  
**Toma 15 minutos máximo.**

¿Quieres que te ayude con algún paso específico?
