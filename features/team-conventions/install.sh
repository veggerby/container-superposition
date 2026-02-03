#!/bin/bash
set -e

PRESET=${PRESET:-"airbnb"}
ENABLE_COMMIT_LINT=${ENABLECOMMITLINT:-"true"}
ENABLE_PRE_COMMIT=${ENABLEPRECOMMIT:-"true"}

echo "Installing team conventions (preset: $PRESET)..."

# Create conventions setup script
cat > /usr/local/bin/setup-team-conventions << 'EOF'
#!/bin/bash
set -e

PROJECT_DIR="${1:-.}"
PRESET="${2:-airbnb}"

cd "$PROJECT_DIR"

echo "Setting up team conventions with $PRESET preset..."

# Create .eslintrc.json
cat > .eslintrc.json << 'ESLINT'
{
  "extends": ["eslint:recommended"],
  "env": {
    "node": true,
    "es2022": true
  },
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "rules": {
    "no-console": "warn",
    "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "semi": ["error", "always"],
    "quotes": ["error", "single"]
  }
}
ESLINT

# Create .prettierrc.json
cat > .prettierrc.json << 'PRETTIER'
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
PRETTIER

# Create .editorconfig
cat > .editorconfig << 'EDITORCONFIG'
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
EDITORCONFIG

# Create commitlint config
cat > commitlint.config.js << 'COMMITLINT'
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'revert']
    ],
    'subject-case': [2, 'never', ['upper-case']]
  }
};
COMMITLINT

echo "✅ Team conventions configured!"
echo "Remember to run: npm install --save-dev eslint prettier @commitlint/cli @commitlint/config-conventional"
EOF

chmod +x /usr/local/bin/setup-team-conventions

echo "✅ Team conventions installer ready!"
echo "Run 'setup-team-conventions' in your project directory"
