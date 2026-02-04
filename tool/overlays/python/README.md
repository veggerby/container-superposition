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

1. ✅ Checks for `requirements.txt` → installs with pip
2. ✅ Checks for `requirements-dev.txt` → installs dev dependencies
3. ✅ Checks for `pyproject.toml` → installs project in editable mode
4. ✅ Checks for `setup.py` → installs legacy projects
5. ✅ Upgrades pip, setuptools, and wheel to latest

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

## Related Overlays

- **mkdocs** - Python-based documentation (includes MkDocs + Material theme)
- **pre-commit** - Code quality gates (works great with Python hooks)
