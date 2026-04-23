import * as path from 'path';
import { sanitizeFilename, buildPageLinkMap, normalizeMarkdown } from '../src/normalizer';
import { buildManifest } from '../src/manifest';

const FIXTURE = path.resolve(__dirname, 'fixtures/sample-wiki');

describe('sanitizeFilename', () => {
  it('returns clean names unchanged', () => {
    expect(sanitizeFilename('Introduction')).toBe('Introduction');
    expect(sanitizeFilename('Getting-Started')).toBe('Getting-Started');
  });

  it('removes Windows-unsafe characters', () => {
    expect(sanitizeFilename('Page<Name>')).toBe('PageName');
    expect(sanitizeFilename('File|Name')).toBe('FileName');
    expect(sanitizeFilename('A:B')).toBe('AB');
  });

  it('converts spaces to dashes', () => {
    expect(sanitizeFilename('My Page Name')).toBe('My-Page-Name');
  });

  it('strips trailing dots', () => {
    expect(sanitizeFilename('page...')).toBe('page');
  });
});

describe('buildPageLinkMap', () => {
  let manifest: ReturnType<typeof buildManifest>;

  beforeAll(() => {
    manifest = buildManifest(FIXTURE);
  });

  it('maps root-level page to its outputPath', () => {
    const map = buildPageLinkMap(manifest);
    expect(map.get('Introduction')).toBe('Introduction.docx');
  });

  it('maps nested page using slash-delimited path', () => {
    const map = buildPageLinkMap(manifest);
    expect(map.get('Getting-Started/Overview')).toBe(
      path.join('Getting-Started', 'Overview.docx')
    );
  });

  it('provides case-insensitive fallback', () => {
    const map = buildPageLinkMap(manifest);
    expect(map.get('introduction')).toBe('Introduction.docx');
  });
});

describe('normalizeMarkdown — wiki link rewriting', () => {
  let manifest: ReturnType<typeof buildManifest>;

  beforeAll(() => {
    manifest = buildManifest(FIXTURE);
  });

  it('rewrites [[WikiLink]] from root page to sibling', () => {
    const content = 'See [[Getting-Started/Overview]] here.';
    const { content: out, warnings } = normalizeMarkdown(
      content,
      path.join(FIXTURE, 'Introduction.md'),
      'Introduction.docx',
      manifest
    );
    expect(out).toContain('[Overview](Getting-Started/Overview.docx)');
    expect(warnings).toHaveLength(0);
  });

  it('rewrites [[WikiLink]] from nested page to root with ../ prefix', () => {
    const content = 'Return to [[Introduction]].';
    const { content: out, warnings } = normalizeMarkdown(
      content,
      path.join(FIXTURE, 'Getting-Started', 'Overview.md'),
      'Getting-Started/Overview.docx',
      manifest
    );
    expect(out).toContain('[Introduction](../Introduction.docx)');
    expect(warnings).toHaveLength(0);
  });

  it('uses custom display text from [[target|display]]', () => {
    const content = '[[Introduction|Home Page]]';
    const { content: out } = normalizeMarkdown(
      content,
      path.join(FIXTURE, 'Getting-Started', 'Overview.md'),
      'Getting-Started/Overview.docx',
      manifest
    );
    expect(out).toContain('[Home Page](../Introduction.docx)');
  });

  it('emits unresolved-link warning and falls back to plain text', () => {
    const content = '[[NonExistentPage]]';
    const { content: out, warnings } = normalizeMarkdown(
      content,
      path.join(FIXTURE, 'Introduction.md'),
      'Introduction.docx',
      manifest
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe('unresolved-link');
    expect(out).toContain('NonExistentPage');
    expect(out).not.toContain('[[');
  });

  it('rewrites standard markdown [text](page.md) links to .docx', () => {
    const content = 'See [Overview](Getting-Started/Overview.md) for setup.';
    const { content: out } = normalizeMarkdown(
      content,
      path.join(FIXTURE, 'Introduction.md'),
      'Introduction.docx',
      manifest
    );
    expect(out).toContain('[Overview](Getting-Started/Overview.docx)');
  });

  it('rewrites standard markdown links without extension to .docx', () => {
    const content = 'Back to [Introduction](Introduction).';
    const { content: out } = normalizeMarkdown(
      content,
      path.join(FIXTURE, 'Getting-Started', 'Overview.md'),
      'Getting-Started/Overview.docx',
      manifest
    );
    expect(out).toContain('[Introduction](../Introduction.docx)');
  });

  it('leaves external http links unchanged', () => {
    const content = '[External](https://example.com)';
    const { content: out } = normalizeMarkdown(
      content,
      path.join(FIXTURE, 'Introduction.md'),
      'Introduction.docx',
      manifest
    );
    expect(out).toBe('[External](https://example.com)');
  });

  it('leaves anchor links unchanged', () => {
    const content = '[Section](#my-section)';
    const { content: out } = normalizeMarkdown(
      content,
      path.join(FIXTURE, 'Introduction.md'),
      'Introduction.docx',
      manifest
    );
    expect(out).toBe('[Section](#my-section)');
  });
});

describe('normalizeMarkdown — image resolution', () => {
  let manifest: ReturnType<typeof buildManifest>;

  beforeAll(() => {
    manifest = buildManifest(FIXTURE);
  });

  it('resolves .attachments paths to absolute local paths', () => {
    const content = '![logo](.attachments/logo.png)';
    const { content: out, warnings } = normalizeMarkdown(
      content,
      path.join(FIXTURE, 'Introduction.md'),
      'Introduction.docx',
      manifest
    );
    const expectedAbs = path.join(FIXTURE, '.attachments', 'logo.png');
    expect(out).toContain(expectedAbs);
    expect(warnings).toHaveLength(0);
  });

  it('emits unresolved-image warning and keeps original path', () => {
    const content = '![missing](.attachments/missing.png)';
    const { content: out, warnings } = normalizeMarkdown(
      content,
      path.join(FIXTURE, 'Introduction.md'),
      'Introduction.docx',
      manifest
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe('unresolved-image');
    expect(out).toContain('.attachments/missing.png');
  });

  it('leaves external http image URLs unchanged', () => {
    const content = '![ext](https://example.com/img.png)';
    const { content: out, warnings } = normalizeMarkdown(
      content,
      path.join(FIXTURE, 'Introduction.md'),
      'Introduction.docx',
      manifest
    );
    expect(out).toBe(content);
    expect(warnings).toHaveLength(0);
  });
});

describe('normalizeMarkdown — unsupported constructs', () => {
  let manifest: ReturnType<typeof buildManifest>;

  beforeAll(() => {
    manifest = buildManifest(FIXTURE);
  });

  it('replaces mermaid fenced block with placeholder', () => {
    const content = '```mermaid\ngraph TD\nA-->B\n```';
    const { content: out, warnings } = normalizeMarkdown(
      content,
      path.join(FIXTURE, 'Introduction.md'),
      'Introduction.docx',
      manifest
    );
    expect(out).not.toContain('mermaid');
    expect(out).toContain('Unsupported content');
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe('unsupported-construct');
  });

  it('replaces Azure DevOps ::: block with placeholder', () => {
    const content = '::: mermaid\ngraph TD\nA-->B\n:::';
    const { content: out, warnings } = normalizeMarkdown(
      content,
      path.join(FIXTURE, 'Introduction.md'),
      'Introduction.docx',
      manifest
    );
    expect(out).not.toContain('graph TD');
    expect(out).toContain('Unsupported content');
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe('unsupported-construct');
  });

  it('replaces iframe elements with placeholder', () => {
    const content = '<iframe src="https://example.com"></iframe>';
    const { content: out, warnings } = normalizeMarkdown(
      content,
      path.join(FIXTURE, 'Introduction.md'),
      'Introduction.docx',
      manifest
    );
    expect(out).not.toContain('iframe');
    expect(out).toContain('Unsupported content');
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe('unsupported-construct');
  });
});
