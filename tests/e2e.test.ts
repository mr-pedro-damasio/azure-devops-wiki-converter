/**
 * End-to-end integration tests against the full representative fixture.
 * Covers: output tree structure, filenames, hyperlink rewriting, image
 * embedding, attachment copy-through, report accuracy, and validation
 * of broken inputs producing warnings without crashing.
 */
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';
import { buildManifest } from '../src/manifest';
import { normalizeMarkdown } from '../src/normalizer';
import { generateAllDocx } from '../src/generator';
import { assembleOutput, ConversionReport, EXIT_CODES } from '../src/assembler';

jest.setTimeout(60_000);

const FIXTURE = path.resolve(__dirname, 'fixtures/sample-wiki');
const REFERENCE_DOC = path.resolve(__dirname, '../assets/reference.docx');

const hasPandoc = (() => {
  try {
    execSync('pandoc --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
})();

const itIfPandoc = hasPandoc ? it : it.skip;

// ── Full pipeline ─────────────────────────────────────────────────────────────

describe('full pipeline — output tree', () => {
  let tmpDir: string;
  let report: ConversionReport;

  beforeAll(() => {
    if (!hasPandoc) return;
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-e2e-'));
    const manifest = buildManifest(FIXTURE);
    const convertResults = generateAllDocx(manifest, { referenceDoc: REFERENCE_DOC, outputDir: tmpDir });
    ({ report } = assembleOutput({ manifest, convertResults, outputDir: tmpDir, referenceDoc: REFERENCE_DOC }));
  });

  afterAll(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const expectedDocx = [
    'Introduction.docx',
    ['Getting-Started', 'Overview.docx'],
    ['Advanced', 'Tables.docx'],
    ['Advanced', 'Code-Blocks.docx'],
    ['Advanced', 'Mermaid-Example.docx'],
    'index.docx',
  ];

  for (const segments of expectedDocx) {
    const rel = Array.isArray(segments) ? path.join(...segments) : segments;
    itIfPandoc(`generates ${rel}`, () => {
      expect(fs.existsSync(path.join(tmpDir, rel))).toBe(true);
    });
  }

  itIfPandoc('generates conversion-report.json', () => {
    expect(fs.existsSync(path.join(tmpDir, 'conversion-report.json'))).toBe(true);
  });

  itIfPandoc('copies all four attachments', () => {
    for (const f of ['logo.png', 'diagram.png', 'document.pdf', 'report.xlsx']) {
      expect(fs.existsSync(path.join(tmpDir, '.attachments', f))).toBe(true);
    }
  });

  itIfPandoc('report: 5 pages converted, 0 skipped', () => {
    expect(report.pagesConverted).toBe(5);
    expect(report.pagesSkipped).toBe(0);
  });

  itIfPandoc('report: 2 images embedded', () => {
    expect(report.imagesEmbedded).toBe(2);
  });

  itIfPandoc('report: 6 links rewritten', () => {
    expect(report.linksRewritten).toBe(6);
  });

  itIfPandoc('report: 2 non-markdown files copied', () => {
    expect(report.nonMarkdownFilesCopied).toBe(2);
  });

  itIfPandoc('report: 3 unsupported-construct warnings from Mermaid-Example', () => {
    const unsupported = report.warnings.filter(w => w.type === 'unsupported-construct');
    expect(unsupported).toHaveLength(3);
  });

  itIfPandoc('report: exit code SUCCESS', () => {
    expect(report.exitCode).toBe(EXIT_CODES.SUCCESS);
  });
});

// ── Cross-page hyperlinks ─────────────────────────────────────────────────────

describe('full pipeline — cross-page hyperlinks', () => {
  let tmpDir: string;

  beforeAll(() => {
    if (!hasPandoc) return;
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-e2e-links-'));
    const manifest = buildManifest(FIXTURE);
    const convertResults = generateAllDocx(manifest, { referenceDoc: REFERENCE_DOC, outputDir: tmpDir });
    assembleOutput({ manifest, convertResults, outputDir: tmpDir, referenceDoc: REFERENCE_DOC });
  });

  afterAll(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  itIfPandoc('Introduction.docx references Getting-Started/Overview.docx', () => {
    const rels = execSync(
      `unzip -p "${path.join(tmpDir, 'Introduction.docx')}" word/_rels/document.xml.rels`,
      { encoding: 'utf-8' }
    );
    expect(rels).toContain('Overview.docx');
  });

  itIfPandoc('Advanced/Tables.docx references ../Introduction.docx', () => {
    const rels = execSync(
      `unzip -p "${path.join(tmpDir, 'Advanced', 'Tables.docx')}" word/_rels/document.xml.rels`,
      { encoding: 'utf-8' }
    );
    expect(rels).toContain('Introduction.docx');
  });

  itIfPandoc('Advanced/Tables.docx references Code-Blocks.docx (sibling)', () => {
    const rels = execSync(
      `unzip -p "${path.join(tmpDir, 'Advanced', 'Tables.docx')}" word/_rels/document.xml.rels`,
      { encoding: 'utf-8' }
    );
    expect(rels).toContain('Code-Blocks.docx');
  });
});

// ── Image embedding ───────────────────────────────────────────────────────────

describe('full pipeline — image embedding', () => {
  let tmpDir: string;

  beforeAll(() => {
    if (!hasPandoc) return;
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-e2e-img-'));
    const manifest = buildManifest(FIXTURE);
    const convertResults = generateAllDocx(manifest, { referenceDoc: REFERENCE_DOC, outputDir: tmpDir });
    assembleOutput({ manifest, convertResults, outputDir: tmpDir, referenceDoc: REFERENCE_DOC });
  });

  afterAll(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  itIfPandoc('Introduction.docx has an embedded media file', () => {
    const listing = execSync(`unzip -l "${path.join(tmpDir, 'Introduction.docx')}"`, { encoding: 'utf-8' });
    expect(listing).toMatch(/word\/media\//);
  });

  itIfPandoc('Advanced/Tables.docx has an embedded media file (diagram)', () => {
    const listing = execSync(`unzip -l "${path.join(tmpDir, 'Advanced', 'Tables.docx')}"`, { encoding: 'utf-8' });
    expect(listing).toMatch(/word\/media\//);
  });
});

// ── Validation: broken inputs produce warnings, not failures ──────────────────

describe('validation — broken inputs produce warnings without crashing', () => {
  it('unresolved wiki link → unresolved-link warning, no throw', () => {
    const manifest = buildManifest(FIXTURE);
    const { content, warnings } = normalizeMarkdown(
      'See [[DoesNotExist]] for info.',
      path.join(FIXTURE, 'Introduction.md'),
      'Introduction.docx',
      manifest
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe('unresolved-link');
    expect(content).toContain('DoesNotExist');
    expect(content).not.toContain('[[');
  });

  it('broken image reference → unresolved-image warning, no throw', () => {
    const manifest = buildManifest(FIXTURE);
    const { content, warnings } = normalizeMarkdown(
      '![broken](.attachments/no-such-file.png)',
      path.join(FIXTURE, 'Introduction.md'),
      'Introduction.docx',
      manifest
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe('unresolved-image');
    expect(content).toContain('.attachments/no-such-file.png');
  });

  it('mermaid diagram → unsupported-construct warning, placeholder in output', () => {
    const manifest = buildManifest(FIXTURE);
    const { content, warnings } = normalizeMarkdown(
      '```mermaid\ngraph TD\nA-->B\n```',
      path.join(FIXTURE, 'Introduction.md'),
      'Introduction.docx',
      manifest
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe('unsupported-construct');
    expect(content).not.toContain('mermaid');
    expect(content).toContain('Unsupported content');
  });

  itIfPandoc('page failure → graceful degradation, other pages still succeed', () => {
    const manifest = buildManifest(FIXTURE);
    // Inject a fake bad page by temporarily pointing to a non-existent source
    const fakePage = {
      ...manifest.pages[0],
      sourcePath: '/nonexistent/path/page.md',
    };
    const results = generateAllDocx(
      { ...manifest, pages: [fakePage, ...manifest.pages.slice(1)] },
      { referenceDoc: REFERENCE_DOC, outputDir: fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-grace-')) }
    );
    const failed = results.filter(r => r.error);
    const succeeded = results.filter(r => !r.error);
    expect(failed).toHaveLength(1);
    expect(succeeded.length).toBeGreaterThan(0);
  });
});
