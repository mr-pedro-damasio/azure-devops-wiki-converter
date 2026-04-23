import * as path from 'path';
import { buildManifest } from '../src/manifest';

const FIXTURE = path.resolve(__dirname, 'fixtures/sample-wiki');

describe('buildManifest', () => {
  it('discovers all markdown pages', () => {
    const manifest = buildManifest(FIXTURE);
    expect(manifest.pages).toHaveLength(5);
  });

  it('respects .order file ordering at root level', () => {
    const manifest = buildManifest(FIXTURE);
    expect(manifest.pages[0].title).toBe('Introduction');
  });

  it('orders Getting-Started pages before Advanced pages', () => {
    const manifest = buildManifest(FIXTURE);
    const titles = manifest.pages.map(p => p.title);
    expect(titles.indexOf('Overview')).toBeLessThan(titles.indexOf('Tables'));
  });

  it('respects .order within Advanced/ subfolder', () => {
    const manifest = buildManifest(FIXTURE);
    const adv = manifest.pages.filter(p => p.hierarchy[0] === 'Advanced');
    expect(adv[0].title).toBe('Tables');
    expect(adv[1].title).toBe('Code Blocks');
    expect(adv[2].title).toBe('Mermaid Example');
  });

  it('assigns correct outputPath for root page', () => {
    const manifest = buildManifest(FIXTURE);
    expect(manifest.pages[0].outputPath).toBe('Introduction.docx');
  });

  it('assigns correct outputPath for nested page', () => {
    const manifest = buildManifest(FIXTURE);
    const overview = manifest.pages.find(p => p.title === 'Overview')!;
    expect(overview.outputPath).toBe(path.join('Getting-Started', 'Overview.docx'));
  });

  it('assigns correct outputPath for doubly-nested page', () => {
    const manifest = buildManifest(FIXTURE);
    const tables = manifest.pages.find(p => p.title === 'Tables')!;
    expect(tables.outputPath).toBe(path.join('Advanced', 'Tables.docx'));
  });

  it('assigns correct hierarchy for root page', () => {
    const manifest = buildManifest(FIXTURE);
    expect(manifest.pages[0].hierarchy).toEqual(['Introduction']);
  });

  it('assigns correct hierarchy for nested page', () => {
    const manifest = buildManifest(FIXTURE);
    const overview = manifest.pages.find(p => p.title === 'Overview')!;
    expect(overview.hierarchy).toEqual(['Getting-Started', 'Overview']);
  });

  it('assigns correct hierarchy for Advanced pages', () => {
    const manifest = buildManifest(FIXTURE);
    const tables = manifest.pages.find(p => p.title === 'Tables')!;
    expect(tables.hierarchy).toEqual(['Advanced', 'Tables']);
  });

  it('sets root to the provided directory', () => {
    const manifest = buildManifest(FIXTURE);
    expect(manifest.root).toBe(FIXTURE);
  });

  it('inventories all attachments', () => {
    const manifest = buildManifest(FIXTURE);
    expect(manifest.attachments).toHaveLength(4);
  });

  it('classifies logo.png as an image', () => {
    const manifest = buildManifest(FIXTURE);
    const logo = manifest.attachments.find(a => a.sourcePath.endsWith('logo.png'))!;
    expect(logo).toBeDefined();
    expect(logo.isImage).toBe(true);
    expect(logo.outputPath).toBe(path.join('.attachments', 'logo.png'));
  });

  it('classifies document.pdf as a non-image', () => {
    const manifest = buildManifest(FIXTURE);
    const pdf = manifest.attachments.find(a => a.sourcePath.endsWith('document.pdf'))!;
    expect(pdf).toBeDefined();
    expect(pdf.isImage).toBe(false);
  });

  it('classifies diagram.png as an image', () => {
    const manifest = buildManifest(FIXTURE);
    const diag = manifest.attachments.find(a => a.sourcePath.endsWith('diagram.png'))!;
    expect(diag).toBeDefined();
    expect(diag.isImage).toBe(true);
  });

  it('classifies report.xlsx as a non-image', () => {
    const manifest = buildManifest(FIXTURE);
    const xlsx = manifest.attachments.find(a => a.sourcePath.endsWith('report.xlsx'))!;
    expect(xlsx).toBeDefined();
    expect(xlsx.isImage).toBe(false);
  });

  it('records correct sourcePath for pages', () => {
    const manifest = buildManifest(FIXTURE);
    expect(manifest.pages[0].sourcePath).toBe(path.join(FIXTURE, 'Introduction.md'));
    const overview = manifest.pages.find(p => p.title === 'Overview')!;
    expect(overview.sourcePath).toBe(
      path.join(FIXTURE, 'Getting-Started', 'Overview.md')
    );
  });
});
