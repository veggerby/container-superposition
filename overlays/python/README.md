# Python Overlay

Adds Python 3.12 with development tools, linting, and formatting.

## Features

- **Python 3.12** with pip, setuptools, and wheel
- **VS Code Extensions:**
  - Python (ms-python.python)
  - Pylance (ms-python.vscode-pylance)
  - Black Formatter (ms-python.black-formatter)
  - Ruff (charliermarsh.ruff)
- **Automatic dependency installation** from:
  - `requirements.txt`
  - `requirements-dev.txt`
  - `pyproject.toml` (editable install)
  - `setup.py` (legacy support)
- **Pre-configured settings:**
  - Black as default formatter
  - Format on save enabled
  - Auto-organize imports
  - PYTHONPATH set to workspace root

## Virtual Environment Philosophy

This overlay uses **user-level pip installations** (`pip install --user`) instead of virtual environments inside the container for these reasons:

### Why Not venv in Container?

1. **Container IS the environment** - The devcontainer already provides isolation
2. **Simpler workflow** - No need to activate/deactivate venv
3. **Better VS Code integration** - Python extension finds packages automatically
4. **Fewer moving parts** - Less to go wrong

### When to Use venv

Use a virtual environment if you need:
- Multiple Python versions in the same container
- Strict dependency isolation for testing
- Exact production parity (though containers already provide this)

To create a venv manually:
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Then update VS Code settings:
```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python"
}
```

## Automatic Setup

The overlay automatically runs on container creation:

1. ✅ Installs overlay packages from `.devcontainer/requirements-overlay.txt`
2. ✅ Checks for `requirements.txt` → installs with pip
3. ✅ Checks for `requirements-dev.txt` → installs dev dependencies
4. ✅ Checks for `pyproject.toml` → installs project in editable mode
5. ✅ Checks for `setup.py` → installs legacy projects
6. ✅ Upgrades pip, setuptools, and wheel to latest

## Customizing Overlay Packages

The overlay includes a `requirements-overlay.txt` file in `.devcontainer/` that you can customize:

**`.devcontainer/requirements-overlay.txt`:**
```
# Python overlay default packages
# Customize this file to add or remove packages for your project

# Add your project dependencies here
# Example:
requests>=2.31.0
pytest>=7.4.0
black>=23.0.0
jupyter>=1.0.0
```

**When to use:**
- Add common development tools you always want
- Install packages needed across all environments
- Pre-install heavy dependencies (pandas, numpy, etc.)

**Rebuild container** after editing to install new packages.

## Project Structures Supported

### Modern Python (pyproject.toml)

```
my-project/
├── pyproject.toml
├── src/
│   └── mypackage/
│       └── __init__.py
└── tests/
```

**Result:** `pip install --user -e .` (editable install)

### Classic Python (requirements.txt)

```
my-project/
├── requirements.txt
├── requirements-dev.txt (optional)
└── src/
    └── main.py
```

**Result:** Dependencies installed, ready to run

### Package with setup.py

```
my-project/
├── setup.py
├── README.md
└── mypackage/
    └── __init__.py
```

**Result:** Package installed in editable mode

## Common Workflows

### Data Science / Notebooks

Add to `requirements.txt`:
```
jupyter
pandas
numpy
matplotlib
scikit-learn
```

### Web Development (FastAPI)

Add to `requirements.txt`:
```
fastapi
uvicorn[standard]
pydantic
sqlalchemy
```

### CLI Tools

Use `pyproject.toml`:
```toml
[project]
name = "mytool"
version = "0.1.0"
dependencies = ["click", "requests"]

[project.scripts]
mytool = "mytool.cli:main"
```

## Best Practices

1. **Pin versions** in requirements.txt for reproducibility
2. **Separate dev dependencies** in requirements-dev.txt
3. **Use pyproject.toml** for modern Python projects
4. **Add `.gitignore`** for `__pycache__`, `.pytest_cache`, etc.

## Troubleshooting

### "Module not found" after adding dependency

Container caches are not refreshed. Rebuild the container:
- **VS Code:** `Cmd+Shift+P` → "Dev Containers: Rebuild Container"

### Need different Python version?

Update `devcontainer.patch.json`:
```json
{
  "features": {
    "ghcr.io/devcontainers/features/python:1": {
      "version": "3.11"  // or "3.10", "3.13", etc.
    }
  }
}
```

### Want to use venv anyway?

Add to your project's `.devcontainer/devcontainer.json`:
```json
{
  "postCreateCommand": "python -m venv .venv && .venv/bin/pip install -r requirements.txt",
  "customizations": {
    "vscode": {
      "settings": {
        "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python"
      }
    }
  }
}
```

## Common Python Commands

### Package Management

```bash
# Install package
pip install requests

# Install with version
pip install requests==2.31.0

# Install from requirements.txt
pip install -r requirements.txt

# Install in editable mode
pip install -e .

# Upgrade package
pip install --upgrade requests

# Uninstall package
pip uninstall requests

# List installed packages
pip list

# Show package info
pip show requests

# Check for updates
pip list --outdated
```

### Working with Dependencies

```bash
# Generate requirements.txt
pip freeze > requirements.txt

# Generate minimal requirements (only direct deps)
pip-compile requirements.in

# Install dev dependencies
pip install -r requirements-dev.txt

# Install with extras
pip install requests[security]
```

### Python Environment

```bash
# Check Python version
python --version

# Run Python script
python script.py

# Run module
python -m http.server 8000

# Interactive shell
python
ipython  # if installed

# Check where Python is
which python

# Show Python path
python -c "import sys; print('\n'.join(sys.path))"
```

## Testing Setup

### pytest

Add to `requirements-dev.txt`:
```
pytest>=7.4.0
pytest-cov>=4.1.0
pytest-asyncio>=0.21.0
```

**Run tests:**
```bash
# Run all tests
pytest

# Run specific file
pytest tests/test_auth.py

# Run specific test
pytest tests/test_auth.py::test_login

# Run with coverage
pytest --cov=src --cov-report=html

# Run with verbose output
pytest -v

# Run in parallel
pytest -n auto
```

**Example test:**
```python
# tests/test_math.py
def test_addition():
    assert 1 + 1 == 2

def test_subtraction():
    result = 10 - 5
    assert result == 5
```

### unittest (Standard Library)

```python
# tests/test_math.py
import unittest

class TestMath(unittest.TestCase):
    def test_addition(self):
        self.assertEqual(1 + 1, 2)
    
    def test_subtraction(self):
        result = 10 - 5
        self.assertEqual(result, 5)

if __name__ == '__main__':
    unittest.main()
```

**Run tests:**
```bash
# Discover and run all tests
python -m unittest discover

# Run specific test file
python -m unittest tests.test_math

# Run specific test
python -m unittest tests.test_math.TestMath.test_addition
```

## Code Quality Tools

### Black (Formatter)

Pre-configured in this overlay.

```bash
# Format file
black script.py

# Format directory
black src/

# Check without modifying
black --check src/

# Show what would change
black --diff src/
```

**Configuration (.pyproject.toml):**
```toml
[tool.black]
line-length = 100
target-version = ['py312']
include = '\.pyi?$'
extend-exclude = '''
/(
  # directories
  \.eggs
  | \.git
  | \.venv
  | build
  | dist
)/
'''
```

### Ruff (Linter)

Pre-configured in this overlay.

```bash
# Lint files
ruff check .

# Auto-fix issues
ruff check --fix .

# Show rule explanations
ruff rule E501

# Format code
ruff format .
```

**Configuration (.pyproject.toml):**
```toml
[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W"]
ignore = ["E501"]

[tool.ruff.lint.per-file-ignores]
"__init__.py" = ["F401"]
```

### mypy (Type Checker)

```bash
# Install
pip install mypy

# Check types
mypy src/

# Check specific file
mypy script.py

# Strict mode
mypy --strict src/
```

**Configuration (.myproject.toml):**
```toml
[tool.mypy]
python_version = "3.12"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
```

## Common Workflows

### Web Development with FastAPI

**requirements.txt:**
```
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pydantic>=2.5.0
sqlalchemy>=2.0.0
```

**main.py:**
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/items/{item_id}")
async def read_item(item_id: int):
    return {"item_id": item_id}
```

**Run:**
```bash
uvicorn main:app --reload
```

### Data Science with Pandas

**requirements.txt:**
```
pandas>=2.1.0
numpy>=1.26.0
matplotlib>=3.8.0
jupyter>=1.0.0
scikit-learn>=1.3.0
```

**Example:**
```python
import pandas as pd
import matplotlib.pyplot as plt

# Read CSV
df = pd.read_csv('data.csv')

# Analyze data
print(df.describe())
print(df.head())

# Plot
df.plot(x='date', y='value')
plt.show()
```

### CLI Tools with Click

**requirements.txt:**
```
click>=8.1.0
```

**cli.py:**
```python
import click

@click.command()
@click.option('--name', default='World', help='Name to greet')
@click.option('--count', default=1, help='Number of greetings')
def hello(name, count):
    """Simple program that greets NAME COUNT times."""
    for _ in range(count):
        click.echo(f'Hello {name}!')

if __name__ == '__main__':
    hello()
```

**Run:**
```bash
python cli.py --name Alice --count 3
```

### Async Programming

```python
import asyncio
import aiohttp

async def fetch_url(url):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.text()

async def main():
    urls = [
        'https://api.example.com/1',
        'https://api.example.com/2',
        'https://api.example.com/3',
    ]
    tasks = [fetch_url(url) for url in urls]
    results = await asyncio.gather(*tasks)
    return results

if __name__ == '__main__':
    results = asyncio.run(main())
```

## Package Structure Best Practices

### Simple Project

```
my-project/
├── README.md
├── requirements.txt
├── requirements-dev.txt
├── .gitignore
├── src/
│   └── main.py
└── tests/
    └── test_main.py
```

### Package Project

```
my-package/
├── README.md
├── pyproject.toml
├── .gitignore
├── src/
│   └── mypackage/
│       ├── __init__.py
│       ├── core.py
│       └── utils.py
└── tests/
    ├── __init__.py
    └── test_core.py
```

**pyproject.toml:**
```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "mypackage"
version = "0.1.0"
description = "My awesome package"
readme = "README.md"
requires-python = ">=3.12"
dependencies = [
    "requests>=2.31.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "black>=23.0.0",
    "ruff>=0.1.0",
]

[project.scripts]
mytool = "mypackage.cli:main"
```

### Application Project

```
my-app/
├── README.md
├── pyproject.toml
├── .env.example
├── .gitignore
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── models/
│   ├── routes/
│   └── services/
├── tests/
│   ├── unit/
│   └── integration/
└── alembic/  # Database migrations
```

## Environment Variables

### .env File

Create `.env` for local configuration:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# API Keys
API_KEY=your_secret_key
SECRET_KEY=another_secret

# Environment
ENVIRONMENT=development
DEBUG=True
```

**Load with python-dotenv:**

```bash
pip install python-dotenv
```

```python
from dotenv import load_dotenv
import os

load_dotenv()

database_url = os.getenv('DATABASE_URL')
api_key = os.getenv('API_KEY')
```

## Dependency Management Strategies

### Option 1: Simple requirements.txt

Best for: Small projects, quick scripts

```bash
# Production dependencies
cat > requirements.txt <<EOF
requests==2.31.0
fastapi==0.104.0
uvicorn==0.24.0
EOF

# Development dependencies
cat > requirements-dev.txt <<EOF
-r requirements.txt
pytest==7.4.0
black==23.11.0
ruff==0.1.6
EOF
```

### Option 2: pyproject.toml

Best for: Packages, modern projects

```toml
[project]
dependencies = [
    "requests>=2.31.0",
    "fastapi>=0.104.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "black>=23.0.0",
]
```

### Option 3: Poetry

```bash
pip install poetry

# Initialize project
poetry init

# Add dependencies
poetry add requests
poetry add --group dev pytest

# Install
poetry install
```

## Performance Tips

### Use Built-in Functions

```python
# Slow
result = []
for item in items:
    result.append(item * 2)

# Fast
result = [item * 2 for item in items]

# Faster (for large datasets)
result = list(map(lambda x: x * 2, items))
```

### Use Generator Expressions

```python
# Memory-intensive
squares = [x**2 for x in range(1000000)]

# Memory-efficient
squares = (x**2 for x in range(1000000))
```

### Profile Code

```bash
# Install profiling tools
pip install line_profiler memory_profiler

# Profile script
python -m cProfile -s cumulative script.py

# Line profiler
kernprof -l -v script.py

# Memory profiler
python -m memory_profiler script.py
```

## Debugging

### Python Debugger (pdb)

```python
import pdb

def buggy_function(x):
    pdb.set_trace()  # Breakpoint
    result = x * 2
    return result
```

**pdb Commands:**
```
n - next line
s - step into
c - continue
p variable - print variable
l - list code
q - quit
```

### VS Code Debugger

Already configured with Python extension. 

**launch.json:**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: Current File",
      "type": "python",
      "request": "launch",
      "program": "${file}",
      "console": "integratedTerminal"
    },
    {
      "name": "Python: FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": ["main:app", "--reload"],
      "jinja": true
    }
  ]
}
```

## Testing Setup

Verify Python is configured correctly:
```bash
python --version
pip --version
pip list --user
```

Check installed packages:
```bash
pip freeze
```

## Security Best Practices

1. **Pin dependencies** - Use exact versions in requirements.txt
2. **Audit packages** - Run `pip audit` regularly
3. **Don't commit secrets** - Use .env and .gitignore
4. **Use virtual environments** - Isolate project dependencies
5. **Keep Python updated** - Update to latest patch versions
6. **Validate input** - Never trust user input
7. **Use type hints** - Catch errors early with mypy

## Common Issues

### Import errors

```bash
# Ensure PYTHONPATH includes src/
export PYTHONPATH="${PYTHONPATH}:${PWD}/src"

# Or install in editable mode
pip install -e .
```

### Permission errors

```bash
# Use --user flag
pip install --user package-name

# Or ensure pip is upgraded
pip install --upgrade pip
```

### Conflicting dependencies

```bash
# Use pip-tools
pip install pip-tools

# Create requirements.in with loose versions
cat > requirements.in <<EOF
requests
fastapi
EOF

# Compile to requirements.txt with exact versions
pip-compile requirements.in
```

## Related Overlays

- **mkdocs** - Python-based documentation (includes MkDocs + Material theme)
- **pre-commit** - Code quality gates (works great with Python hooks)
- **postgres** - PostgreSQL database (for Django/Flask apps)
- **redis** - Redis cache (for Celery/FastAPI apps)

## Additional Resources

- [Python Documentation](https://docs.python.org/3/)
- [Python Package Index (PyPI)](https://pypi.org/)
- [Real Python Tutorials](https://realpython.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Django Documentation](https://docs.djangoproject.com/)
- [pytest Documentation](https://docs.pytest.org/)
