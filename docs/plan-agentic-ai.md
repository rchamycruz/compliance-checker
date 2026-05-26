# Plan: Agentes de IA Reales — Compliance Checker

**Rama:** `feature/agentic-ai`  
**Autor:** Copilot / Rodrigo Chamy  
**Fecha:** 2026-05-26

---

## 1. Contexto y Motivación

El sistema actual usa agentes basados en **análisis estático** (regex + lógica determinista). Aunque rápidos y sin dependencias externas, tienen limitaciones:

- No comprenden semántica ni contexto amplio del código
- Falsos positivos en patrones complejos
- No pueden razonar sobre intenciones del desarrollador
- Incapaces de detectar problemas sutiles de diseño

El objetivo es añadir un **segundo modo de análisis** donde los agentes son LLMs reales, especializados en cada ley mediante un sistema de **Skills**.

---

## 2. Modos de Análisis

| Modo | Nombre en UI | Descripción |
|------|-------------|-------------|
| `static` | **Análisis Estático** | Regex + reglas deterministas (comportamiento actual) |
| `ai` | **Análisis con IA** | LLMs especializados por ley, razonamiento semántico |

El usuario elige el modo en la configuración de la extensión VS Code. El modo `static` sigue siendo el **default** (no requiere API key, funciona offline).

---

## 3. Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension                        │
│                                                             │
│  ┌──────────────┐    ┌───────────────────────────────────┐  │
│  │ Settings UI  │    │         Analysis Engine           │  │
│  │              │    │                                   │  │
│  │ analysisMode │───▶│  mode=static → analyzeCode()      │  │
│  │ ai.provider  │    │  mode=ai     → analyzeWithAI()    │  │
│  │ ai.model     │    └───────────────────────────────────┘  │
│  │ [API Key]    │               │              │             │
│  │ (secretStore)│               ▼              ▼             │
│  └──────────────┘     StaticOrchestrator   AIOrchestrator   │
└─────────────────────────────────────────────────────────────┘
                                               │
                        ┌──────────────────────┤
                        ▼                      ▼
                  DPA AI Agent           CSA AI Agent
                  (Ley 21.719)           (Ley 21.663)
                        │                      │
                   DPA Skill              CSA Skill
                  (prompt +              (prompt +
                   artículos)             artículos)
                        │                      │
                        └──────────┬───────────┘
                                   ▼
                            AI Provider Layer
                         ┌──────────────────┐
                         │  OpenAI / Azure  │
                         │  Anthropic       │
                         └──────────────────┘
```

---

## 4. Sistema de Skills

Cada **Skill** encapsula el conocimiento experto de una ley específica que se inyecta en el prompt del agente de IA:

### Skill Base
```typescript
interface AgentSkill {
  id: string;
  lawName: LawName;
  systemPrompt: string;       // Identidad del agente ("Eres experto en Ley X...")
  knowledgeBase: LawArticle[]; // Artículos relevantes con descripción técnica
  outputSchema: string;        // JSON schema que el LLM debe seguir
  fewShotExamples?: Example[]; // Ejemplos de hallazgos esperados
}
```

### Skills implementados

| Skill ID | Ley | Especialización |
|----------|-----|-----------------|
| `dpa-skill` | Ley 21.719 | PII, consentimiento, derechos ARCO+P, minimización de datos |
| `csa-skill` | Ley 21.663 | Credenciales, autenticación, criptografía, TLS, rate limiting |

Cada skill incluye:
- Extractos reales de artículos de la ley
- Patrones de código inseguro como ejemplos negativos
- Patrones de código correcto como ejemplos positivos
- Niveles de severidad calibrados según la ley

---

## 5. Estructura de Archivos Nuevos

```
src/
├── agents/
│   ├── base-agent.ts              (existente — sin cambios)
│   ├── csa-agent.ts               (existente — sin cambios)
│   ├── dpa-agent.ts               (existente — sin cambios)
│   ├── ai/
│   │   ├── base-ai-agent.ts       ← Agente IA abstracto con sistema de Skills
│   │   ├── dpa-ai-agent.ts        ← Especialista Ley 21.719 via LLM
│   │   └── csa-ai-agent.ts        ← Especialista Ley 21.663 via LLM
│   └── skills/
│       ├── base-skill.ts          ← Interfaz AgentSkill + LawArticle
│       ├── dpa-skill.ts           ← Skill Ley 21.719 (prompt + artículos + ejemplos)
│       └── csa-skill.ts           ← Skill Ley 21.663 (prompt + artículos + ejemplos)
├── ai/
│   ├── ai-provider.ts             ← Interfaz AIProvider abstracta
│   ├── copilot-provider.ts        ← GitHub Copilot via vscode.lm API (DEFAULT, sin API key)
│   ├── openai-provider.ts         ← OpenAI (GPT-4o, o1, etc.)
│   └── anthropic-provider.ts      ← Anthropic (Claude 3.5+)
├── orchestrator.ts                (existente — sin cambios)
├── orchestrator-ai.ts             ← Orquestador AI que coordina agentes IA
└── types/
    └── index.ts                   (existente — extensión mínima)

packages/vscode-extension/src/
├── extension.ts                   ← Modificación: selector de modo + comandos AI
├── ai-client.ts                   ← Cliente AI para uso desde la extensión
└── settings-manager.ts            ← Lectura/escritura de configuración y secretos

docs/
└── plan-agentic-ai.md             ← Este archivo
```

---

## 6. Configuración en VS Code (`package.json` de la extensión)

### 6.1 Contribución de Settings

```json
"configuration": {
  "title": "Syntaxis Compliance Checker",
  "properties": {
    "syntaxis.analysisMode": {
      "type": "string",
      "enum": ["static", "ai"],
      "enumDescriptions": [
        "Análisis Estático: reglas deterministas, rápido, sin conexión",
        "Análisis con IA: agentes LLM especializados por ley, requiere API key (o suscripción Copilot)"
      ],
      "default": "static",
      "description": "Modo de análisis de compliance"
    },
    "syntaxis.ai.provider": {
      "type": "string",
      "enum": ["github-copilot", "openai", "anthropic", "azure-openai"],
      "enumDescriptions": [
        "GitHub Copilot — usa tu suscripción activa de Copilot (sin API key extra)",
        "OpenAI (GPT-4o, GPT-4o-mini, o1-mini)",
        "Anthropic (Claude 3.5 Sonnet, Claude 3 Haiku)",
        "Azure OpenAI (endpoint propio)"
      ],
      "default": "github-copilot",
      "description": "Proveedor de IA para el análisis"
    },
    "syntaxis.ai.model": {
      "type": "string",
      "default": "gpt-4o",
      "description": "Modelo a usar (ej: gpt-4o, gpt-4o-mini, claude-3-5-haiku-latest). Ignorado para GitHub Copilot."
    },
    "syntaxis.ai.azureEndpoint": {
      "type": "string",
      "default": "",
      "description": "Endpoint de Azure OpenAI (solo para provider azure-openai)"
    }
  }
}
```

### 6.2 Nuevos Comandos

```json
"commands": [
  { "command": "syntaxis.configureApiKey",   "title": "Configurar API Key de IA",      "category": "Syntaxis" },
  { "command": "syntaxis.testAiConnection",  "title": "Verificar conexión con IA",      "category": "Syntaxis" }
]
```

### 6.3 Almacenamiento Seguro de API Key

La API key (solo para OpenAI / Anthropic / Azure) se almacena en **`context.secrets`** (VS Code SecretStorage), **nunca** en `settings.json`.

**GitHub Copilot no requiere API key** — la autenticación es gestionada por VS Code automáticamente.

Para OpenAI / Anthropic / Azure el flujo es:

1. Usuario cambia `syntaxis.ai.provider` a `openai`, `anthropic` o `azure-openai`
2. La extensión detecta que no hay API key almacenada y muestra notificación
3. Usuario ejecuta `Syntaxis: Configurar API Key de IA`
4. Se abre input box de contraseña (`password: true`)
5. La key se guarda con `context.secrets.store('syntaxis.ai.apiKey', key)`
6. Para leerla: `context.secrets.get('syntaxis.ai.apiKey')`

---

## 7. Flujo del Análisis con IA

```
Usuario abre archivo → modo=ai → AIOrchestrator.analyze(input)
        │
        ├─→ DPAAgent.run(input)
        │       └─→ dpaSkill.buildPrompt(code, filePath)
        │       └─→ aiProvider.complete(systemPrompt, userPrompt)
        │       └─→ parseFindings(jsonResponse) → Finding[]
        │
        └─→ CSAAgent.run(input)
                └─→ csaSkill.buildPrompt(code, filePath)
                └─→ aiProvider.complete(systemPrompt, userPrompt)
                └─→ parseFindings(jsonResponse) → Finding[]

Ambos en paralelo → consolidar → OrchestratorReport (misma interfaz que modo estático)
```

**Clave:** La respuesta del LLM **siempre** es JSON estructurado que se mapea a `Finding[]`. Se usa `response_format: { type: "json_object" }` (OpenAI) o instrucción explícita en el prompt (Anthropic) para garantizarlo.

---

## 8. Prompt de un Skill (ejemplo: DPA Skill)

```
SYSTEM:
Eres un agente experto en cumplimiento de la Ley 21.719 de Protección de Datos 
Personales de Chile. Tu tarea es analizar código fuente y detectar violaciones 
a los artículos de esta ley.

CONOCIMIENTO BASE:
- Art. 3 (Minimización): Solo tratar datos necesarios para el fin declarado.
- Art. 4 (Consentimiento): Requerir consentimiento explícito antes de tratar datos.
- Art. 7 (Supresión): Derecho del titular a eliminar sus datos.
- Art. 9 (Portabilidad): Derecho a exportar datos en formato legible.
- Art. 18 (Seguridad): Cifrar datos personales en reposo y tránsito.
- Art. 20 (Notificación): Notificar brechas en 72h.

INSTRUCCIONES:
1. Analiza el código línea por línea
2. Identifica violaciones a los artículos anteriores
3. Para cada violación, genera un Finding con el esquema JSON definido
4. Incluye número de línea, snippet de código, severidad y recomendación concreta
5. Responde ÚNICAMENTE con un JSON array de findings

ESQUEMA DE FINDING:
{ 
  "id": "uuid",
  "type": "TIPO_FINDING",
  "description": "Descripción clara del problema",
  "severity": "CRÍTICA|ALTA|MEDIA|BAJA",
  "law": "Ley 21.719",
  "article": "Art. X — Nombre",
  "lineNumber": N,
  "codeSnippet": "fragmento...",
  "recommendation": "Acción concreta a tomar",
  "estimatedFixHours": N,
  "tags": ["tag1", "tag2"]
}

USER:
Archivo: [filePath]
Lenguaje: [fileType]

```[código]```

Responde con JSON array de findings. Si no hay violaciones, responde [].
```

---

## 9. Manejo de Errores y Fallback

| Escenario | Comportamiento |
|-----------|---------------|
| API key no configurada | Mostrar notificación + abrir comando configuración |
| Error de red / timeout | Mostrar error en Output Channel; no mostrar diagnósticos rotos |
| Respuesta JSON inválida del LLM | Log del error + retornar findings vacíos |
| Rate limit del proveedor | Backoff exponencial (1s, 2s, 4s) + mensaje al usuario |
| Costo por análisis grande | Advertencia si archivo > 500 líneas; truncar a las primeras 800 líneas |

---

## 10. Fases de Implementación

### Fase 1 — Infraestructura AI Core
- [ ] Crear `src/ai/ai-provider.ts` (interfaz base)
- [ ] Crear `src/ai/openai-provider.ts`
- [ ] Crear `src/ai/anthropic-provider.ts`
- [ ] Crear `src/agents/skills/base-skill.ts`
- [ ] Crear `src/agents/skills/dpa-skill.ts`
- [ ] Crear `src/agents/skills/csa-skill.ts`

### Fase 2 — Agentes IA
- [ ] Crear `src/agents/ai/base-ai-agent.ts`
- [ ] Crear `src/agents/ai/dpa-ai-agent.ts`
- [ ] Crear `src/agents/ai/csa-ai-agent.ts`
- [ ] Crear `src/orchestrator-ai.ts`

### Fase 3 — Extensión VS Code
- [ ] Actualizar `packages/vscode-extension/package.json` (settings + comandos)
- [ ] Crear `packages/vscode-extension/src/settings-manager.ts`
- [ ] Crear `packages/vscode-extension/src/ai-client.ts`
- [ ] Modificar `packages/vscode-extension/src/extension.ts`:
  - Leer `analysisMode` en `refreshDiagnostics` y comandos
  - Añadir comando `configureApiKey`
  - Añadir comando `testAiConnection`
  - Integrar `ai-client.ts` cuando `mode=ai`

### Fase 4 — Instalación de Dependencias
- [ ] Añadir `openai` npm package al workspace root
- [ ] Añadir `@anthropic-ai/sdk` npm package al workspace root
- [ ] Actualizar `esbuild.js` de la extensión para bundlear nuevas dependencias

---

## 11. Dependencias Nuevas

| Paquete | Versión | Uso |
|---------|---------|-----|
| `openai` | `^4.x` | Cliente oficial OpenAI (GPT-4o, o1) |
| `@anthropic-ai/sdk` | `^0.x` | Cliente oficial Anthropic (Claude) |
| `vscode.lm` API | built-in (VS Code ≥1.90) | GitHub Copilot — sin paquete extra |

### GitHub Copilot como proveedor especial (default)

GitHub Copilot **no requiere API key** separada. Usa la suscripción activa del usuario via la API `vscode.lm` de VS Code (disponible desde VS Code 1.90):

```typescript
// copilot-provider.ts — dentro de la extensión
const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
const messages = [vscode.LanguageModelChatMessage.User(prompt)];
const response = await model.sendRequest(messages, {}, cancellationToken);
```

Ventajas:
- El usuario solo necesita su suscripción Copilot activa (ya incluida en muchos planes)
- **Sin API key extra** — es el proveedor default recomendado
- El request pasa por la infraestructura GitHub, no directamente a OpenAI
- VS Code gestiona la autenticación automáticamente

Por esto `github-copilot` es el **proveedor default**. Si el usuario no tiene Copilot, puede configurar OpenAI o Anthropic con su propia API key.

---

## 12. Consideraciones de Seguridad

1. **API Keys**: Solo en `secretStorage` de VS Code — NUNCA en settings.json ni logs
2. **Código enviado al LLM**: El usuario debe saber que su código se envía a un servicio externo. Mostrar advertencia la primera vez que se activa el modo AI.
3. **Redacción de secretos**: Antes de enviar el código al LLM, aplicar el mismo redactor de credenciales del modo estático para ofuscar valores hardcodeados evidentes.
4. **Datos en reposo**: Las respuestas del LLM no se almacenan en disco.

---

## 13. Compatibilidad

- El modo `static` permanece **sin cambios** — ningún comportamiento existente se altera
- Los tests existentes siguen pasando
- La extensión funciona normalmente sin API key (con modo `static` default)
- La interfaz `Finding` y `OrchestratorReport` son las mismas para ambos modos
