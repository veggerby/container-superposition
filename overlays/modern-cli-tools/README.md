# Modern CLI Tools Overlay

Essential modern command-line tools for faster, better development workflows.

## What's Included

- **jq** - JSON processor and query language
- **yq** - YAML/XML/TOML processor (jq for YAML)
- **ripgrep (rg)** - Extremely fast grep alternative
- **fd** - Fast and user-friendly find alternative
- **bat** - Cat clone with syntax highlighting and Git integration

## Tools Overview

### jq - JSON Processor

**Why:** Parse, filter, and transform JSON with ease.

```bash
# Pretty-print JSON
cat data.json | jq

# Extract field
echo '{"name":"Alice"}' | jq '.name'
# Output: "Alice"

# Filter array
echo '[1,2,3,4,5]' | jq 'map(. * 2)'
# Output: [2,4,6,8,10]

# Complex query
curl https://api.github.com/users/github | jq '.public_repos'
```

### yq - YAML Processor

**Why:** jq-like functionality for YAML, XML, and TOML.

```bash
# Pretty-print YAML
cat config.yml | yq

# Extract value
yq '.database.host' config.yml
# Output: localhost

# Convert YAML to JSON
yq -o json config.yml

# Modify YAML
yq '.version = "2.0"' config.yml
```

### ripgrep (rg) - Fast Grep

**Why:** 10-100x faster than grep, respects .gitignore.

```bash
# Search for pattern
rg 'TODO'

# Search with context
rg -C 3 'error'

# Search specific file types
rg 'function' -t js

# Case-insensitive
rg -i 'error'

# Search and replace (preview)
rg 'old' --replace 'new'
```

### fd - Fast Find

**Why:** Simpler syntax, faster, respects .gitignore.

```bash
# Find files by name
fd config

# Find by extension
fd -e js

# Find and execute
fd -e json -x cat

# Exclude patterns
fd -E node_modules

# Show hidden files
fd -H .env
```

### bat - Better Cat

**Why:** Syntax highlighting, Git integration, paging.

```bash
# Display file with syntax highlighting
bat src/main.js

# Show with line numbers
bat -n file.py

# Show Git changes
bat -d file.js

# Page long files
bat --paging always large.log

# Multiple files
bat file1.js file2.py
```

## Quick Start Examples

### Working with JSON

```bash
# Fetch and format API response
curl -s https://api.github.com/repos/microsoft/vscode | jq '{name, stars: .stargazers_count}'

# Filter package.json dependencies
cat package.json | jq '.dependencies | keys'

# Extract nested values
echo '{"user":{"name":"Alice","age":30}}' | jq '.user.name'
```

### Working with YAML

```bash
# Read Docker Compose service names
yq '.services | keys' docker-compose.yml

# Update YAML value
yq -i '.version = "3.8"' docker-compose.yml

# Convert between formats
yq -o json config.yml > config.json
yq -o yaml config.json > config.yml
```

### Searching Code

```bash
# Find all TODOs
rg 'TODO|FIXME'

# Search for function definitions (JavaScript)
rg 'function \w+' -t js

# Find imports
rg '^import .* from' -t ts

# Count occurrences
rg 'error' --count

# Search with file path pattern
rg 'class' --glob '**/*.py'
```

### Finding Files

```bash
# Find TypeScript files
fd -e ts

# Find config files
fd config

# Find recently modified files
fd -e js --changed-within 1d

# Find and remove
fd -e log -x rm

# Find in specific directory
fd -e json src/
```

### Viewing Files

```bash
# View with syntax highlighting
bat README.md

# Compare files
bat -d old.js new.js

# View specific lines
bat -r 10:20 file.js

# View multiple files
bat src/**/*.js
```

## Advanced Usage

### jq Advanced

**Filters and Pipes:**

```bash
# Chain operations
jq '.users | map(.name) | sort | unique'

# Conditional selection
jq '.[] | select(.age > 18)'

# Group by field
jq 'group_by(.category)'

# Create new structure
jq '{name: .firstName, email: .emailAddress}'
```

**Working with Arrays:**

```bash
# Map and filter
echo '[1,2,3,4,5]' | jq 'map(select(. > 2))'

# Reduce
echo '[1,2,3,4,5]' | jq 'reduce .[] as $i (0; . + $i)'

# Flatten
echo '[[1,2],[3,4]]' | jq 'flatten'
```

### yq Advanced

**Multiple Documents:**

```bash
# Process all YAML documents in file
yq eval-all '. | select(.kind == "Deployment")' k8s.yml

# Merge YAML files
yq eval-all '. as $item ireduce ({}; . * $item)' file1.yml file2.yml
```

**Modify in Place:**

```bash
# Update nested value
yq -i '.metadata.labels.version = "2.0"' deploy.yml

# Add new field
yq -i '.spec.replicas = 3' deploy.yml

# Delete field
yq -i 'del(.spec.template)' deploy.yml
```

### ripgrep Advanced

**File Type Filtering:**

```bash
# Search TypeScript/JavaScript
rg 'export' -t ts -t js

# Custom file type
rg --type-add 'custom:*.{vue,jsx}' -t custom 'component'

# Exclude file types
rg 'error' -T json
```

**Output Formatting:**

```bash
# Only show matching content
rg -o 'email: \S+@\S+'

# Show file names only
rg -l 'TODO'

# Count matches per file
rg --count 'error'

# JSON output
rg --json 'pattern'
```

### fd Advanced

**Execute Commands:**

```bash
# Run command for each file
fd -e js -x eslint

# Run with placeholders
fd -e md -x echo "Processing: {}"

# Parallel execution
fd -e jpg -x convert {} -resize 50% resized-{}
```

**Filter by Time:**

```bash
# Modified in last 24 hours
fd -e log --changed-within 24h

# Created before date
fd --changed-before '2024-01-01'
```

### bat Advanced

**Themes:**

```bash
# List available themes
bat --list-themes

# Use specific theme
bat --theme="Dracula" file.js

# Set default theme in config
echo '--theme="Monokai Extended"' >> ~/.config/bat/config
```

**Integration:**

```bash
# Use as man pager
export MANPAGER="sh -c 'col -bx | bat -l man -p'"

# Git diff
git diff | bat -l diff

# Piping
curl -s https://example.com | bat -l html
```

## Configuration

### bat Config

Located at `~/.config/bat/config`:

```bash
# Default theme
--theme="Monokai Extended"

# Always show line numbers
--style="numbers,changes,header"

# Enable italic text
--italic-text=always

# Paging behavior
--paging=auto

# Wrap long lines
--wrap=auto
```

### ripgrep Config

Create `~/.ripgreprc`:

```bash
# Follow symbolic links
--follow

# Search hidden files
--hidden

# Don't search these directories
--glob=!.git/
--glob=!node_modules/
--glob=!dist/

# Smart case (case-insensitive if all lowercase)
--smart-case
```

Use in shell:

```bash
export RIPGREP_CONFIG_PATH=~/.ripgreprc
```

### Shell Aliases

The overlay creates these aliases in `~/.bash_aliases`:

```bash
# Use modern tools as defaults
alias cat='bat'
alias less='bat'
alias grep='rg'
alias find='fd'

# Enhanced jq/yq
alias jqp='jq -C . | bat -l json'
alias yqp='yq -C | bat -l yaml'
```

## Integration with Other Tools

### Git

```bash
# Better git diff
git config --global pager.diff "bat --style=plain"

# Better git log
git config --global pager.log "bat --style=plain"
```

### fzf (Fuzzy Finder)

```bash
# Use fd for file listing
export FZF_DEFAULT_COMMAND='fd --type f --hidden --follow --exclude .git'

# Preview with bat
export FZF_CTRL_T_OPTS="--preview 'bat --color=always --line-range :500 {}'"
```

### VS Code

Search with ripgrep (already default in VS Code).

## Performance Comparisons

| Task        | Traditional         | Modern  | Speedup |
| ----------- | ------------------- | ------- | ------- |
| Search text | grep                | ripgrep | 10-100x |
| Find files  | find                | fd      | 5-20x   |
| View file   | cat                 | bat     | +syntax |
| Parse JSON  | python -m json.tool | jq      | 3-10x   |

## Cheat Sheets

### jq

```bash
jq '.'                    # Pretty-print
jq '.field'               # Access field
jq '.[]'                  # Array elements
jq '.[0]'                 # First element
jq '.[] | .name'          # Map to field
jq 'keys'                 # Object keys
jq 'length'               # Array/object length
jq 'select(.x > 5)'       # Filter
jq 'map(.x * 2)'          # Transform
jq 'sort_by(.name)'       # Sort
```

### yq

```bash
yq '.'                    # Pretty-print
yq '.field'               # Access field
yq -o json                # Output as JSON
yq -i '.x = 5'            # Modify in-place
yq eval-all 'select(.kind == "Pod")'  # Filter
```

### ripgrep

```bash
rg 'pattern'              # Basic search
rg -i 'pattern'           # Case-insensitive
rg -w 'word'              # Match whole word
rg -t js 'pattern'        # File type
rg -l 'pattern'           # Files with matches
rg -c 'pattern'           # Count per file
rg -A 3 'pattern'         # 3 lines after
rg -B 3 'pattern'         # 3 lines before
```

### fd

```bash
fd 'pattern'              # Find files
fd -e js                  # By extension
fd -H                     # Include hidden
fd -E node_modules        # Exclude pattern
fd -x cmd                 # Execute command
fd -t f                   # Files only
fd -t d                   # Directories only
```

### bat

```bash
bat file                  # View file
bat -n file               # With line numbers
bat -p file               # Plain (no decorations)
bat -A file               # Show all characters
bat -l js file            # Force language
bat -d old new            # Diff mode
```

## Troubleshooting

### Aliases Not Working

Reload shell configuration:

```bash
source ~/.bashrc
```

Or start new shell session.

### bat Theme Not Applied

List available themes:

```bash
bat --list-themes
```

Set in config:

```bash
echo '--theme="Monokai Extended"' >> ~/.config/bat/config
```

### ripgrep Too Slow

Exclude large directories:

```bash
rg 'pattern' --glob '!node_modules' --glob '!dist'
```

Or configure permanently in `~/.ripgreprc`.

### fd Not Finding Hidden Files

Use `-H` flag:

```bash
fd -H '.env'
```

## Additional Resources

- [jq Manual](https://jqlang.github.io/jq/manual/)
- [jq Playground](https://jqplay.org/)
- [yq Documentation](https://mikefarah.gitbook.io/yq/)
- [ripgrep Guide](https://github.com/BurntSushi/ripgrep/blob/master/GUIDE.md)
- [fd Documentation](https://github.com/sharkdp/fd)
- [bat Documentation](https://github.com/sharkdp/bat)
