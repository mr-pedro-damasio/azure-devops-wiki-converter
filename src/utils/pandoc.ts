import { execSync } from 'child_process';

const MINIMUM_VERSION: [number, number, number] = [3, 0, 0];

function parseVersion(output: string): [number, number, number] {
  const match = output.match(/pandoc (\d+)\.(\d+)\.?(\d*)/i);
  if (!match) throw new Error(`Cannot parse Pandoc version from output: ${output.slice(0, 80)}`);
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3] || '0', 10)];
}

function versionGte(a: [number, number, number], b: [number, number, number]): boolean {
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return true;
}

export function checkPandoc(): void {
  let output: string;
  try {
    output = execSync('pandoc --version', { encoding: 'utf-8' });
  } catch {
    throw new Error(
      'Pandoc is not installed or not on PATH.\n' +
        'Install it from https://pandoc.org/installing.html or use the Docker image.\n' +
        `Minimum required version: ${MINIMUM_VERSION.join('.')}`
    );
  }

  const version = parseVersion(output);
  if (!versionGte(version, MINIMUM_VERSION)) {
    throw new Error(
      `Pandoc ${MINIMUM_VERSION.join('.')} or higher is required, but found ${version.join('.')}.`
    );
  }
}

export function pandocVersion(): string {
  const output = execSync('pandoc --version', { encoding: 'utf-8' });
  return parseVersion(output).join('.');
}
