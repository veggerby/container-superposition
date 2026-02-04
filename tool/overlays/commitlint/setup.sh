#!/bin/bash
# Commitlint setup script

set -e

echo "📝 Setting up commitlint..."

# Install commitlint and conventional commits config globally
npm install -g @commitlint/cli @commitlint/config-conventional

# Verify installation
if command -v commitlint &> /dev/null; then
    echo "✓ commitlint installed: $(commitlint --version)"
else
    echo "✗ commitlint installation failed"
    exit 1
fi

# Create commitlint.config.js if it doesn't exist
if [ ! -f commitlint.config.js ]; then
    cat > commitlint.config.js << 'EOF'
// Commitlint configuration
// See https://commitlint.js.org for more information

module.exports = {
  extends: ['@commitlint/config-conventional'],
  
  // Custom rules
  rules: {
    // Type enum
    'type-enum': [
      2,
      'always',
      [
        'feat',      // New feature
        'fix',       // Bug fix
        'docs',      // Documentation changes
        'style',     // Code style changes (formatting, semicolons, etc)
        'refactor',  // Code refactoring
        'perf',      // Performance improvements
        'test',      // Adding or updating tests
        'build',     // Build system changes
        'ci',        // CI/CD changes
        'chore',     // Other changes (dependencies, etc)
        'revert',    // Revert previous commit
      ],
    ],
    
    // Subject line requirements
    'subject-case': [2, 'always', 'sentence-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-max-length': [2, 'always', 100],
    
    // Body requirements
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 100],
    
    // Footer requirements
    'footer-leading-blank': [2, 'always'],
    
    // Scope requirements (optional)
    'scope-case': [2, 'always', 'lower-case'],
  },
  
  // Prompt settings (for interactive commits)
  prompt: {
    settings: {},
    messages: {
      skip: ': skip',
      max: 'upper %d chars',
      min: '%d chars at least',
      emptyWarning: 'can not be empty',
      upperLimitWarning: 'over limit',
      lowerLimitWarning: 'below limit',
    },
    questions: {
      type: {
        description: "Select the type of change that you're committing:",
        enum: {
          feat: {
            description: 'A new feature',
            title: 'Features',
            emoji: '✨',
          },
          fix: {
            description: 'A bug fix',
            title: 'Bug Fixes',
            emoji: '🐛',
          },
          docs: {
            description: 'Documentation only changes',
            title: 'Documentation',
            emoji: '📚',
          },
          style: {
            description: 'Changes that do not affect the meaning of the code',
            title: 'Styles',
            emoji: '💎',
          },
          refactor: {
            description: 'A code change that neither fixes a bug nor adds a feature',
            title: 'Code Refactoring',
            emoji: '♻️',
          },
          perf: {
            description: 'A code change that improves performance',
            title: 'Performance Improvements',
            emoji: '🚀',
          },
          test: {
            description: 'Adding missing tests or correcting existing tests',
            title: 'Tests',
            emoji: '🧪',
          },
          build: {
            description: 'Changes that affect the build system or external dependencies',
            title: 'Builds',
            emoji: '🛠',
          },
          ci: {
            description: 'Changes to our CI configuration files and scripts',
            title: 'Continuous Integrations',
            emoji: '⚙️',
          },
          chore: {
            description: "Other changes that don't modify src or test files",
            title: 'Chores',
            emoji: '♻️',
          },
          revert: {
            description: 'Reverts a previous commit',
            title: 'Reverts',
            emoji: '🗑',
          },
        },
      },
      scope: {
        description: 'What is the scope of this change (e.g. component or file name)',
      },
      subject: {
        description: 'Write a short, imperative tense description of the change',
      },
      body: {
        description: 'Provide a longer description of the change',
      },
      isBreaking: {
        description: 'Are there any breaking changes?',
      },
      breakingBody: {
        description: 'A BREAKING CHANGE commit requires a body. Please enter a longer description',
      },
      breaking: {
        description: 'Describe the breaking changes',
      },
      isIssueAffected: {
        description: 'Does this change affect any open issues?',
      },
      issuesBody: {
        description: 'If issues are closed, the commit requires a body. Please enter a longer description',
      },
      issues: {
        description: 'Add issue references (e.g. "fix #123", "re #123")',
      },
    },
  },
};
EOF
    echo "✓ commitlint.config.js created"
fi

# Create .commitlintrc.json if user prefers JSON format
if [ ! -f .commitlintrc.json ] && [ ! -f commitlint.config.js ]; then
    cat > .commitlintrc.json << 'EOF'
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert"
      ]
    ],
    "subject-case": [2, "always", "sentence-case"],
    "subject-max-length": [2, "always", 100]
  }
}
EOF
fi

# Install commit-msg hook
if [ -d .git ]; then
    cat > .git/hooks/commit-msg << 'EOF'
#!/bin/bash
# Commitlint hook - validates commit messages

# Check if commitlint is available
if ! command -v commitlint &> /dev/null; then
    echo "⚠️  commitlint not found, skipping validation"
    exit 0
fi

# Run commitlint
commitlint --edit "$1"
EOF
    chmod +x .git/hooks/commit-msg
    echo "✓ commit-msg hook installed"
else
    echo "⚠️  Not a git repository - skipping hook installation"
    echo "   Run the following command manually after git init:"
    echo "   echo '#!/bin/bash' > .git/hooks/commit-msg"
    echo "   echo 'commitlint --edit \$1' >> .git/hooks/commit-msg"
    echo "   chmod +x .git/hooks/commit-msg"
fi

echo "✓ Commitlint setup complete"
echo ""
echo "💡 Usage:"
echo "  - Commit messages must follow conventional commits format"
echo "  - Format: type(scope): subject"
echo "  - Example: feat(auth): Add OAuth2 authentication"
echo "  - Test your message: echo 'feat: test' | commitlint"
echo "  - Interactive commit: npx commitizen"
