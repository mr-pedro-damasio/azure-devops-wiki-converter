import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const WIKI_URL_PATTERN = /^https:\/\/(?:[^/@]+@)?dev\.azure\.com\/[^/]+\/[^/]+\/_git\/[^/]+$/;

export function validateWikiUrl(url: string): void {
  if (!WIKI_URL_PATTERN.test(url)) {
    throw new Error(
      `Invalid Azure DevOps wiki Git URL.\n` +
        `Expected format: https://dev.azure.com/{org}/{project}/_git/{repo} (optional username prefix is allowed)\n` +
        `Got: ${url}`
    );
  }
}

export function maskPat(text: string, pat: string): string {
  if (!pat) return text;
  return text.split(pat).join('***');
}

function buildAuthUrl(url: string, pat: string): string {
  const parsed = new URL(url);
  parsed.username = '';
  parsed.password = pat;
  return parsed.toString();
}

export interface CloneResult {
  destDir: string;
  branch: string;
  commit: string;
}

export function cloneWiki(url: string, pat: string | undefined): CloneResult {
  validateWikiUrl(url);

  const cloneUrl = pat ? buildAuthUrl(url, pat) : url;
  const destDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-clone-'));

  const cloneResult = spawnSync('git', ['clone', '--depth', '1', cloneUrl, destDir], {
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  if (cloneResult.status !== 0) {
    const stderr = cloneResult.stderr ?? '';
    throw new Error(`Git clone failed:\n${pat ? maskPat(stderr, pat) : stderr}`);
  }

  const branchResult = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    encoding: 'utf-8',
    cwd: destDir,
    stdio: 'pipe',
  });

  const commitResult = spawnSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf-8',
    cwd: destDir,
    stdio: 'pipe',
  });

  return {
    destDir,
    branch: branchResult.stdout.trim(),
    commit: commitResult.stdout.trim(),
  };
}
