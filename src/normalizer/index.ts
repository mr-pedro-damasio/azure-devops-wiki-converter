import * as fs from 'fs';
import * as path from 'path';
import { WikiManifest } from '../manifest';

export interface NormalizerWarning {
  type: 'unsupported-construct' | 'unresolved-link' | 'unresolved-image';
  message: string;
}

export interface NormalizeResult {
  content: string;
  warnings: NormalizerWarning[];
  linksRewritten: number;
  imagesResolved: number;
}

const UNSUPPORTED_PLACEHOLDER = '_[Unsupported content — see conversion report]_';

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/\.+$/, '')
    .trim();
}

// Maps hierarchy path (e.g. "Getting-Started/Overview") → outputPath
export function buildPageLinkMap(manifest: WikiManifest): Map<string, string> {
  const map = new Map<string, string>();
  for (const page of manifest.pages) {
    const key = page.hierarchy.join('/');
    map.set(key, page.outputPath);
    if (!map.has(key.toLowerCase())) {
      map.set(key.toLowerCase(), page.outputPath);
    }
  }
  return map;
}

function stripUnsupportedConstructs(
  content: string,
  warnings: NormalizerWarning[]
): string {
  let result = content;

  result = result.replace(/```mermaid[\s\S]*?```/g, () => {
    warnings.push({ type: 'unsupported-construct', message: 'Mermaid diagram removed' });
    return UNSUPPORTED_PLACEHOLDER;
  });

  result = result.replace(/^:::[^\n]*\n[\s\S]*?^:::/gm, () => {
    warnings.push({ type: 'unsupported-construct', message: 'Unsupported ::: block removed' });
    return UNSUPPORTED_PLACEHOLDER;
  });

  result = result.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, () => {
    warnings.push({ type: 'unsupported-construct', message: 'iframe removed' });
    return UNSUPPORTED_PLACEHOLDER;
  });

  return result;
}

function resolvePageTarget(
  rawTarget: string,
  currentOutputPath: string,
  linkMap: Map<string, string>
): string | undefined {
  const normalized = rawTarget.replace(/\s+/g, '-');
  const targetOutputPath =
    linkMap.get(normalized) ?? linkMap.get(normalized.toLowerCase());
  if (!targetOutputPath) return undefined;
  const currentDir = path.dirname(currentOutputPath);
  return path.relative(currentDir, targetOutputPath).replace(/\\/g, '/');
}

function rewriteWikiLinks(
  content: string,
  currentOutputPath: string,
  linkMap: Map<string, string>,
  warnings: NormalizerWarning[]
): { content: string; count: number } {
  let count = 0;

  // Rewrite [[WikiLink]] and [[WikiLink|Display Text]] style links
  let result = content.replace(/\[\[([^\]]+)\]\]/g, (_, inner: string) => {
    const parts = inner.split('|').map((s: string) => s.trim());
    const rawTarget = parts[0];
    const displayText = parts[1];

    const relLink = resolvePageTarget(rawTarget, currentOutputPath, linkMap);

    if (!relLink) {
      warnings.push({
        type: 'unresolved-link',
        message: `Unresolved wiki link: [[${rawTarget}]]`,
      });
      return displayText ?? rawTarget;
    }

    count++;
    const display = displayText ?? rawTarget.split('/').pop() ?? rawTarget;
    return `[${display}](${relLink})`;
  });

  // Rewrite standard markdown links to .md files or bare page paths (no extension)
  // so they point to the corresponding .docx output.
  result = result.replace(/(?<!!)\[([^\]]+)\]\(([^)]+)\)/g, (match, display: string, href: string) => {
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#')) {
      return match;
    }

    // Strip leading ./ and any .md extension to get the page stem
    const stripped = href.replace(/^\.\//, '').replace(/\.md$/, '');
    const relLink = resolvePageTarget(stripped, currentOutputPath, linkMap);

    if (!relLink) return match; // leave unresolved links as-is; images are handled separately
    count++;
    return `[${display}](${relLink})`;
  });

  return { content: result, count };
}

function resolveImagePaths(
  content: string,
  sourcePath: string,
  warnings: NormalizerWarning[]
): { content: string; count: number } {
  let count = 0;
  const sourceDir = path.dirname(sourcePath);
  const result = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt: string, imgPath: string) => {
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) return match;
    const absPath = path.resolve(sourceDir, imgPath);
    if (!fs.existsSync(absPath)) {
      warnings.push({ type: 'unresolved-image', message: `Image not found: ${imgPath}` });
      return match;
    }
    count++;
    return `![${alt}](${absPath})`;
  });
  return { content: result, count };
}

export function normalizeMarkdown(
  content: string,
  sourcePath: string,
  currentOutputPath: string,
  manifest: WikiManifest
): NormalizeResult {
  const warnings: NormalizerWarning[] = [];
  const linkMap = buildPageLinkMap(manifest);

  let result = content;
  result = stripUnsupportedConstructs(result, warnings);

  const linkResult = rewriteWikiLinks(result, currentOutputPath, linkMap, warnings);
  result = linkResult.content;

  const imgResult = resolveImagePaths(result, sourcePath, warnings);
  result = imgResult.content;

  return {
    content: result,
    warnings,
    linksRewritten: linkResult.count,
    imagesResolved: imgResult.count,
  };
}
