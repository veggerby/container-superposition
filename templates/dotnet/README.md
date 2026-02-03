# .NET Template

Complete C# development environment for building .NET Core applications and microservices.

## What's Included

### Base Image
- **Microsoft DevContainer**: `base:trixie` (Debian Trixie)
- Minimal base image optimized for DevContainers

### Features (from containers.dev)
- **common-utils**: Zsh, Oh My Zsh, and common development utilities
- **Git**: Latest version with PPA support
- **.NET SDK**: Version 10.0
- **apt-get-packages**: Essential development tools (bash-completion, xdg-utils, pass, sshpass, build-essential, curl, wget, netcat-traditional, iputils-ping, dnsutils, git-lfs, sqlite3, vim, less)
- **jq-likes**: jq and yq for JSON/YAML processing
- **GitHub CLI**: gh command-line tool
- **Docker-outside-of-Docker**: Access host Docker daemon

### VS Code Extensions
- **C# Dev Kit**: Enhanced C# development experience with IntelliSense
- **GUID Generator**: Generate GUIDs easily
- **Markdown Lint**: Markdown file linting
- **EditorConfig**: Maintain consistent coding styles
- **Code Spell Checker**: Catch typos in code and comments
- **Nuke Build**: Build automation support
- **ESLint**: JavaScript/TypeScript linting
- **GitHub Copilot & Copilot Chat**: AI-powered coding assistance
- **YAML**: YAML language support
- **GitHub Actions**: GitHub Actions workflow support
- **Markdown Mermaid**: Diagram support in Markdown
- **REST Client**: Test REST APIs directly in VS Code
- **GitHub Pull Request**: Manage pull requests

### Ports
Pre-configured port forwarding:
- `5000` - HTTP endpoint
- `5001` - HTTPS endpoint
- `8080` - Alternative HTTP port

## Usage

### Copy to Your Project
```bash
cp -r templates/dotnet/.devcontainer /path/to/your/project/
```

### Create New Project

```bash
# Create a new Web API
dotnet new webapi -n MyApi

# Create a solution
dotnet new sln -n MySolution
dotnet sln add MyApi/MyApi.csproj

# Run the API
cd MyApi
dotnet run
```

### Open in VS Code
1. Open your project in VS Code
2. Click "Reopen in Container" when prompted
3. Wait for the container to build and setup to complete

## Customization

### Add NuGet Packages

```bash
dotnet add package Microsoft.EntityFrameworkCore
dotnet add package Swashbuckle.AspNetCore
dotnet add package Serilog.AspNetCore
```

### Add More Extensions

Edit `.devcontainer/devcontainer.json`:
```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-azuretools.vscode-docker",
        "humao.rest-client"
      ]
    }
  }
}
```

## Common Workflows

### Minimal API
```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/", () => "Hello World!");
app.MapGet("/users/{id}", (int id) => new { Id = id, Name = "User" });

app.Run();
```

### Controller-Based API
```csharp
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    [HttpGet]
    public IActionResult GetAll()
    {
        return Ok(new[] { new { Id = 1, Name = "User 1" } });
    }

    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        return Ok(new { Id = id, Name = $"User {id}" });
    }

    [HttpPost]
    public IActionResult Create(UserDto user)
    {
        return CreatedAtAction(nameof(GetById), new { id = 1 }, user);
    }
}
```

### Entity Framework Core

```bash
# Add EF Core packages
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Design

# Create migration
dotnet ef migrations add InitialCreate

# Update database
dotnet ef database update
```

### Testing

```bash
# Create test project
dotnet new xunit -n MyApi.Tests
dotnet sln add MyApi.Tests/MyApi.Tests.csproj

# Add reference to main project
cd MyApi.Tests
dotnet add reference ../MyApi/MyApi.csproj

# Run tests
dotnet test
```

## Project Structure

Recommended structure:
```
MySolution/
├── src/
│   ├── MyApi/
│   │   ├── Controllers/
│   │   ├── Models/
│   │   ├── Services/
│   │   ├── Program.cs
│   │   └── MyApi.csproj
│   └── MyApi.Core/
│       ├── Entities/
│       ├── Interfaces/
│       └── MyApi.Core.csproj
├── tests/
│   └── MyApi.Tests/
│       └── MyApi.Tests.csproj
└── MySolution.sln
```

## Development Features

### Hot Reload
```bash
dotnet watch run
```
Changes are automatically applied while running.

### Debugging
Set breakpoints in VS Code and press F5 to start debugging.

### API Documentation (Swagger)
ASP.NET Core Web API templates include Swagger by default:
- Run the app
- Navigate to `http://localhost:5000/swagger`

### Configuration

Use `appsettings.json` and `appsettings.Development.json`:
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  },
  "ConnectionStrings": {
    "DefaultConnection": "Server=db;Database=mydb;User=sa;Password=YourPassword;"
  }
}
```

## Docker Support

### Build Docker Image
```bash
dotnet publish -c Release -o ./publish
docker build -t myapi .
```

### Sample Dockerfile
```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY publish/ .
EXPOSE 8080
ENTRYPOINT ["dotnet", "MyApi.dll"]
```

## Best Practices

### Dependency Injection
```csharp
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddSingleton<ICacheService, CacheService>();
```

### Async/Await
```csharp
[HttpGet]
public async Task<IActionResult> GetUsersAsync()
{
    var users = await _userService.GetAllAsync();
    return Ok(users);
}
```

### Error Handling
```csharp
app.UseExceptionHandler("/error");
app.MapGet("/error", () => Results.Problem());
```

### Logging
```csharp
app.Logger.LogInformation("Processing request for {Path}", context.Request.Path);
```

## Testing

### Unit Tests
```csharp
public class UserServiceTests
{
    [Fact]
    public async Task GetUser_ReturnsUser()
    {
        var service = new UserService();
        var user = await service.GetUserAsync(1);
        Assert.NotNull(user);
    }
}
```

### Integration Tests
```csharp
public class ApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public ApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Get_ReturnsSuccess()
    {
        var response = await _client.GetAsync("/api/users");
        response.EnsureSuccessStatusCode();
    }
}
```

## Common Packages

```bash
# Authentication & Authorization
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer

# Database
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL

# Validation
dotnet add package FluentValidation.AspNetCore

# Logging
dotnet add package Serilog.AspNetCore

# API Documentation
dotnet add package Swashbuckle.AspNetCore

# Testing
dotnet add package xunit
dotnet add package Moq
dotnet add package FluentAssertions
```

## Troubleshooting

### Build Errors
```bash
# Clean and rebuild
dotnet clean
dotnet build
```

### Port Already in Use
Edit `Properties/launchSettings.json`:
```json
{
  "applicationUrl": "http://localhost:5002;https://localhost:5003"
}
```

### Package Restore Issues
```bash
dotnet restore --force
dotnet nuget locals all --clear
```

## Resources

- [.NET Documentation](https://docs.microsoft.com/dotnet/)
- [ASP.NET Core](https://docs.microsoft.com/aspnet/core/)
- [Entity Framework Core](https://docs.microsoft.com/ef/core/)
- [C# Language Reference](https://docs.microsoft.com/dotnet/csharp/)
