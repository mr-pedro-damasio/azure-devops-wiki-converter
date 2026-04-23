import { validateWikiUrl, maskPat } from '../src/downloader';

describe('validateWikiUrl', () => {
  it('accepts a valid Azure DevOps wiki URL', () => {
    expect(() =>
      validateWikiUrl('https://dev.azure.com/myorg/myproject/_git/myproject.wiki')
    ).not.toThrow();
  });

  it('accepts a URL without .wiki suffix', () => {
    expect(() =>
      validateWikiUrl('https://dev.azure.com/myorg/myproject/_git/myproject')
    ).not.toThrow();
  });

  it('accepts a URL with an Azure DevOps username prefix', () => {
    expect(() =>
      validateWikiUrl('https://myorg@dev.azure.com/myorg/myproject/_git/myproject')
    ).not.toThrow();
  });

  it('rejects a GitHub URL', () => {
    expect(() =>
      validateWikiUrl('https://github.com/org/repo')
    ).toThrow(/Invalid Azure DevOps wiki Git URL/);
  });

  it('rejects a URL missing _git segment', () => {
    expect(() =>
      validateWikiUrl('https://dev.azure.com/myorg/myproject/myproject.wiki')
    ).toThrow(/Invalid Azure DevOps wiki Git URL/);
  });

  it('rejects an http (non-https) URL', () => {
    expect(() =>
      validateWikiUrl('http://dev.azure.com/myorg/myproject/_git/myproject.wiki')
    ).toThrow(/Invalid Azure DevOps wiki Git URL/);
  });
});

describe('maskPat', () => {
  it('replaces all occurrences of PAT with ***', () => {
    const pat = 'supersecrettoken';
    const text = `Cloning https://:${pat}@dev.azure.com and again ${pat}`;
    const masked = maskPat(text, pat);
    expect(masked).not.toContain(pat);
    expect(masked).toBe('Cloning https://:***@dev.azure.com and again ***');
  });

  it('returns original text when PAT is empty string', () => {
    expect(maskPat('some text', '')).toBe('some text');
  });
});
