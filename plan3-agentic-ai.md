# Plan 3: Diagnóstico y corrección del modo IA — "GitHub Copilot no encontrado"
> Análisis realizado con Claude Opus 4.6 · Implementación con Claude Sonnet 4.6

## Problema reportado

- Seleccionar modo `ai` → el reporte sale igual que `static` (sin diferencia visible)
- `Syntaxis: Verificar conexión con IA` → `⚠️ GitHub Copilot no encontrado`
- El usuario **sí** tiene GitHub Copilot activo y autenticado en VS Code

---

## Diagnóstico: 8 causas raíz — análisis Opus 4.6

---

### 🔴 BUG #1 — CRÍTICA: `selectChatModels` devuelve vacío — causa raíz del "Copilot no encontrado"

**Archivos**: `packages/vscode-extension/package.json`

La `vscode.lm` Language Model API es **provista por `github.copilot-chat`**, no por `github.copilot` (completions inline). El `package.json` de la extensión no declara `extensionDependencies`, por lo que:
- VS Code no garantiza que Copilot Chat esté activo al activarse Syntaxis
- En VS Code 1.93+, `selectChatModels` requiere consentimiento explícito del usuario; sin `extensionDependencies`, ese diálogo puede no aparecer nunca
- Si `vscode.lm` es `undefined` (VS Code < 1.93 o LM API no inicializada), `.selectChatModels()` lanza `TypeError` que el `catch {}` silencia

**El usuario tiene Copilot (inline) activo pero probablemente NO tiene Copilot Chat instalado. Son dos extensiones distintas.**

**Fix — `package.json`:**
```json
"extensionDependencies": ["github.copilot-chat"]
```

---

### 🔴 BUG #2 — CRÍTICA: `catch {}` silencioso → reporte vacío parece "PASS" = "igual a regex"

**Archivo**: `packages/vscode-extension/src/ai-client.ts`, línea 182

```typescript
} catch {
  findings = [];  // ← swallows ALL errors — cualquier fallo = 0 hallazgos = PASS
}
```

Cuando Copilot falla, `buildAgentReport` recibe `findings = []` y genera `status: 'PASS'` con `summary: "✅ Sin problemas detectados"`. El reporte HTML/MD muestra la misma plantilla visual que un archivo limpio → **el usuario lo percibe como "igual que regex"** (no es un fallback a regex; es que reporta cero hallazgos con apariencia de PASS).

**Fix — propagar el error:**
```typescript
} catch (err: unknown) {
  // Relanzar para que checkFile/generateReport muestren feedback accionable
  throw err instanceof Error ? err : new Error('Error en análisis con Copilot');
}
```

---

### 🟠 BUG #3 — ALTA: API de streaming incorrecta (`response` vs `response.text`)

**Archivo**: `packages/vscode-extension/src/ai-client.ts`, línea 177

```typescript
// ❌ Itera sobre el response directamente
for await (const part of response) {
  const text = part?.value ?? part?.text ?? '';
```

Desde VS Code 1.93, `LanguageModelChatResponse` expone el stream como `response.text: AsyncIterable<string>`. Iterar sobre `response` directamente puede producir chunks vacíos o fallar silenciosamente según la versión.

**Fix:**
```typescript
// ✅ API correcta para VS Code 1.93+
for await (const fragment of response.text) {
  if (fragment) { chunks.push(fragment); }
}
```

---

### 🟠 BUG #4 — ALTA: doble llamada a `analyzeWithAI` en `checkFile`

**Archivo**: `packages/vscode-extension/src/extension.ts`, líneas 714–717

```typescript
const result = await analyzeWithAI(...);          // ← 1ª llamada al LLM
_aiFindings.set(uri, ...);
refreshDiagnostics(ed.document);                  // ← 2ª llamada (refreshDiagnostics en modo ai llama analyzeWithAI otra vez)
printReport(report);
```

Cada `checkFile` en modo AI dispara **dos requests al LLM** — duplicando costos y latencia.

**Fix:** En `checkFile` modo AI, aplicar los diagnostics directamente desde los findings ya obtenidos en vez de delegar en `refreshDiagnostics`:
```typescript
// Aplicar diagnostics con los findings del result ya disponible
applyAIDiagnostics(ed.document, report.agentReports.flatMap(a => a.findings));
```
Extraer la lógica de diagnostics a una función `applyAIDiagnostics(doc, findings)` compartida.

---

### 🟠 BUG #5 — ALTA: `@types/vscode` demasiado antiguo (`^1.60.0`)

**Archivo**: `packages/vscode-extension/package.json`

La `vscode.lm` API se introdujo en **1.90**, `LanguageModelChatMessage` y `response.text` en **1.93**. Con tipos `^1.60.0`:
- Todo el código de LM usa `(vscode.lm as any)` → sin type-safety
- El compilador no detecta usos incorrectos de la API
- `vscode.LanguageModelChatMessage.User(prompt)` puede no estar en los tipos → build pasa por ser `as any` pero runtime falla

**Fix:**
```json
"@types/vscode": "^1.93.0"
```
Esto también elimina todos los casts `as any` en `vscode.lm`.

---

### 🟡 BUG #6 — MEDIA: `verificarConexión` solo prueba `gpt-4o` (false negative)

**Archivo**: `packages/vscode-extension/src/extension.ts`, línea 1019

El test de conexión solo verifica `family: 'gpt-4o'`, mientras el análisis real itera `['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'claude-3-5-sonnet']`. Si el plan del usuario incluye `claude-3-5-sonnet` pero no `gpt-4o`, el test reporta "no encontrado" aunque el análisis sí funcionaría.

**Fix:** usar la misma lógica de iteración en el test de conexión, reportar qué modelo se encontró:
```typescript
let foundFamily: string | undefined;
for (const family of ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'claude-3-5-sonnet']) {
  const models = await (vscode.lm as any).selectChatModels({ vendor: 'copilot', family });
  if (models?.length > 0) { foundFamily = family; break; }
}
if (foundFamily) {
  vscode.window.showInformationMessage(`✅ GitHub Copilot Chat disponible — modelo: ${foundFamily}`);
} else {
  vscode.window.showWarningMessage(
    '⚠️ GitHub Copilot Chat no encontrado. ' +
    'Verifica que tienes la extensión "GitHub Copilot Chat" instalada (distinta a Copilot inline), ' +
    'estás autenticado y tu plan incluye acceso al Chat.'
  );
}
```

---

### 🟡 BUG #7 — MEDIA: auto-diagnóstico en cada keystroke con LLM (debounce 2s)

**Archivo**: `packages/vscode-extension/src/extension.ts`, línea 632

```typescript
const delay = _settingsManager?.getAnalysisMode() === 'ai' ? 2000 : 800;
```

Con modo AI activo, cada vez que el usuario escribe y pausa 2 segundos, se lanza una request al LLM. Con archivos de trabajo normales, esto genera decenas de requests por sesión, saturando la API de Copilot.

**Fix:** Deshabilitar el trigger automático en modo AI (solo análisis explícito por comando) o aumentar el debounce a 30s con opción de configuración:
```typescript
// No disparar refresh automático en modo AI — solo on-demand
if (mode === 'ai') { return; }  // en debouncedRefresh
```

---

### 🟡 BUG #8 — MEDIA: `checkWorkspace` siempre usa análisis estático, ignora modo AI

**Archivo**: `packages/vscode-extension/src/extension.ts`, línea 758

```typescript
const r = analyzeCode(doc.getText(), files[i].fsPath, { globalAuthFilter });
// ↑ siempre estático, nunca llama analyzeWithAI aunque mode === 'ai'
```

El comando `checkWorkspace` ignora completamente `analysisMode`. El usuario que configura modo AI espera que el workspace también use IA.

**Fix:** Respetar `analysisMode` en `checkWorkspace`, con advertencia de costo/latencia:
```typescript
if (aiMode) {
  // Analizar cada archivo con IA (con nota de que puede tardar)
  const result = await analyzeWithAI(doc.getText(), files[i].fsPath, fileType, _settingsManager!);
  // merge results...
} else {
  const r = analyzeCode(doc.getText(), files[i].fsPath, { globalAuthFilter });
}
```

### 🆕 FEATURE #9 — Selector de modelo completo por proveedor

**Problema del diseño anterior:** el enum estático de `package.json` solo listaba unos pocos modelos y no puede actualizarse dinámicamente. Solución en dos partes:

#### Parte A — enum completo en `package.json` (autocompletion en Settings UI)

```json
"syntaxis.ai.model": {
  "type": "string",
  "default": "auto",
  "markdownDescription": "Modelo a usar. Para **GitHub Copilot** usa `auto` o elige uno de los disponibles con el comando _Syntaxis: Seleccionar modelo de IA_. Para **OpenAI/Anthropic/Azure** escribe el ID exacto del modelo o usa el comando para ver la lista.",
  "enum": [
    "auto",
    "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano",
    "o1", "o1-mini", "o3", "o3-mini", "o4-mini",
    "claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest",
    "claude-3-7-sonnet-latest",
    "claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5",
    "claude-opus-4-6", "claude-sonnet-4-6"
  ],
  "enumDescriptions": [
    "Automático: prueba modelos disponibles en orden (solo Copilot)",
    "GPT-4o — OpenAI (Copilot o API directa)",
    "GPT-4o mini — OpenAI (Copilot o API directa)",
    "GPT-4 Turbo — OpenAI API",
    "GPT-4.1 — OpenAI API",
    "GPT-4.1 mini — OpenAI API",
    "GPT-4.1 nano — OpenAI API",
    "o1 — OpenAI (Copilot o API directa)",
    "o1-mini — OpenAI (Copilot o API directa)",
    "o3 — OpenAI API",
    "o3-mini — OpenAI (Copilot o API directa)",
    "o4-mini — OpenAI API",
    "Claude 3.5 Sonnet (latest) — Anthropic API / Copilot",
    "Claude 3.5 Haiku (latest) — Anthropic API",
    "Claude 3 Opus (latest) — Anthropic API",
    "Claude 3.7 Sonnet (latest) — Anthropic API / Copilot",
    "Claude Opus 4.5 — Anthropic API",
    "Claude Sonnet 4.5 — Anthropic API",
    "Claude Haiku 4.5 — Anthropic API",
    "Claude Opus 4.6 — Anthropic API",
    "Claude Sonnet 4.6 — Anthropic API"
  ]
}
```

> **Nota:** el usuario también puede escribir libremente un ID de modelo que no esté en la lista (p.ej. un modelo Azure desplegado, o versiones nuevas de Anthropic). El campo acepta cualquier string.

#### Parte B — comando `Syntaxis: Seleccionar modelo de IA` (QuickPick dinámico)

Nuevo comando `syntaxis.selectAIModel` que:

1. **Para GitHub Copilot**: llama `vscode.lm.selectChatModels({ vendor: 'copilot' })` **sin filtro de `family`** para obtener TODOS los modelos realmente disponibles en la suscripción del usuario → muestra QuickPick con los IDs reales
2. **Para OpenAI/Anthropic**: muestra la misma lista del enum pero en un QuickPick más cómodo
3. Al elegir, actualiza `syntaxis.ai.model` via `vscode.workspace.getConfiguration('syntaxis').update('ai.model', chosen, true)`

```typescript
// extension.ts — nuevo comando
context.subscriptions.push(
  vscode.commands.registerCommand('syntaxis.selectAIModel', async () => {
    const provider = _settingsManager!.getAIProvider();
    let items: vscode.QuickPickItem[];

    if (provider === 'github-copilot') {
      // Descubrimiento dinámico de modelos disponibles
      const allModels = await vscode.lm.selectChatModels({ vendor: 'copilot' });
      if (!allModels.length) {
        vscode.window.showWarningMessage('No se encontraron modelos Copilot. Verifica que GitHub Copilot Chat esté activo.');
        return;
      }
      items = [
        { label: 'auto', description: 'Selección automática (gpt-4o → gpt-4o-mini → ...)' },
        ...allModels.map(m => ({ label: m.family ?? m.id, description: `vendor: ${m.vendor}` })),
      ];
    } else {
      // Lista estática para providers externos
      items = EXTERNAL_MODEL_LIST[provider].map(m => ({ label: m.id, description: m.label }));
    }

    const chosen = await vscode.window.showQuickPick(items, {
      title: `Seleccionar modelo — ${provider}`,
      placeHolder: 'Elige el modelo para el análisis de compliance',
    });
    if (chosen) {
      await vscode.workspace.getConfiguration('syntaxis').update('ai.model', chosen.label, true);
      vscode.window.showInformationMessage(`✅ Modelo configurado: ${chosen.label}`);
    }
  })
);
```

#### Parte C — `runAgentWithCopilot` respeta el modelo configurado

```typescript
const preferredModel = settings.getAIModel();
const FALLBACK_FAMILIES = ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'claude-3-5-sonnet'];
const familiesToTry = (preferredModel && preferredModel !== 'auto')
  ? [preferredModel, ...FALLBACK_FAMILIES.filter(f => f !== preferredModel)]
  : FALLBACK_FAMILIES;

let model: any; let usedFamily: string | undefined;
for (const family of familiesToTry) {
  const models = await vscode.lm.selectChatModels({ vendor: 'copilot', family });
  if (models?.length > 0) { model = models[0]; usedFamily = family; break; }
}
getOutput().appendLine(`   🤖 Modelo Copilot en uso: ${usedFamily}`);
```

### Archivos a modificar

| Archivo | Bugs | Cambio |
|---------|------|--------|
| `packages/vscode-extension/package.json` | #1, #5, #9A | `extensionDependencies: ["github.copilot-chat"]`; `@types/vscode: "^1.93.0"`; enum completo de modelos en `syntaxis.ai.model` + nuevo comando `syntaxis.selectAIModel` |
| `packages/vscode-extension/src/ai-client.ts` | #2, #3, #9C | Propagar errores; corregir streaming a `response.text`; respetar modelo configurado con fallback |
| `packages/vscode-extension/src/extension.ts` | #4, #6, #7, #9B | Eliminar doble-llamada; test de conexión completo; deshabilitar auto-refresh en modo AI; nuevo QuickPick dinámico de modelos |

> **BUG #8 (`checkWorkspace` AI)** se deja fuera del scope: requiere UX adicional (progreso, cancelación, costo) — se implementará en un plan separado.

### Orden de implementación

1. **`package.json`** — `extensionDependencies` + `@types/vscode 1.93` (habilita todo lo demás)
2. **`ai-client.ts`** — streaming correcto (`response.text`) + propagar errores
3. **`extension.ts`** — eliminar doble-llamada + test de conexión completo + deshabilitar auto-refresh AI

### Documentación a actualizar

| Archivo | Sección a actualizar |
|---------|----------------------|
| `README.md` (raíz) | Agregar sección "Modo IA" con requisito de Copilot Chat, lista completa de modelos soportados, comando de selección de modelo |
| `packages/vscode-extension/README.md` | Actualizar guía de configuración AI: requisito de Copilot Chat, enum de modelos, comando `Syntaxis: Seleccionar modelo de IA`, aclarar diferencia `github.copilot` vs `github.copilot-chat` |
| `docs/GUIA_EXTENSION_VS_CODE.md` | Actualizar sección de configuración AI con nuevo flujo: instalar Copilot Chat → configurar proveedor → usar comando selector de modelo |
| `docs/ESTRUCTURA_PROYECTO_CONFIGURACION.md` | Actualizar tabla de settings (`syntaxis.ai.model` ahora con enum completo + default `auto`, nuevo comando `syntaxis.selectAIModel`) |
| `docs/RESUMEN_EJECUTIVO.md` | Actualizar versión de release: v0.10.0, mencionar fix del modo IA y nueva funcionalidad de selector de modelo |

Contenidos clave a documentar:
- **Requisito**: `github.copilot-chat` debe estar instalado (no solo `github.copilot`)
- **Modelos disponibles**: tabla completa por proveedor (Copilot, OpenAI, Anthropic, Azure)
- **Comando `Syntaxis: Seleccionar modelo de IA`**: cómo usarlo para ver los modelos reales de la suscripción
- **Comportamiento `auto`**: qué familias prueba y en qué orden
- **Output Channel**: ahora muestra qué modelo Copilot se usó en cada análisis

1. **Nueva rama `git`:**
```bash
git checkout -b feature/ai-mode-fix-model-selector
```

2. **Bump de versión** `package.json`: `0.9.0` → `0.10.0` (feature release con fixes + nueva funcionalidad)

3. **Compilar y empaquetar VSIX:**
```bash
cd packages/vscode-extension
npm run compile    # esbuild
npx vsce package   # genera syntaxis-compliance-checker-0.10.0.vsix
```

4. **Commit en la rama:**
```bash
git add -A
git commit -m "feat(ai): fix Copilot Chat integration, model selector, error propagation

- Add extensionDependencies for github.copilot-chat
- Update @types/vscode to ^1.93.0
- Fix silent catch in runAgentWithCopilot — propagate errors
- Fix streaming API: use response.text instead of response
- Eliminate double analyzeWithAI call in checkFile
- Add dynamic model QuickPick command (syntaxis.selectAIModel)
- Add complete model enum (OpenAI + Anthropic + Copilot families)
- Disable keystroke auto-refresh in AI mode
- Fix testAiConnection to probe all model families
- Bump version to 0.10.0

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

- **Causa del "reporte igual a regex"**: No hay fallback a regex. El AI falla silenciosamente (BUG #2) y retorna 0 findings = PASS. Misma plantilla visual = "parece igual".
- **Causa del "Copilot no encontrado"**: Usuario tiene `github.copilot` (inline) pero no `github.copilot-chat` (LM API). Son extensiones separadas. El `extensionDependencies` (BUG #1) fuerza la instalación.
- **API de consentimiento**: con `extensionDependencies`, VS Code mostrará el diálogo "Allow Syntaxis to use Copilot?" la primera vez — necesario para que `selectChatModels` retorne resultados.
