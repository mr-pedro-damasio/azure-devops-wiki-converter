import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';
import { buildManifest } from '../src/manifest';
import { generateAllDocx, ConvertResult } from '../src/generator';

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

describe('generateAllDocx (integration)', () => {
  let tmpDir: string;
  let results: ConvertResult[];

  beforeAll(() => {
    if (!hasPandoc) return;
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiki-gen-test-'));
    const manifest = buildManifest(FIXTURE);
    results = generateAllDocx(manifest, {
      referenceDoc: REFERENCE_DOC,
      outputDir: tmpDir,
    });
  });

  afterAll(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  itIfPandoc('generates one DOCX per page', () => {
    expect(results).toHaveLength(5);
  });

  itIfPandoc('all generated DOCX files exist and are non-empty', () => {
    for (const r of results) {
      expect(fs.existsSync(r.outputPath)).toBe(true);
      expect(fs.statSync(r.outputPath).size).toBeGreaterThan(0);
    }
  });

  itIfPandoc('no page errors on clean fixture', () => {
    for (const r of results) {
      expect(r.error).toBeUndefined();
    }
  });

  itIfPandoc('output paths mirror the manifest hierarchy', () => {
    const names = results.map(r => path.basename(r.outputPath));
    expect(names).toContain('Introduction.docx');
    expect(names).toContain('Overview.docx');
    expect(names).toContain('Tables.docx');
    expect(names).toContain('Code-Blocks.docx');
    expect(names).toContain('Mermaid-Example.docx');
  });

  itIfPandoc('Introduction.docx has the embedded logo image', () => {
    const introDocx = path.join(tmpDir, 'Introduction.docx');
    const listing = execSync(`unzip -l "${introDocx}"`, { encoding: 'utf-8' });
    expect(listing).toMatch(/word\/media\//);
  });

  itIfPandoc('Introduction.docx relationships reference the Overview DOCX hyperlink', () => {
    const introDocx = path.join(tmpDir, 'Introduction.docx');
    const rels = execSync(`unzip -p "${introDocx}" word/_rels/document.xml.rels`, {
      encoding: 'utf-8',
    });
    expect(rels).toContain('Overview.docx');
  });

  itIfPandoc('Advanced/Tables.docx is placed in the correct subdirectory', () => {
    const tablesDocx = path.join(tmpDir, 'Advanced', 'Tables.docx');
    expect(fs.existsSync(tablesDocx)).toBe(true);
  });

  itIfPandoc('Mermaid-Example page collects unsupported-construct warnings', () => {
    const mermaidResult = results.find(r => r.page.title === 'Mermaid Example')!;
    const unsupported = mermaidResult.warnings.filter(w => w.type === 'unsupported-construct');
    expect(unsupported.length).toBeGreaterThanOrEqual(3);
  });

  itIfPandoc('Tables page counts rewritten links', () => {
    const tablesResult = results.find(r => r.page.title === 'Tables')!;
    expect(tablesResult.linksRewritten).toBe(2);
  });

  itIfPandoc('Tables page counts resolved images', () => {
    const tablesResult = results.find(r => r.page.title === 'Tables')!;
    expect(tablesResult.imagesResolved).toBe(1);
  });
});
