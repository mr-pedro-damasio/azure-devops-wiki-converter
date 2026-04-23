import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { PageEntry, WikiManifest } from '../manifest';
import { NormalizerWarning, normalizeMarkdown } from '../normalizer';

export interface GeneratorOptions {
  referenceDoc: string;
  outputDir: string;
  resourcePaths?: string[];
  luaFilter?: string;
}

export interface ConvertResult {
  page: PageEntry;
  outputPath: string;
  warnings: NormalizerWarning[];
  linksRewritten: number;
  imagesResolved: number;
  error?: string;
}

export function generateDocx(
  page: PageEntry,
  normalizedContent: string,
  options: GeneratorOptions
): void {
  const outputPath = path.join(options.outputDir, page.outputPath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const resourcePath = [
    path.dirname(page.sourcePath),
    ...(options.resourcePaths ?? []),
  ].join(path.delimiter);

  const args = [
    '--from', 'markdown+smart',
    '--to', 'docx',
    '--output', outputPath,
    '--reference-doc', options.referenceDoc,
    '--metadata', `title=${page.title}`,
    '--resource-path', resourcePath,
    '--highlight-style', 'pygments',
  ];

  if (options.luaFilter && fs.existsSync(options.luaFilter)) {
    args.push('--lua-filter', options.luaFilter);
  }

  const result = spawnSync('pandoc', args, {
    input: normalizedContent,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    throw new Error(`Pandoc failed for "${page.title}":\n${result.stderr ?? ''}`);
  }
}

export function generateAllDocx(
  manifest: WikiManifest,
  options: GeneratorOptions
): ConvertResult[] {
  return manifest.pages.map(page => {
    const outputPath = path.join(options.outputDir, page.outputPath);
    try {
      const raw = fs.readFileSync(page.sourcePath, 'utf-8');
      const { content: normalized, warnings, linksRewritten, imagesResolved } =
        normalizeMarkdown(raw, page.sourcePath, page.outputPath, manifest);
      generateDocx(page, normalized, options);
      return { page, outputPath, warnings, linksRewritten, imagesResolved };
    } catch (err) {
      return {
        page,
        outputPath,
        warnings: [],
        linksRewritten: 0,
        imagesResolved: 0,
        error: (err as Error).message,
      };
    }
  });
}
