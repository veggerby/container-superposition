# Changelog

## v2.0.0 - Complete Architecture Refactor (2025-02-04)

### 🎯 Major Changes

**Modular Overlay Architecture:**
- Replaced 4 monolithic stack templates with 2 minimal base templates + 15 composable overlays
- Base templates: `plain` (image-based), `compose` (docker-compose-based)
- Overlays organized by category: language, database, observability, cloud tools, dev tools

**Metadata-Driven Configuration:**
- Created `overlays/index.yml` - central metadata file for all overlays
- Properties: id, name, description, category, order (for startup sequencing)
- Add new overlays without code changes

**Modern CLI Interface:**
- Replaced readline-based questionnaire with `@inquirer/prompts`
- Multi-select checkbox support for overlays
- Better visual feedback with boxen and chalk
- Improved error handling and Ctrl+C detection

**Smart Dependency Management:**
- Automatic filtering of `depends_on` in docker-compose files
- Services only depend on selected overlays
- Service ordering via `_serviceOrder` field (0=infrastructure, 1=backends, 2=middleware, 3=UI)
- Intelligent `runServices` merging with correct startup sequence

### ✨ New Features

**Observability Stack (5 overlays):**
- `otel-collector` - OpenTelemetry Collector for telemetry aggregation
- `jaeger` - Distributed tracing backend
- `prometheus` - Metrics collection and monitoring
- `grafana` - Observability visualization dashboard
- `loki` - Log aggregation system

**Language Overlays (4):**
- `dotnet` - .NET SDK and tooling
- `nodejs` - Node.js + npm/yarn
- `python` - Python 3.x + pip
- `mkdocs` - MkDocs static site generator

**Database Overlays (2):**
- `postgres` - PostgreSQL database
- `redis` - Redis cache

**Cloud Tool Overlays (3):**
- `aws-cli` - AWS command-line tools
- `azure-cli` - Azure command-line tools
- `kubectl-helm` - Kubernetes + Helm

**Dev Tool Overlays (1):**
- `playwright` - Browser automation testing

### 🔧 Technical Improvements

**Questionnaire (`scripts/init.ts`):**
- Complete rewrite with async/await (no callbacks)
- Metadata-driven overlay discovery from `overlays/index.yml`
- Modern select/checkbox prompts
- Better CLI argument parsing
- Improved help output

**Composer (`tool/questionnaire/composer.ts`):**
- `filterDockerComposeDependencies()` - Removes unselected service dependencies
- `mergeRunServices()` - Orders services by `_serviceOrder`
- `updateDockerComposeReferences()` - Builds `dockerComposeFile` array
- Language overlay support via `answers.language`
- Observability overlay ordering (backends → middleware → visualization)

**Type System (`tool/schema/types.ts`):**
- New types: `Stack`, `LanguageOverlay`, `ObservabilityTool`, `CloudTool`
- Updated `QuestionnaireAnswers` interface
- Better type safety throughout codebase

**Dependencies:**
- Added: `@inquirer/prompts@^8.2.0`
- Added: `@inquirer/checkbox@^3.0.0`
- Added: `js-yaml@^4.1.0`
- Added: `@types/js-yaml@^4.0.9`

### 📚 Documentation Updates

**New Documentation:**
- `tool/docs/questionnaire-updates.md` - Modern questionnaire guide
- `CHANGELOG.md` - This file

**Updated Documentation:**
- `README.md` - Added metadata-driven section, dependency management
- `tool/README.md` - Comprehensive overlay architecture
- `tool/docs/quick-reference.md` - All new overlays and CLI options
- `tool/docs/creating-overlays.md` - Updated overlay creation guide
- `tool/docs/dependencies.md` - Dependency management details
- All template READMEs - Reflect new architecture
- All overlay READMEs - Usage instructions and configuration

### 🎨 User Experience

**Interactive Mode:**
```bash
npm run init

? Select base template: compose
? Add a language/framework overlay? Yes
? Select language: nodejs
? Select databases: postgres, redis
? Select observability tools: otel-collector, jaeger, prometheus, grafana
? Select cloud tools: aws-cli
? Select development tools: playwright
```

**CLI Mode:**
```bash
npm run init -- \
  --stack compose \
  --language nodejs \
  --db postgres+redis \
  --observability otel-collector,jaeger,prometheus,grafana \
  --cloud-tools aws-cli \
  --playwright
```

### 🔄 Migration from v1.x

**Breaking Changes:**
- Stack names changed: `dotnet` → `compose --language dotnet`
- Stack names changed: `node-typescript` → `compose --language nodejs`
- Stack names changed: `python-mkdocs` → `plain --language mkdocs`
- Stack names changed: `fullstack` → `compose --language nodejs --db postgres+redis`

**CLI Compatibility:**
Old flags still supported with automatic migration:
- `--stack dotnet` auto-converts to `--stack compose --language dotnet`

**Template Structure:**
Old templates moved to: `templates/archive/`
New templates in: `templates/plain/`, `templates/compose/`
Overlays in: `tool/overlays/`

### ✅ Testing

Verified scenarios:
- ✅ Plain base + language overlay
- ✅ Compose base + language + database
- ✅ Full observability stack (all 5 tools)
- ✅ Dependency filtering (grafana without prometheus)
- ✅ Service ordering (backends → middleware → UI)
- ✅ CLI help output
- ✅ Interactive questionnaire
- ✅ Multi-select checkboxes
- ✅ Docker Compose file merging
- ✅ Environment variable merging

### 🎯 Design Goals Achieved

- ✅ **Minimal base, composable overlays** - 2 bases + 15 overlays
- ✅ **Metadata-driven** - No hardcoded menus
- ✅ **Smart dependencies** - Automatic filtering
- ✅ **Service ordering** - Correct startup sequence
- ✅ **Modern UX** - Checkbox selections
- ✅ **Observability first-class** - Full OpenTelemetry stack
- ✅ **Easy maintenance** - Add overlays via YAML
- ✅ **No lock-in** - Generate once, edit forever

### 📝 Notes

- The old questionnaire is preserved in `scripts/init.old.ts` for reference
- All generated configurations are standard devcontainer JSON
- Overlays can be mixed and matched freely
- Configuration files are fully editable after generation

---

## v1.0.0 - Initial Release

- 4 monolithic stack templates: dotnet, node-typescript, python-mkdocs, fullstack
- 3 custom features: project-scaffolder, team-conventions, local-secrets-manager
- Basic readline-based questionnaire
- Docker Compose support for databases (postgres, redis)
- Playwright overlay support
