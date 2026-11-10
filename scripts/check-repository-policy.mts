import { existsSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export const requiredDirectories = [
  'src/app',
  'src/audio',
  'src/control',
  'src/mapping',
  'src/show',
  'src/import',
  'src/visual',
  'src/export',
  'src/config',
  'src/diagnostics',
  'src/ui',
  'src-tauri/capabilities',
  'src-tauri/src/commands',
  'src-tauri/src/platform',
  'src-tauri/src/export',
  'config/assets',
  'config/mappings',
  'config/palettes',
  'config/scenes',
  'config/shows',
  'config/import',
  'config/contrast',
  'config/export',
  'tests/unit',
  'tests/fixtures',
  'tests/visual',
  'tests/import',
  'tests/export',
  'tests/e2e',
  'tests/integration',
  'tests/security',
  'tests/repository',
  'scripts',
  'docs/adr',
] as const;

export const requiredIgnoreRules = [
  '.skillweave/',
  'local-projects/',
  'projects/local/',
  '.spectraform/projects/',
  'project-data/',
  'assets/imported/',
  'assets/user/',
  'assets/project/',
  'assets/audio/',
  'assets/masks/',
  'assets/references/',
  'generated/imports/',
  'generated/diagnostics/',
  'generated/exports/',
  'diagnostics/',
  'exports/',
] as const;

const forbiddenTrackedPrefixes = requiredIgnoreRules
  .filter((rule) => rule !== '.skillweave/')
  .map((rule) => rule.replace(/\/$/u, ''));

const allowedProductAssetPrefixes = ['assets/source/', 'assets/library/'] as const;
const importedMediaExtensions = new Set([
  '.svg',
  '.ai',
  '.eps',
  '.pdf',
  '.wav',
  '.wave',
  '.mp3',
  '.aac',
  '.m4a',
  '.flac',
  '.ogg',
  '.aiff',
  '.aif',
  '.mov',
  '.mp4',
  '.mkv',
  '.webm',
]);

function gitTrackedFiles(root) {
  const result = spawnSync('git', ['-C', root, 'ls-files', '-z'], {
    encoding: 'buffer',
  });
  if (result.status !== 0) {
    const detail = result.stderr?.toString('utf8').trim() || 'git ls-files failed';
    throw new Error(detail);
  }
  return result.stdout
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map((path) => path.replaceAll('\\', '/'));
}

function normalizeRoot(candidate) {
  const root = resolve(candidate);
  if (!existsSync(resolve(root, '.git'))) {
    throw new Error(`not a Git worktree: ${root}`);
  }
  return root;
}

export function checkRepositoryPolicy(candidateRoot) {
  const root = normalizeRoot(candidateRoot);
  const errors = [];

  for (const directory of requiredDirectories) {
    if (!existsSync(resolve(root, directory))) {
      errors.push(`missing required directory: ${directory}`);
    }
  }

  const gitignorePath = resolve(root, '.gitignore');
  if (!existsSync(gitignorePath)) {
    errors.push('missing .gitignore');
  } else {
    const rules = new Set(
      readFileSync(gitignorePath, 'utf8')
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#')),
    );
    for (const rule of requiredIgnoreRules) {
      if (!rules.has(rule)) errors.push(`missing required ignore rule: ${rule}`);
    }
  }

  for (const path of gitTrackedFiles(root)) {
    const forbiddenPrefix = forbiddenTrackedPrefixes.find(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    );
    if (forbiddenPrefix) {
      errors.push(`forbidden tracked repository-data path: ${path}`);
      continue;
    }

    const extension = extname(path).toLowerCase();
    const isMedia = importedMediaExtensions.has(extension);
    const isApprovedProductPath = allowedProductAssetPrefixes.some((prefix) =>
      path.startsWith(prefix),
    );
    if (isMedia && !isApprovedProductPath) {
      errors.push(
        `tracked media must be Spectraform-owned/right-cleared and live under assets/source/ or assets/library/: ${path}`,
      );
    }
  }

  return { root, errors };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
const modulePath = resolve(import.meta.dirname, 'check-repository-policy.mts');
if (invokedPath === modulePath) {
  const defaultRoot = resolve(import.meta.dirname, '..');
  const candidateRoot = process.argv[2] ?? defaultRoot;
  try {
    const result = checkRepositoryPolicy(candidateRoot);
    if (result.errors.length > 0) {
      for (const error of result.errors) console.error(`repository-policy: ${error}`);
      process.exitCode = 1;
    } else {
      console.log(
        `repository-policy: pass (${requiredDirectories.length} directories, ${requiredIgnoreRules.length} ignore rules)`,
      );
    }
  } catch (error) {
    console.error(`repository-policy: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
