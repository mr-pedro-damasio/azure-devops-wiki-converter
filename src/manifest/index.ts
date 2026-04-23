import * as fs from 'fs';
import * as path from 'path';

export interface PageEntry {
  sourcePath: string;
  outputPath: string;
  title: string;
  hierarchy: string[];
  order: number;
}

export interface AttachmentEntry {
  sourcePath: string;
  outputPath: string;
  isImage: boolean;
}

export interface WikiManifest {
  root: string;
  pages: PageEntry[];
  attachments: AttachmentEntry[];
}

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp']);

function readOrderMap(dir: string): Map<string, number> {
  const orderFile = path.join(dir, '.order');
  if (!fs.existsSync(orderFile)) return new Map();
  return new Map(
    fs
      .readFileSync(orderFile, 'utf-8')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map((name, idx) => [name, idx] as [string, number])
  );
}

function pageTitle(stem: string): string {
  return stem.replace(/-/g, ' ');
}

function gatherAttachments(dir: string, relDir: string): AttachmentEntry[] {
  const attachDir = path.join(dir, '.attachments');
  if (!fs.existsSync(attachDir)) return [];
  const outputBase = relDir ? path.join(relDir, '.attachments') : '.attachments';
  return fs
    .readdirSync(attachDir)
    .filter(f => fs.statSync(path.join(attachDir, f)).isFile())
    .map(f => ({
      sourcePath: path.join(attachDir, f),
      outputPath: path.join(outputBase, f),
      isImage: IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()),
    }));
}

function walkDir(
  dir: string,
  root: string,
  hierarchy: string[],
  pages: PageEntry[],
  attachments: AttachmentEntry[]
): void {
  const orderMap = readOrderMap(dir);
  const relDir = path.relative(root, dir);

  attachments.push(...gatherAttachments(dir, relDir));

  type Item = { kind: 'page' | 'dir'; name: string; stem: string; order: number };
  const items: Item[] = [];

  for (const entry of fs.readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isFile() && entry.endsWith('.md')) {
      const stem = entry.slice(0, -3);
      items.push({ kind: 'page', name: entry, stem, order: orderMap.get(stem) ?? Infinity });
    } else if (stat.isDirectory()) {
      items.push({ kind: 'dir', name: entry, stem: entry, order: orderMap.get(entry) ?? Infinity });
    }
  }

  items.sort((a, b) => a.order - b.order || a.stem.localeCompare(b.stem));

  for (const item of items) {
    if (item.kind === 'page') {
      const outputPath = relDir
        ? path.join(relDir, item.stem + '.docx')
        : item.stem + '.docx';
      pages.push({
        sourcePath: path.join(dir, item.name),
        outputPath,
        title: pageTitle(item.stem),
        hierarchy: [...hierarchy, item.stem],
        order: item.order,
      });
    } else {
      walkDir(path.join(dir, item.name), root, [...hierarchy, item.name], pages, attachments);
    }
  }
}

export function buildManifest(root: string): WikiManifest {
  const pages: PageEntry[] = [];
  const attachments: AttachmentEntry[] = [];
  walkDir(root, root, [], pages, attachments);
  return { root, pages, attachments };
}
