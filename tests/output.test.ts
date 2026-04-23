import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { prepareOutputDir } from '../src/utils/output';

describe('prepareOutputDir', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-output-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates the output directory when it does not exist', () => {
    const outputDir = path.join(tmpDir, 'export');

    prepareOutputDir(outputDir, false);

    expect(fs.existsSync(outputDir)).toBe(true);
  });

  it('preserves existing files when clean is false', () => {
    const outputDir = path.join(tmpDir, 'export');
    fs.mkdirSync(outputDir, { recursive: true });
    const staleFile = path.join(outputDir, 'stale.txt');
    fs.writeFileSync(staleFile, 'keep me', 'utf-8');

    prepareOutputDir(outputDir, false);

    expect(fs.existsSync(staleFile)).toBe(true);
  });

  it('removes existing files when clean is true', () => {
    const outputDir = path.join(tmpDir, 'export');
    fs.mkdirSync(path.join(outputDir, 'nested'), { recursive: true });
    const staleFile = path.join(outputDir, 'nested', 'stale.txt');
    fs.writeFileSync(staleFile, 'remove me', 'utf-8');

    prepareOutputDir(outputDir, true);

    expect(fs.existsSync(outputDir)).toBe(true);
    expect(fs.existsSync(staleFile)).toBe(false);
  });
});