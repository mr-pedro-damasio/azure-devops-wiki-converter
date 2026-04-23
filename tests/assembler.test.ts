import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';
import { buildManifest } from '../src/manifest';
import { generateAllDocx } from '../src/generator';
import {
  EXIT_CODES,
  copyAttachments,
  buildIndexMarkdown,
  writeReport,
  assembleOutput,
  ConversionReport,
} from '../src/assembler';

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

// ── copyAttachments ──────────────────────────────────────────────────────────

describe('copyAttachments', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-attach-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('copies all attachments to the output directory', () => {
    const manifest = buildManifest(FIXTURE);
    copyAttachments(manifest, tmpDir);
    expect(fs.existsSync(path.join(tmpDir, '.attachments', 'logo.png'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.attachments', 'document.pdf'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.attachments', 'diagram.png'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.attachments', 'report.xlsx'))).toBe(true);
  });

  it('returns the count of non-image files copied', () => {
    const manifest = buildManifest(FIXTURE);
    const count = copyAttachments(manifest, tmpDir);
    expect(count).toBe(2); // document.pdf + report.xlsx
  });
});

// ── buildIndexMarkdown ───────────────────────────────────────────────────────

describe('buildIndexMarkdown', () => {
  it('starts with a # Wiki Index heading', () => {
    const manifest = buildManifest(FIXTURE);
    const md = buildIndexMarkdown(manifest);
    expect(md).toMatch(/^# Wiki Index/);
  });

  it('includes a link to the root-level Introduction page', () => {
    const manifest = buildManifest(FIXTURE);
    const md = buildIndexMarkdown(manifest);
    expect(md).toContain('[Introduction](Introduction.docx)');
  });

  it('includes a link to the nested Overview page', () => {
    const manifest = buildManifest(FIXTURE);
    const md = buildIndexMarkdown(manifest);
    expect(md).toContain('[Overview](Getting-Started/Overview.docx)');
  });

  it('includes links to Advanced pages', () => {
    const manifest = buildManifest(FIXTURE);
    const md = buildIndexMarkdown(manifest);
    expect(md).toContain('[Tables](Advanced/Tables.docx)');
    expect(md).toContain('[Code Blocks](Advanced/Code-Blocks.docx)');
    expect(md).toContain('[Mermaid Example](Advanced/Mermaid-Example.docx)');
  });

  it('adds section headings for folder groups', () => {
    const manifest = buildManifest(FIXTURE);
    const md = buildIndexMarkdown(manifest);
    expect(md).toContain('## Getting Started');
    expect(md).toContain('## Advanced');
  });
});

// ── writeReport ──────────────────────────────────────────────────────────────

describe('writeReport', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-report-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes a parseable conversion-report.json', () => {
    const report: ConversionReport = {
      generatedAt: '2026-04-23T00:00:00.000Z',
      pagesConverted: 5,
      pagesSkipped: 0,
      imagesEmbedded: 2,
      linksRewritten: 6,
      nonMarkdownFilesCopied: 2,
      warnings: [],
      failures: [],
      exitCode: EXIT_CODES.SUCCESS,
    };
    writeReport(report, tmpDir);
    const parsed = JSON.parse(
      fs.readFileSync(path.join(tmpDir, 'conversion-report.json'), 'utf-8')
    ) as ConversionReport;
    expect(parsed.pagesConverted).toBe(5);
    expect(parsed.exitCode).toBe(0);
  });
});

// ── exit code logic ──────────────────────────────────────────────────────────

describe('EXIT_CODES', () => {
  it('defines SUCCESS as 0', () => expect(EXIT_CODES.SUCCESS).toBe(0));
  it('defines PARTIAL as 1',  () => expect(EXIT_CODES.PARTIAL).toBe(1));
  it('defines CRITICAL as 2', () => expect(EXIT_CODES.CRITICAL).toBe(2));
});

// ── assembleOutput (integration) ─────────────────────────────────────────────

describe('assembleOutput (integration)', () => {
  let tmpDir: string;
  let report: ConversionReport;

  beforeAll(() => {
    if (!hasPandoc) return;
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-assemble-test-'));
    const manifest = buildManifest(FIXTURE);
    const convertResults = generateAllDocx(manifest, {
      referenceDoc: REFERENCE_DOC,
      outputDir: tmpDir,
    });
    ({ report } = assembleOutput({
      manifest,
      convertResults,
      outputDir: tmpDir,
      referenceDoc: REFERENCE_DOC,
    }));
  });

  afterAll(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  itIfPandoc('generates index.docx at the output root', () => {
    expect(fs.existsSync(path.join(tmpDir, 'index.docx'))).toBe(true);
  });

  itIfPandoc('writes conversion-report.json', () => {
    expect(fs.existsSync(path.join(tmpDir, 'conversion-report.json'))).toBe(true);
  });

  itIfPandoc('report has correct page counts', () => {
    expect(report.pagesConverted).toBe(5);
    expect(report.pagesSkipped).toBe(0);
  });

  itIfPandoc('report tracks images embedded', () => {
    expect(report.imagesEmbedded).toBe(2);
  });

  itIfPandoc('report tracks links rewritten', () => {
    expect(report.linksRewritten).toBe(6);
  });

  itIfPandoc('report tracks non-markdown files copied', () => {
    expect(report.nonMarkdownFilesCopied).toBe(2);
  });

  itIfPandoc('exit code is SUCCESS when no pages fail', () => {
    expect(report.exitCode).toBe(EXIT_CODES.SUCCESS);
  });

  itIfPandoc('copies all attachments to the output directory', () => {
    expect(fs.existsSync(path.join(tmpDir, '.attachments', 'logo.png'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.attachments', 'document.pdf'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.attachments', 'diagram.png'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.attachments', 'report.xlsx'))).toBe(true);
  });

  itIfPandoc('report includes unsupported-construct warnings from Mermaid-Example', () => {
    const unsupported = report.warnings.filter(w => w.type === 'unsupported-construct');
    expect(unsupported.length).toBeGreaterThanOrEqual(3);
  });
});
