# Jupyter Overlay

Jupyter notebook server for interactive computing and data science.

## Features

- **Jupyter Notebook/Lab** - Interactive computing environment
- **Python kernel** - Run Python code interactively
- **Persistent notebooks** - Work saved across container restarts
- **Volume mounting** - Access notebooks from host filesystem
- **No authentication** - Pre-configured for development use
- **Docker Compose service** - Runs as separate container

## How It Works

This overlay adds Jupyter as a Docker Compose service running in its own container. Jupyter is accessible from your development container and your browser via port 8888.

**Dependencies:**

- `python` (required) - Python runtime for notebooks

**Architecture:**

- Jupyter service runs on port 8888
- Notebooks stored in Docker volume (`jupyter-data`)
- Optional local directory mounting for notebooks
- JupyterLab interface enabled by default

## Configuration

### Environment Variables

The overlay includes a `.env.example` file. Copy it to `.env` and customize:

```bash
cd .devcontainer
cp .env.example .env
```

**Default values (.env.example):**

```bash
# Jupyter Configuration
JUPYTER_VERSION=latest
JUPYTER_ENABLE_LAB=yes
JUPYTER_TOKEN=
JUPYTER_PORT=8888
JUPYTER_NOTEBOOKS_PATH=./notebooks
```

### Notebook Directory

By default, notebooks can be created in the Jupyter container. To use notebooks from your host:

1. Create a `notebooks` directory in your project root
2. Notebooks in this directory will be available at `/home/jovyan/notebooks` in Jupyter

### Authentication

By default, authentication is disabled for local development:

- No token required
- No password required

For production or shared environments, set `JUPYTER_TOKEN`:

```bash
JUPYTER_TOKEN=your-secure-token
```

### Port Configuration

The default port (8888) can be changed via the `--port-offset` option:

```bash
npm run init -- --port-offset 100 --stack compose --language python,jupyter
# Jupyter will be on port 8988
```

## Common Commands

### Accessing Jupyter

```bash
# Open in browser
http://localhost:8888

# Or use container hostname from dev container
curl http://jupyter:8888
```

### Notebook Management

Jupyter provides a web interface for all notebook operations:

- Create new notebooks
- Upload existing notebooks
- Download notebooks
- Organize in folders
- Run code cells
- Export to various formats (HTML, PDF, etc.)

### Using Python in Notebooks

```python
# Install packages
!pip install pandas numpy matplotlib seaborn

# Import and use
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# Your analysis code
df = pd.read_csv('data.csv')
df.head()
```

### JupyterLab Features

JupyterLab is enabled by default and provides:

- Multiple tabs
- File browser
- Terminal
- Text editor
- Markdown preview
- Extension manager

## Use Cases

- **Data analysis** - Explore and visualize datasets
- **Machine learning** - Develop and train models
- **Scientific computing** - Mathematical and statistical analysis
- **Documentation** - Create executable documentation
- **Teaching** - Interactive tutorials and examples
- **Prototyping** - Quick experimentation with code

**Integrates well with:**

- `python` - Python runtime (required)
- `postgres` - Database for data analysis
- `duckdb` - Analytics database
- `redis` - Caching and data structures

## Available Images

Jupyter provides different base images:

- `jupyter/minimal-notebook` - Minimal Jupyter with Python (default)
- `jupyter/scipy-notebook` - Scientific Python stack
- `jupyter/datascience-notebook` - Julia, Python, R
- `jupyter/tensorflow-notebook` - TensorFlow and Keras
- `jupyter/pyspark-notebook` - PySpark

Change via `JUPYTER_VERSION`:

```bash
JUPYTER_VERSION=scipy-notebook
```

## Troubleshooting

### Jupyter Not Starting

Check service logs:

```bash
docker-compose logs jupyter
```

### Port Already in Use

Change the port in `.env`:

```bash
JUPYTER_PORT=8889
```

Or use port offset when generating.

### Notebooks Not Persisting

Ensure you're saving notebooks to the mounted volume or directory:

- `/home/jovyan/work` - Persistent volume
- `/home/jovyan/notebooks` - Mounted from host

### Package Installation

Packages installed with `!pip install` are lost on container restart. To persist:

1. Create a `requirements.txt` in your notebooks directory
2. Install in a notebook: `!pip install -r /home/jovyan/notebooks/requirements.txt`

Or extend the Jupyter image with a custom Dockerfile.

## References

- [Jupyter Documentation](https://jupyter.org/documentation)
- [JupyterLab Documentation](https://jupyterlab.readthedocs.io/)
- [Jupyter Docker Stacks](https://jupyter-docker-stacks.readthedocs.io/)
- [Jupyter Notebook Basics](https://jupyter-notebook.readthedocs.io/en/stable/notebook.html)

**Related Overlays:**

- `python` - Python runtime (required)
- `postgres` - Database for analysis
- `duckdb` - Analytics database
- `redis` - Data structures
