# Syntaxis Compliance Checker

Agente inteligente para cumplimiento automático de las Leyes 21.719 (Protección de Datos) y 21.663 (Ciberseguridad) en Chile.

## 🎯 ¿Qué es?

Sistema de agentes especializados que analizan código en tiempo real para garantizar cumplimiento normativo:

- **DPA Agent**: Valida Ley 21.719 (Protección de Datos Personales)
- **CSA Agent**: Valida Ley 21.663 (Marco de Ciberseguridad)
- **Transversal Agent**: Validaciones cruzadas entre leyes

## 📦 Componentes Principales

```
├── packages/vscode-extension/    # Extensión VS Code (análisis en tiempo real)
├── src/                          # Código principal (Orquestador + Agentes)
│   ├── agents/                   # 3 Agentes especializados
│   ├── skills/                   # 11 Skills (validadores específicos)
│   ├── mcp-connectors/           # Conexiones a SQL Server y PostgreSQL
│   └── report-generators/        # Reportes JSON/MD/HTML
├── .github/workflows/            # GitHub Actions (automatización)
├── docs/                         # Documentación completa
└── deployment/                   # Docker, Kubernetes, Terraform
```

## 🚀 Inicio Rápido

### 1. Instalar extensión VS Code

```bash
cd packages/vscode-extension
npm install
npm run compile
code .
# Presiona F5 para ejecutar en modo debug
```

### 2. Usar comandos

```
Ctrl+Shift+P → Escribe "syntaxis"
Comandos disponibles:
- Syntaxis: Revisar archivo actual
- Syntaxis: Revisar workspace completo
- Syntaxis: Generar reporte de compliance
- Syntaxis: Analizar BD conectada
```

## 📋 Requisitos

- Node.js 18+
- npm 8+
- VS Code 1.60+
- (Opcional) SQL Server o PostgreSQL para análisis de BD

## 🎓 Documentación

Consulta los documentos en `/docs`:

- `PLAN_AGENTES_PROTECCION_DATOS_CHILE.md` - Plan maestro
- `SKILLS_ESPECIFICACION_TECNICA.md` - Especificación de skills
- `GUIA_EXTENSION_VS_CODE.md` - Guía de uso de extensión
- `RESUMEN_EJECUTIVO.md` - Para stakeholders

## 🔧 Configuración

```bash
# Crear .env desde template
cp .env.example .env

# Completar variables:
SQL_SERVER_HOST=localhost
POSTGRES_HOST=localhost
DEBUG=syntaxis:*
```

## 🧪 Testing

```bash
# Unit tests
npm test

# Con cobertura
npm run test:coverage

# E2E tests
npm run test:e2e
```

## 📦 Build y Deploy

```bash
# Compilar
npm run compile

# Empaquetar extensión
npm run package

# Docker
docker build -t syntaxis-compliance .
docker run -p 3000:3000 syntaxis-compliance
```

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea tu rama (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Abre Pull Request

## 📄 Licencia

MIT - Ver LICENSE para detalles

## 👥 Autores

- **Rodrigo Chamy** - Initial work - [rchamycruz](https://github.com/rchamycruz)

---

## 📞 Soporte

Para reportar bugs o sugerir features:
- Issues: https://github.com/rchamycruz/compliance-checker/issues
- Discussions: https://github.com/rchamycruz/compliance-checker/discussions

## 🎯 Roadmap

- [ ] v0.1.0 - Extensión VS Code básica
- [ ] v0.2.0 - Agentes completos
- [ ] v0.3.0 - GitHub Actions integration
- [ ] v1.0.0 - Release inicial
