# Syntaxis Compliance Checker

Agente inteligente para cumplimiento automático de las Leyes 21.719 (Protección de Datos) y 21.663 (Ciberseguridad) en Chile.

## 🎯 ¿Qué es?

Sistema de agentes especializados que analizan código para garantizar cumplimiento normativo. Soporta **dos modos de análisis**:

| Modo | Descripción | Requiere |
|---|---|---|
| 🔍 **Análisis Estático** | Reglas deterministas (regex), instantáneo, sin internet | Nada |
| 🤖 **Análisis con IA** | Agentes LLM especializados por ley, comprensión semántica | API key o GitHub Copilot |

Cada modo usa los mismos agentes especializados:

- **DPA Agent** — Ley 21.719 (Protección de Datos Personales)
- **CSA Agent** — Ley 21.663 (Marco de Ciberseguridad)

## 📦 Estructura del Proyecto

```
├── packages/vscode-extension/    # Extensión VS Code (análisis en tiempo real)
├── src/
│   ├── agents/
│   │   ├── csa-agent.ts          # Agente estático Ley 21.663
│   │   ├── dpa-agent.ts          # Agente estático Ley 21.719
│   │   ├── ai/                   # Agentes IA (LLM-powered)
│   │   │   ├── base-ai-agent.ts
│   │   │   ├── dpa-ai-agent.ts
│   │   │   └── csa-ai-agent.ts
│   │   └── skills/               # Skills: conocimiento experto por ley
│   │       ├── base-skill.ts
│   │       ├── dpa-skill.ts      # Skill Ley 21.719 (prompts + artículos)
│   │       └── csa-skill.ts      # Skill Ley 21.663 (prompts + artículos)
│   ├── ai/                       # Providers de IA
│   │   ├── ai-provider.ts        # Interfaz abstracta
│   │   ├── copilot-provider.ts   # GitHub Copilot (via vscode.lm)
│   │   ├── openai-provider.ts    # OpenAI
│   │   └── anthropic-provider.ts # Anthropic (Claude)
│   ├── orchestrator.ts           # Orquestador modo estático
│   ├── orchestrator-ai.ts        # Orquestador modo IA
│   ├── report-generators/        # Reportes JSON/MD/HTML
│   └── types/                    # Tipos compartidos
├── docs/                         # Documentación completa
└── tests/                        # Tests unitarios
```

## 🚀 Inicio Rápido

### Extensión VS Code

```bash
cd packages/vscode-extension
npm install
npm run compile
code .
# Presiona F5 para ejecutar en modo debug
```

### Modo IA — Configuración

1. Abre Settings de VS Code (`Ctrl+,`) y busca **Syntaxis**
2. Cambia `syntaxis.analysisMode` → `ai`
3. Elige tu proveedor en `syntaxis.ai.provider`:
   - **`github-copilot`** *(default)* — sin API key extra, usa tu suscripción Copilot
   - `openai` / `anthropic` / `azure-openai` — ejecuta `Syntaxis: Configurar API Key de IA`

### Comandos VS Code

```
Ctrl+Shift+P → Escribe "syntaxis"

Análisis:
  Syntaxis: Revisar archivo actual
  Syntaxis: Revisar workspace completo
  Syntaxis: Generar reporte de compliance

Configuración IA:
  Syntaxis: Configurar API Key de IA
  Syntaxis: Verificar conexión con IA
```

## 📋 Requisitos

- Node.js 18+
- npm 8+
- VS Code 1.90+ (para modo IA con GitHub Copilot)
- GitHub Copilot activo **o** API key de OpenAI/Anthropic (solo para modo IA)

## 🤖 Sistema de Skills (Modo IA)

Cada agente IA tiene un **Skill** que encapsula su conocimiento legal especializado:

| Skill | Ley | Artículos incluidos |
|---|---|---|
| `DPASkill` | Ley 21.719 | Arts. 3, 4, 7, 9, 18, 20 |
| `CSASkill` | Ley 21.663 | Art. 6 (credenciales, auth, criptografía, TLS, CORS, rate limiting) |

Los Skills construyen prompts dinámicos con:
- Persona del agente experto
- Base de conocimiento con artículos reales de la ley
- Ejemplos few-shot de código bueno/malo
- Schema JSON de respuesta estructurada

## 🎓 Documentación

Consulta los documentos en `/docs`:

- `plan-agentic-ai.md` — Arquitectura del sistema de agentes IA
- `PLAN_AGENTES_PROTECCION_DATOS_CHILE.md` — Plan maestro original
- `SKILLS_ESPECIFICACION_TECNICA.md` — Especificación de skills
- `GUIA_EXTENSION_VS_CODE.md` — Guía de uso de la extensión
- `RESUMEN_EJECUTIVO.md` — Para stakeholders

## 🔧 Variables de Entorno (CLI/Node)

```bash
cp .env.example .env
```

```env
# Proveedor IA para uso desde CLI (no aplica para Copilot)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
AZURE_OPENAI_KEY=...
AZURE_OPENAI_ENDPOINT=https://mi-recurso.openai.azure.com
```

## 🧪 Testing

```bash
npm test
npm run test:coverage
```

## 📦 Build

```bash
# Compilar TypeScript
npm run compile

# Empaquetar extensión VS Code
cd packages/vscode-extension
npm run compile
npm run package
# → syntaxis-compliance-checker-0.8.0.vsix
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu rama (`git checkout -b feature/mi-mejora`)
3. Commit (`git commit -m 'feat: descripción'`)
4. Push (`git push origin feature/mi-mejora`)
5. Abre Pull Request

## 📄 Licencia

MIT — Ver [LICENSE](LICENSE) para detalles.

## 👥 Autores

- **Rodrigo Chamy** — [rchamycruz](https://github.com/rchamycruz)

---

## 📞 Soporte

- Issues: https://github.com/rchamycruz/compliance-checker/issues
- Discussions: https://github.com/rchamycruz/compliance-checker/discussions

## 🗺️ Roadmap

- [x] v0.1.0 — Extensión VS Code básica
- [x] v0.2.0 — Agentes completos con análisis en tiempo real
- [x] v0.7.0 — Reportes HTML/MD/JSON con citas textuales de la ley
- [x] v0.8.0 — **Modo IA**: agentes LLM con Skills por ley + GitHub Copilot support
- [ ] v0.9.0 — Análisis de workspace completo en modo IA
- [ ] v1.0.0 — Release público en VS Code Marketplace
