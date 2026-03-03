/**
 * Backup utilities — shared by init/regen and adopt commands.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { appendGitignoreSection } from './gitignore.js';

/**
 * Detect whether a directory (or any of its parents) is inside a git repository.
 * First tries `git rev-parse --git-dir`; if git is unavailable, falls back to
 * walking up the directory tree looking for a `.git` entry.
 */
export function isInsideGitRepo(dirPath: string): boolean {
    try {
        execSync('git rev-parse --git-dir', { cwd: dirPath, stdio: 'ignore' });
        return true;
    } catch {
        // git command failed (not a repo) or git is not installed — walk up looking for .git
        let current = path.resolve(dirPath);
        while (true) {
            if (fs.existsSync(path.join(current, '.git'))) {
                return true;
            }
            const parent = path.dirname(current);
            if (parent === current) {
                break; // reached filesystem root
            }
            current = parent;
        }
        return false;
    }
}

/**
 * Recursively copy a directory.
 */
export async function copyDirectory(src: string, dest: string): Promise<void> {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * Create a timestamped backup of an existing devcontainer directory.
 * Returns the path of the backup directory, or null if there was nothing to back up.
 */
export async function createBackup(outputPath: string, backupDir?: string): Promise<string | null> {
    const devcontainerJsonPath = path.join(outputPath, 'devcontainer.json');
    const dockerComposePath = path.join(outputPath, 'docker-compose.yml');
    const devcontainerSubdir = path.join(outputPath, '.devcontainer');
    const manifestPath = path.join(outputPath, 'superposition.json');

    const hasDevcontainerJson = fs.existsSync(devcontainerJsonPath);
    const hasDockerCompose = fs.existsSync(dockerComposePath);
    const hasDevcontainerSubdir =
        fs.existsSync(devcontainerSubdir) && fs.statSync(devcontainerSubdir).isDirectory();
    const hasManifest = fs.existsSync(manifestPath);

    if (!hasDevcontainerJson && !hasDockerCompose && !hasDevcontainerSubdir && !hasManifest) {
        return null; // Nothing to backup
    }

    const timestamp = new Date()
        .toISOString()
        .replace(/:/g, '-')
        .replace(/\..+/, '')
        .replace('T', '-');

    const resolvedOutputPath = path.resolve(outputPath);
    const outputParentDir = path.dirname(resolvedOutputPath);
    const outputBaseName = path.basename(resolvedOutputPath);
    const backupBaseName = outputBaseName === '.devcontainer' ? '.devcontainer' : outputBaseName;
    const backupPath = backupDir
        ? path.resolve(backupDir)
        : path.join(outputParentDir, `${backupBaseName}.backup-${timestamp}`);

    fs.mkdirSync(backupPath, { recursive: true });

    if (hasDevcontainerJson) {
        fs.copyFileSync(devcontainerJsonPath, path.join(backupPath, 'devcontainer.json'));
    }
    if (hasDockerCompose) {
        fs.copyFileSync(dockerComposePath, path.join(backupPath, 'docker-compose.yml'));
    }
    if (hasDevcontainerSubdir) {
        await copyDirectory(devcontainerSubdir, path.join(backupPath, '.devcontainer'));
    }
    if (hasManifest) {
        fs.copyFileSync(manifestPath, path.join(backupPath, 'superposition.json'));
    }

    const otherFiles = ['.env', '.env.example', '.gitignore', 'features', 'scripts'];
    for (const file of otherFiles) {
        const srcPath = path.join(outputPath, file);
        if (fs.existsSync(srcPath)) {
            const destPath = path.join(backupPath, file);
            if (fs.statSync(srcPath).isDirectory()) {
                await copyDirectory(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    return backupPath;
}

/**
 * Append backup glob patterns to the project-root .gitignore (idempotent).
 */
export function ensureBackupPatternsInGitignore(outputPath: string): void {
    const projectRoot = path.dirname(path.resolve(outputPath));
    const gitignorePath = path.join(projectRoot, '.gitignore');

    const written = appendGitignoreSection(gitignorePath, 'container-superposition backups', [
        '.devcontainer.backup-*/',
        '*.backup-*',
        'superposition.json.backup-*',
    ]);

    if (written) {
        console.log(chalk.dim('   📝 Updated .gitignore with backup patterns'));
    }
}
