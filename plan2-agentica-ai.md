# Plan: Verificación y corrección del modo IA agéntico

## Objetivo
Confirmar que cuando la extensión opera en **modo IA**, las tres funciones clave son genuinamente generadas por un agente LLM real (Copilot/OpenAI/Anthropic) y **no** por regex/templates estáticos:

1. **Detección de incumplimientos** en el código fuente
2. **"¿Por qué debería implementar esta corrección?"** (`citation.whyFix`)
3. **Prompt sugerido** para corregir con IA (`suggestedPrompt`)

---

## Checklist de verificación

### ✅ Check 1 — Detección de incumplimientos por IA real
- **Archivo**: `packages/vscode-extension/src/ai-client.ts`
- **Estado**: ✅ CORRECTO — no requiere cambios
- **Evidencia**:
  - `analyzeWithAI()` invoca `runAgentWithCopilot()` o `runAgentWithExternalProvider()` según proveedor configurado
  - Ambas funciones envían el código al LLM (vscode.lm / OpenAI / Anthropic) con system prompts especializados (`DPA_SYSTEM_PROMPT`, `CSA_SYSTEM_PROMPT`)
  - Los findings son el JSON que retorna el LLM, parseado por `extractAndParseFindings()`
  - En modo estático (`analyzeCode()`) se usan regex, pero este modo es completamente independiente del modo IA
  - `refreshDiagnostics()` y `syntaxis.checkFile` respetan el modo configurado
- **Nota**: El comando `syntaxis.checkWorkspace` usa análisis estático incluso en modo IA (comportamiento intencional por costo de API)

---

### ✅ Check 2 — "¿Por qué debería implementar esta corrección?" generado por IA
- **Archivos**: `ai-client.ts` (prompts), `extension.ts` (renderizado)
- **Estado**: ✅ CORRECTO — no requiere cambios
- **Evidencia**:
  - `DPA_SYSTEM_PROMPT` (línea ~64): instrucción explícita → _"En `citation.whyFix` genera 2-3 párrafos ESPECÍFICOS al hallazgo..."_
  - `CSA_SYSTEM_PROMPT` (línea ~88): instrucción explícita → _"En `citation.whyFix` genera 2-3 párrafos ESPECÍFICOS al hallazgo..."_
  - `extractAndParseFindings()` (línea 112-126): parsea `f.citation.whyFix` del JSON del LLM
  - `aiToFindings()` (línea 508-518): preserva el `citation` con `whyFix` de IA
  - **Hover provider** (línea 677): muestra `c.whyFix` del cache de IA → `*🤖 Análisis generado por IA*`
  - **HTML report** (`buildHtmlReport`, línea 1241): usa `f.citation.whyFix` (procedente de IA en modo IA)
  - **Markdown report** (`buildMarkdownReport`, línea 1136): usa `f.citation.whyFix` (procedente de IA en modo IA)
  - En modo estático, `whyFix` proviene de `LAW_CITATIONS` (hardcoded) — correcto para ese modo

---

### ❌→✅ Check 3 — Prompt sugerido generado por IA en Markdown report
- **Archivo**: `packages/vscode-extension/src/extension.ts`, función `buildMarkdownReport()`
- **Estado**: ❌ **BUG ENCONTRADO** → ✅ **CORREGIDO**
- **Descripción del bug**:
  - Línea 1138: `buildMarkdownReport` **siempre** llama a `buildSuggestedPrompt(f)` (función template/estática), ignorando `f.suggestedPrompt` aunque la IA lo haya generado
  - `buildHtmlReport` (línea 1249) sí hace bien: `f.suggestedPrompt ?? buildSuggestedPrompt(f)`
- **Corrección aplicada**:
  - `buildMarkdownReport` ahora usa `f.suggestedPrompt ?? buildSuggestedPrompt(f)`, igual que `buildHtmlReport`
  - El label del bloque también indica `(generado por IA)` cuando se usa el prompt del LLM

---

### ✅ Check 4 — Prompt sugerido generado por IA en HTML report
- **Archivo**: `packages/vscode-extension/src/extension.ts`, función `buildHtmlReport()`
- **Estado**: ✅ CORRECTO — no requiere cambios
- **Evidencia**:
  - Línea 1249: `const prompt = f.suggestedPrompt ?? buildSuggestedPrompt(f);`
  - Línea 1250-1252: el label muestra `(generado por IA)` cuando `f.suggestedPrompt` está presente

---

### ✅ Check 5 — Prompt sugerido generado por IA en system prompts
- **Archivo**: `packages/vscode-extension/src/ai-client.ts`
- **Estado**: ✅ CORRECTO — no requiere cambios
- **Evidencia**:
  - `DPA_SYSTEM_PROMPT` instrucción: _"En `suggestedPrompt` genera un prompt detallado y contextualizado con el snippet y ubicación exactos"_
  - `CSA_SYSTEM_PROMPT` instrucción: _"En `suggestedPrompt` genera un prompt detallado y contextualizado con el snippet exacto"_
  - El schema JSON del sistema incluye el campo `suggestedPrompt` explícitamente
  - `extractAndParseFindings()` línea 141: `suggestedPrompt: f.suggestedPrompt ? String(f.suggestedPrompt) : undefined`

---

## Resumen de cambios

| # | Componente | Estado antes | Estado después |
|---|-----------|-------------|----------------|
| 1 | Detección de incumplimientos (modo IA) | ✅ IA real | ✅ IA real |
| 2 | `whyFix` en hover provider | ✅ IA real | ✅ IA real |
| 3 | `whyFix` en HTML report | ✅ IA real | ✅ IA real |
| 4 | `whyFix` en Markdown report | ✅ IA real | ✅ IA real |
| 5 | Prompt sugerido en HTML report | ✅ IA real | ✅ IA real |
| 6 | **Prompt sugerido en Markdown report** | ❌ template estático | ✅ IA real |

---

## Archivos modificados

- `packages/vscode-extension/src/extension.ts` — función `buildMarkdownReport()`, línea ~1138: usar `f.suggestedPrompt ?? buildSuggestedPrompt(f)` en lugar de `buildSuggestedPrompt(f)` directamente
