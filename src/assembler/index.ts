import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { PageEntry, WikiManifest } from '../manifest';
import { ConvertResult } from '../generator';

export const EXIT_CODES = {
  SUCCESS: 0,
  PARTIAL: 1,
  CRITICAL: 2,
} as const;

export interface ReportWarning {
  page: string;
  type: string;
  message: string;
}

export interface ReportFailure {
  page: string;
  error: string;
}

export interface ConversionReport {
  generatedAt: string;
  wikiUrl?: string;
  pagesConverted: number;
  pagesSkipped: number;
  imagesEmbedded: number;
  linksRewritten: number;
  nonMarkdownFilesCopied: number;
  warnings: ReportWarning[];
  failures: ReportFailure[];
  exitCode: number;
}

export interface AssemblerOptions {
  manifest: WikiManifest;
  convertResults: ConvertResult[];
  outputDir: string;
  referenceDoc: string;
  wikiUrl?: string;
}

export interface AssembleResult {
  report: ConversionReport;
  exitCode: number;
}

export function copyAttachments(manifest: WikiManifest, outputDir: string): number {
  let nonImageCopied = 0;
  for (const attachment of manifest.attachments) {
    const dest = path.join(outputDir, attachment.outputPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(attachment.sourcePath, dest);
    if (!attachment.isImage) nonImageCopied++;
  }
  return nonImageCopied;
}

export function buildIndexMarkdown(manifest: WikiManifest): string {
  const lines: string[] = ['# Wiki Index', ''];

  // Group consecutive pages by their top-level hierarchy segment,
  // preserving manifest order so .order file ordering is respected.
  const seen = new Set<string>();
  const groups: Array<{ section: string; pages: PageEntry[] }> = [];

  for (const page of manifest.pages) {
    const section = page.hierarchy[0];
    if (!seen.has(section)) {
      seen.add(section);
      groups.push({ section, pages: [] });
    }
    groups[groups.length - 1].pages.push(page);
  }

  for (const { section, pages } of groups) {
    const isFlatRootPage = pages.length === 1 && pages[0].hierarchy.length === 1;
    if (isFlatRootPage) {
      const p = pages[0];
      lines.push(`- [${p.title}](${p.outputPath.replace(/\\/g, '/')})`);
    } else {
      lines.push(`## ${section.replace(/-/g, ' ')}`);
      lines.push('');
      for (const p of pages) {
        lines.push(`- [${p.title}](${p.outputPath.replace(/\\/g, '/')})`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function generateIndex(
  manifest: WikiManifest,
  outputDir: string,
  referenceDoc: string
): void {
  const indexMd = buildIndexMarkdown(manifest);
  const indexDocx = path.join(outputDir, 'index.docx');

  const result = spawnSync(
    'pandoc',
    ['--from', 'markdown', '--to', 'docx', '--output', indexDocx,
     '--reference-doc', referenceDoc, '--metadata', 'title=Wiki Index'],
    { input: indexMd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  );

  if (result.status !== 0) {
    throw new Error(`Failed to generate index.docx:\n${result.stderr ?? ''}`);
  }
}

export function writeReport(report: ConversionReport, outputDir: string): void {
  fs.writeFileSync(
    path.join(outputDir, 'conversion-report.json'),
    JSON.stringify(report, null, 2),
    'utf-8'
  );
}

export function assembleOutput(options: AssemblerOptions): AssembleResult {
  const { manifest, convertResults, outputDir, referenceDoc, wikiUrl } = options;

  const nonMarkdownFilesCopied = copyAttachments(manifest, outputDir);
  generateIndex(manifest, outputDir, referenceDoc);

  const failures: ReportFailure[] = convertResults
    .filter(r => r.error)
    .map(r => ({ page: r.page.title, error: r.error! }));

  const warnings: ReportWarning[] = convertResults.flatMap(r =>
    r.warnings.map(w => ({ page: r.page.title, type: w.type, message: w.message }))
  );

  const pagesConverted = convertResults.filter(r => !r.error).length;
  const pagesSkipped = failures.length;
  const imagesEmbedded = convertResults.reduce((sum, r) => sum + r.imagesResolved, 0);
  const linksRewritten = convertResults.reduce((sum, r) => sum + r.linksRewritten, 0);

  let exitCode: number;
  if (pagesSkipped === 0) {
    exitCode = EXIT_CODES.SUCCESS;
  } else if (pagesConverted === 0) {
    exitCode = EXIT_CODES.CRITICAL;
  } else {
    exitCode = EXIT_CODES.PARTIAL;
  }

  const report: ConversionReport = {
    generatedAt: new Date().toISOString(),
    wikiUrl,
    pagesConverted,
    pagesSkipped,
    imagesEmbedded,
    linksRewritten,
    nonMarkdownFilesCopied,
    warnings,
    failures,
    exitCode,
  };

  writeReport(report, outputDir);
  return { report, exitCode };
}
