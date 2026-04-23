/**
 * Performance baselines for manifest building and markdown normalization.
 * These tests establish acceptable time bounds for small (10-page) and
 * medium (50-page) wiki runs without invoking Pandoc.
 */
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { buildManifest } from '../src/manifest';
import { normalizeMarkdown } from '../src/normalizer';

const FIXTURE_LOGO = path.resolve(
  __dirname,
  'fixtures/sample-wiki/.attachments/logo.png'
);

function createSyntheticWiki(dir: string, count: number): void {
  fs.mkdirSync(dir, { recursive: true });
  const attachDir = path.join(dir, '.attachments');
  fs.mkdirSync(attachDir);
  fs.copyFileSync(FIXTURE_LOGO, path.join(attachDir, 'logo.png'));

  const names = Array.from({ length: count }, (_, i) => `Page-${i + 1}`);
  fs.writeFileSync(path.join(dir, '.order'), names.join('\n') + '\n');

  for (let i = 0; i < count; i++) {
    const prev = i > 0 ? names[i - 1] : null;
    const next = i < count - 1 ? names[i + 1] : null;
    const lines = [
      `# ${names[i].replace(/-/g, ' ')}`,
      '',
      `Content for page ${i + 1}.`,
      '',
      '| Column A | Column B |',
      '|----------|----------|',
      '| value 1  | value 2  |',
      '',
      ...(prev ? [`Previous: [[${prev}]]`] : []),
      ...(next ? [`Next: [[${next}]]`]     : []),
      '',
      '![logo](.attachments/logo.png)',
    ];
    fs.writeFileSync(path.join(dir, `${names[i]}.md`), lines.join('\n'));
  }
}

describe('performance baselines', () => {
  let dir10: string;
  let dir50: string;

  beforeAll(() => {
    dir10 = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-perf-10-'));
    dir50 = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-perf-50-'));
    createSyntheticWiki(dir10, 10);
    createSyntheticWiki(dir50, 50);
  });

  afterAll(() => {
    fs.rmSync(dir10, { recursive: true, force: true });
    fs.rmSync(dir50, { recursive: true, force: true });
  });

  // ── 10-page ────────────────────────────────────────────────────────────────

  it('builds 10-page manifest in < 100ms', () => {
    const start = Date.now();
    const manifest = buildManifest(dir10);
    const elapsed = Date.now() - start;
    expect(manifest.pages).toHaveLength(10);
    expect(elapsed).toBeLessThan(100);
  });

  it('normalizes 10 pages in < 500ms', () => {
    const manifest = buildManifest(dir10);
    const start = Date.now();
    for (const page of manifest.pages) {
      const content = fs.readFileSync(page.sourcePath, 'utf-8');
      normalizeMarkdown(content, page.sourcePath, page.outputPath, manifest);
    }
    expect(Date.now() - start).toBeLessThan(500);
  });

  // ── 50-page ────────────────────────────────────────────────────────────────

  it('builds 50-page manifest in < 500ms', () => {
    const start = Date.now();
    const manifest = buildManifest(dir50);
    const elapsed = Date.now() - start;
    expect(manifest.pages).toHaveLength(50);
    expect(elapsed).toBeLessThan(500);
  });

  it('normalizes 50 pages in < 2000ms', () => {
    const manifest = buildManifest(dir50);
    const start = Date.now();
    for (const page of manifest.pages) {
      const content = fs.readFileSync(page.sourcePath, 'utf-8');
      normalizeMarkdown(content, page.sourcePath, page.outputPath, manifest);
    }
    expect(Date.now() - start).toBeLessThan(2000);
  });
});
