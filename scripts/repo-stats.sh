#!/usr/bin/env bash
#
# Repository Statistics and Health Check Script
# A generic tool for analyzing git repositories
#
# Usage: ./repo-stats.sh [options]
#
# Options:
#   --all           Run all checks (default)
#   --git           Git statistics only
#   --code          Code statistics only
#   --deps          Dependency checks only
#   --health        Health checks only
#   --help          Show this help message

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default: run all checks
RUN_GIT=false
RUN_CODE=false
RUN_DEPS=false
RUN_HEALTH=false

# Parse arguments
if [ $# -eq 0 ]; then
    RUN_GIT=true
    RUN_CODE=true
    RUN_DEPS=true
    RUN_HEALTH=true
else
    for arg in "$@"; do
        case $arg in
            --all)
                RUN_GIT=true
                RUN_CODE=true
                RUN_DEPS=true
                RUN_HEALTH=true
                ;;
            --git)
                RUN_GIT=true
                ;;
            --code)
                RUN_CODE=true
                ;;
            --deps)
                RUN_DEPS=true
                ;;
            --health)
                RUN_HEALTH=true
                ;;
            --help)
                sed -n '2,/^$/p' "$0" | grep '^#' | sed 's/^# //' | sed 's/^#//'
                exit 0
                ;;
            *)
                echo "Unknown option: $arg"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
fi

# Helper function to print section headers
print_header() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Helper function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}Error: Not a git repository${NC}"
    exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

echo -e "${GREEN}Repository Statistics${NC}"
echo -e "${YELLOW}Location: ${REPO_ROOT}${NC}"
echo ""

# ============================================================================
# GIT STATISTICS
# ============================================================================
if [ "$RUN_GIT" = true ]; then
    print_header "Git Statistics"

    # Repository info
    echo -e "${YELLOW}Repository:${NC}"
    git remote get-url origin 2>/dev/null || echo "  No remote configured"
    
    CURRENT_BRANCH=$(git branch --show-current)
    echo -e "  Current branch: ${GREEN}${CURRENT_BRANCH}${NC}"
    
    # Commit counts
    TOTAL_COMMITS=$(git rev-list --count HEAD)
    COMMITS_30_DAYS=$(git log --since="30 days ago" --oneline | wc -l | tr -d ' ')
    COMMITS_7_DAYS=$(git log --since="7 days ago" --oneline | wc -l | tr -d ' ')
    
    echo ""
    echo -e "${YELLOW}Commits:${NC}"
    echo "  Total: $TOTAL_COMMITS"
    echo "  Last 30 days: $COMMITS_30_DAYS"
    echo "  Last 7 days: $COMMITS_7_DAYS"
    
    # Contributors
    echo ""
    echo -e "${YELLOW}Top Contributors (by commits):${NC}"
    git shortlog -sn --all | head -10 | while read -r count name; do
        printf "  %4d  %s\n" "$count" "$name"
    done
    
    # Contributors by lines
    echo ""
    echo -e "${YELLOW}Top Contributors (by lines authored):${NC}"
    git ls-files | xargs -n1 git blame --line-porcelain 2>/dev/null | \
        grep "^author " | sort | uniq -c | sort -rn | head -10 | \
        while read -r count _ name; do
            printf "  %6d  %s\n" "$count" "$name"
        done
    
    # Branches
    echo ""
    echo -e "${YELLOW}Branches:${NC}"
    LOCAL_BRANCHES=$(git branch | wc -l | tr -d ' ')
    REMOTE_BRANCHES=$(git branch -r | wc -l | tr -d ' ')
    echo "  Local: $LOCAL_BRANCHES"
    echo "  Remote: $REMOTE_BRANCHES"
    
    # Tags/Releases
    echo ""
    echo -e "${YELLOW}Tags/Releases:${NC}"
    TAG_COUNT=$(git tag -l | wc -l | tr -d ' ')
    if [ "$TAG_COUNT" -gt 0 ]; then
        echo "  Total tags: $TAG_COUNT"
        echo "  Latest tags:"
        git tag -l --sort=-version:refname | head -5 | sed 's/^/    /'
    else
        echo "  No tags found"
    fi
    
    # Recent activity
    echo ""
    echo -e "${YELLOW}Recent Commits:${NC}"
    git log --oneline --graph --decorate -10 | sed 's/^/  /'
fi

# ============================================================================
# CODE STATISTICS
# ============================================================================
if [ "$RUN_CODE" = true ]; then
    print_header "Code Statistics"
    
    # File type breakdown
    echo -e "${YELLOW}File Type Distribution:${NC}"
    find . -type f \
        -not -path '*/\.*' \
        -not -path '*/node_modules/*' \
        -not -path '*/dist/*' \
        -not -path '*/build/*' \
        -not -path '*/vendor/*' \
        -not -path '*/target/*' \
        -not -path '*/__pycache__/*' \
        2>/dev/null | \
        sed 's/.*\.//' | sort | uniq -c | sort -rn | head -15 | \
        while read -r count ext; do
            printf "  %4d  %s\n" "$count" "$ext"
        done
    
    # Lines of code (if cloc is available)
    echo ""
    if command_exists cloc; then
        echo -e "${YELLOW}Lines of Code:${NC}"
        cloc --exclude-dir=node_modules,dist,build,vendor,target,.git --quiet . 2>/dev/null || \
            echo "  Could not generate code statistics"
    else
        echo -e "${YELLOW}Lines of Code:${NC} (install 'cloc' for detailed stats)"
        # Fallback: simple line count
        TOTAL_LINES=$(find . -type f \
            -not -path '*/\.*' \
            -not -path '*/node_modules/*' \
            -not -path '*/dist/*' \
            -not -path '*/build/*' \
            -not -path '*/vendor/*' \
            2>/dev/null | \
            xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')
        echo "  Total lines: $TOTAL_LINES (approximate)"
    fi
    
    # Largest files
    echo ""
    echo -e "${YELLOW}Largest Files:${NC}"
    find . -type f \
        -not -path '*/node_modules/*' \
        -not -path '*/.git/*' \
        -not -path '*/dist/*' \
        -not -path '*/build/*' \
        -not -path '*/vendor/*' \
        2>/dev/null | \
        xargs du -h 2>/dev/null | sort -rh | head -10 | \
        while read -r size file; do
            printf "  %6s  %s\n" "$size" "$file"
        done
    
    # TODO/FIXME comments
    echo ""
    echo -e "${YELLOW}Technical Debt Markers:${NC}"
    TODO_COUNT=$(grep -r "TODO\|FIXME\|XXX\|HACK" \
        --include="*.ts" --include="*.js" --include="*.py" \
        --include="*.java" --include="*.go" --include="*.rs" \
        --include="*.c" --include="*.cpp" --include="*.sh" \
        --exclude-dir=node_modules --exclude-dir=dist \
        --exclude-dir=build --exclude-dir=vendor \
        . 2>/dev/null | wc -l | tr -d ' ')
    
    if [ "$TODO_COUNT" -gt 0 ]; then
        echo "  Found $TODO_COUNT TODO/FIXME/XXX/HACK comments"
        echo ""
        echo "  Breakdown:"
        grep -r "TODO" --include="*.ts" --include="*.js" --include="*.py" \
            --include="*.java" --include="*.go" --include="*.rs" \
            --exclude-dir=node_modules --exclude-dir=dist \
            . 2>/dev/null | wc -l | xargs printf "    TODO:  %d\n"
        grep -r "FIXME" --include="*.ts" --include="*.js" --include="*.py" \
            --include="*.java" --include="*.go" --include="*.rs" \
            --exclude-dir=node_modules --exclude-dir=dist \
            . 2>/dev/null | wc -l | xargs printf "    FIXME: %d\n"
        grep -r "XXX" --include="*.ts" --include="*.js" --include="*.py" \
            --include="*.java" --include="*.go" --include="*.rs" \
            --exclude-dir=node_modules --exclude-dir=dist \
            . 2>/dev/null | wc -l | xargs printf "    XXX:   %d\n"
        grep -r "HACK" --include="*.ts" --include="*.js" --include="*.py" \
            --include="*.java" --include="*.go" --include="*.rs" \
            --exclude-dir=node_modules --exclude-dir=dist \
            . 2>/dev/null | wc -l | xargs printf "    HACK:  %d\n"
    else
        echo "  No technical debt markers found"
    fi
fi

# ============================================================================
# DEPENDENCY CHECKS
# ============================================================================
if [ "$RUN_DEPS" = true ]; then
    print_header "Dependency Checks"
    
    # Node.js/npm projects
    if [ -f "package.json" ]; then
        echo -e "${YELLOW}Node.js Project Detected${NC}"
        
        # Dependency count
        if command_exists jq; then
            DEPS=$(jq -r '.dependencies // {} | length' package.json)
            DEV_DEPS=$(jq -r '.devDependencies // {} | length' package.json)
            echo "  Dependencies: $DEPS"
            echo "  Dev Dependencies: $DEV_DEPS"
        else
            TOTAL_DEPS=$(grep -c '":' package.json 2>/dev/null || echo "unknown")
            echo "  Total dependencies: ~$TOTAL_DEPS (install 'jq' for exact count)"
        fi
        
        # Outdated packages
        echo ""
        if command_exists npm; then
            echo -e "${YELLOW}Outdated Packages:${NC}"
            npm outdated 2>/dev/null | head -20 || echo "  All dependencies up to date"
        fi
        
        # Security audit
        echo ""
        if command_exists npm; then
            echo -e "${YELLOW}Security Audit:${NC}"
            npm audit --omit=dev 2>/dev/null | grep -A 5 "found\|Severity" || echo "  No vulnerabilities found"
        fi
        
        # TypeScript
        if [ -f "tsconfig.json" ]; then
            echo ""
            echo -e "${YELLOW}TypeScript Configuration:${NC}"
            echo "  tsconfig.json found"
            if command_exists npx; then
                echo "  Type checking..."
                if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
                    ERROR_COUNT=$(npx tsc --noEmit 2>&1 | grep "error TS" | wc -l | tr -d ' ')
                    echo -e "  ${RED}Found $ERROR_COUNT type errors${NC}"
                else
                    echo -e "  ${GREEN}No type errors${NC}"
                fi
            fi
        fi
    fi
    
    # Python projects
    if [ -f "requirements.txt" ] || [ -f "pyproject.toml" ] || [ -f "setup.py" ]; then
        echo ""
        echo -e "${YELLOW}Python Project Detected${NC}"
        
        if [ -f "requirements.txt" ]; then
            DEP_COUNT=$(grep -v '^#' requirements.txt | grep -v '^$' | wc -l | tr -d ' ')
            echo "  requirements.txt: $DEP_COUNT dependencies"
        fi
        
        if [ -f "pyproject.toml" ]; then
            echo "  pyproject.toml found"
        fi
        
        if command_exists pip; then
            echo ""
            echo -e "${YELLOW}Outdated Python Packages:${NC}"
            pip list --outdated 2>/dev/null | head -10 || echo "  Could not check"
        fi
    fi
    
    # Go projects
    if [ -f "go.mod" ]; then
        echo ""
        echo -e "${YELLOW}Go Project Detected${NC}"
        if command_exists go; then
            DEP_COUNT=$(go list -m all 2>/dev/null | wc -l | tr -d ' ')
            echo "  Dependencies: $DEP_COUNT"
        fi
    fi
    
    # Rust projects
    if [ -f "Cargo.toml" ]; then
        echo ""
        echo -e "${YELLOW}Rust Project Detected${NC}"
        if command_exists cargo; then
            echo "  Cargo.toml found"
            cargo tree --depth 1 2>/dev/null | head -10 || echo "  Could not analyze dependencies"
        fi
    fi
fi

# ============================================================================
# HEALTH CHECKS
# ============================================================================
if [ "$RUN_HEALTH" = true ]; then
    print_header "Repository Health"
    
    # Git status
    echo -e "${YELLOW}Working Directory:${NC}"
    if [ -n "$(git status --porcelain)" ]; then
        MODIFIED=$(git status --porcelain | grep -c '^ M' 2>/dev/null | tr -d '\n ' || echo 0)
        ADDED=$(git status --porcelain | grep -c '^A' 2>/dev/null | tr -d '\n ' || echo 0)
        DELETED=$(git status --porcelain | grep -c '^ D' 2>/dev/null | tr -d '\n ' || echo 0)
        UNTRACKED=$(git status --porcelain | grep -c '^??' 2>/dev/null | tr -d '\n ' || echo 0)
        
        echo -e "  ${YELLOW}Uncommitted changes detected${NC}"
        [ "$MODIFIED" -gt 0 ] && echo "    Modified: $MODIFIED"
        [ "$ADDED" -gt 0 ] && echo "    Added: $ADDED"
        [ "$DELETED" -gt 0 ] && echo "    Deleted: $DELETED"
        [ "$UNTRACKED" -gt 0 ] && echo "    Untracked: $UNTRACKED"
    else
        echo -e "  ${GREEN}Clean working directory${NC}"
    fi
    
    # Branch status
    echo ""
    echo -e "${YELLOW}Branch Status:${NC}"
    UPSTREAM=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "")
    if [ -n "$UPSTREAM" ]; then
        AHEAD=$(git rev-list --count HEAD@{upstream}..HEAD 2>/dev/null || echo 0)
        BEHIND=$(git rev-list --count HEAD..HEAD@{upstream} 2>/dev/null || echo 0)
        
        echo "  Tracking: $UPSTREAM"
        if [ "$AHEAD" -gt 0 ]; then
            echo -e "  ${YELLOW}Ahead by $AHEAD commits${NC}"
        fi
        if [ "$BEHIND" -gt 0 ]; then
            echo -e "  ${YELLOW}Behind by $BEHIND commits${NC}"
        fi
        if [ "$AHEAD" -eq 0 ] && [ "$BEHIND" -eq 0 ]; then
            echo -e "  ${GREEN}Up to date with upstream${NC}"
        fi
    else
        echo "  No upstream tracking branch"
    fi
    
    # Stashes
    echo ""
    STASH_COUNT=$(git stash list | wc -l | tr -d ' ')
    if [ "$STASH_COUNT" -gt 0 ]; then
        echo -e "${YELLOW}Stashes:${NC} $STASH_COUNT"
        git stash list | head -5 | sed 's/^/  /'
    fi
    
    # Broken symlinks
    echo ""
    echo -e "${YELLOW}Broken Symlinks:${NC}"
    BROKEN_LINKS=$(find . -type l ! -exec test -e {} \; -print 2>/dev/null | wc -l | tr -d ' ')
    if [ "$BROKEN_LINKS" -gt 0 ]; then
        echo -e "  ${RED}Found $BROKEN_LINKS broken symlinks${NC}"
        find . -type l ! -exec test -e {} \; -print 2>/dev/null | head -5 | sed 's/^/    /'
    else
        echo -e "  ${GREEN}No broken symlinks${NC}"
    fi
    
    # Large files (>1MB)
    echo ""
    echo -e "${YELLOW}Large Files (>1MB):${NC}"
    LARGE_FILES=$(find . -type f -size +1M \
        -not -path '*/\.*' \
        -not -path '*/node_modules/*' \
        -not -path '*/dist/*' \
        2>/dev/null | wc -l | tr -d ' ')
    
    if [ "$LARGE_FILES" -gt 0 ]; then
        echo "  Found $LARGE_FILES files larger than 1MB"
        find . -type f -size +1M \
            -not -path '*/\.*' \
            -not -path '*/node_modules/*' \
            -not -path '*/dist/*' \
            2>/dev/null | \
            xargs du -h 2>/dev/null | sort -rh | head -5 | sed 's/^/    /'
    else
        echo "  No large files found"
    fi
fi

# Summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Analysis complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
