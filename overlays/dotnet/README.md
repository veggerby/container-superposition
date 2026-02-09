# .NET Overlay

Adds .NET 10 SDK with C# development tools and common global tools.

## Features

- **.NET 10 SDK** with C# compiler
- **VS Code Extensions:**
    - C# Dev Kit (ms-dotnettools.csdevkit)
    - C# (ms-dotnettools.csharp)
    - GUID Generator
    - Nuke Build
    - REST Client
- **Global Tools:** Configured via `global-tools.txt`
- **Automatic restore:** Runs `dotnet restore` on container creation

## Customizing Global Tools

The overlay includes a customizable `global-tools.txt` file in `.devcontainer/`:

**`.devcontainer/global-tools.txt`:**

```
# .NET Global Tools
# Format: one tool per line, with optional version
# Example: dotnet-ef::8.0.0

# Entity Framework Core CLI
dotnet-ef

# Code formatter
dotnet-format

# Dependency updater
dotnet-outdated-tool

# Add your custom tools here
cake.tool
dotnet-reportgenerator-globaltool
```

### Version Pinning

Pin specific versions using `::`:

```
dotnet-ef::8.0.0
dotnet-format::5.1.0
```

**Rebuild container** after editing to install new tools.

## Common Global Tools

### Development

- `dotnet-ef` - Entity Framework Core migrations
- `dotnet-format` - Code formatter
- `dotnet-outdated-tool` - Check for outdated packages
- `dotnet-reportgenerator-globaltool` - Coverage reports

### Build & Deploy

- `cake.tool` - Cake build system
- `nuke.globaltool` - Nuke build system
- `dotnet-sonarscanner` - SonarQube scanner

### Testing & Quality

- `dotnet-stryker` - Mutation testing
- `dotnet-coverage` - Code coverage
- `dotnet-depends` - Dependency analyzer

## Project Structure

Works with:

- **.NET solutions** (`.sln`)
- **Projects** (`.csproj`, `.fsproj`, `.vbproj`)
- **Global.json** for SDK version pinning

## Automatic Setup

On container creation:

1. ✅ Installs global tools from `global-tools.txt`
2. ✅ Runs `dotnet restore` (if solution/project exists)
3. ✅ Lists installed global tools for verification

## Common Workflows

### Web API Development

```bash
dotnet new webapi -n MyApi
dotnet run
```

### Adding EF Migrations

```bash
dotnet ef migrations add InitialCreate
dotnet ef database update
```

### Running Tests with Coverage

```bash
dotnet test /p:CollectCoverage=true
```

## Best Practices

1. **Use global.json** to pin SDK version
2. **Version control global-tools.txt** for team consistency
3. **Pin tool versions** for reproducibility
4. **Add .gitignore** for bin/, obj/, .vs/

## Troubleshooting

### Tool not found after adding to global-tools.txt

Rebuild the container:

- **VS Code:** `Cmd+Shift+P` → "Dev Containers: Rebuild Container"

### Restore fails

Check .NET SDK version in `global.json` matches container.

### Want to use local tools instead?

Create `.config/dotnet-tools.json`:

```bash
dotnet new tool-manifest
dotnet tool install dotnet-ef
```

Local tools are project-specific and preferred for reproducibility.

## Related Overlays

- **sqlserver** - SQL Server for .NET apps
- **postgres** - PostgreSQL with EF Core
- **redis** - Caching layer
- **otel-collector** - OpenTelemetry for instrumentation
