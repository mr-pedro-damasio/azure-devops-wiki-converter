# Architecture

Detailed description of the converter pipeline, module responsibilities, data flow, and edge-case handling.

## Module map

```
src/
  cli.ts               Entry point — parses CLI flags, orchestrates the pipeline
  index.ts             Public API re-exports (for use as a library)
  downloader/
    index.ts           URL validation, PAT masking, shallow git clone
  manifest/
    index.ts           Wiki tree walker — produces the canonical PageManifest
  normalizer/
    index.ts           Markdown transforms: link rewriting, image resolution, unsupported-construct stripping
  generator/
    index.ts           Pandoc invocation wrapper, per-page DOCX generation
  assembler/
    index.ts           Output assembly: attachment copy, index.docx, conversion-report.json
  utils/
    pandoc.ts          Pandoc version check (fail-fast)
    logger.ts          Structured logger with --verbose gate
    retry.ts           withRetrySync — exponential backoff for transient failures
```

## Pipeline stages

### Stage 1 — Authenticate & Clone (`src/downloader`)

`validateWikiUrl` checks the URL matches `https://dev.azure.com/{org}/{project}/_git/{repo}`.

`cloneWiki` injects the PAT as an HTTP password into the clone URL (`https://:{pat}@dev.azure.com/...`), then calls `git clone --depth 1` via `spawnSync`. PAT is masked before any string is logged or surfaced to the caller. Returns `{ destDir, branch, commit }`.

The CLI wraps `cloneWiki` in `withRetrySync` (3 attempts, 500 ms initial backoff) to handle transient network failures.

### Stage 2 & 3 — Discover & Build Manifest (`src/manifest`)

`buildManifest` walks the cloned directory tree depth-first. At each level it:

1. Reads the `.order` file (if present) to produce a name→index map.
2. Scans directory entries, skipping dot-files.
3. Sorts all items (both `.md` files and subdirectories) by their `.order` index, then alphabetically as a tiebreaker. This preserves correct sibling ordering even when pages and folders are interleaved in `.order`.
4. Appends `PageEntry` records for each `.md` file, then recurses into subdirectories.
5. Inventories `.attachments` at each level and classifies files as image (png/jpg/gif/svg/webp/bmp) or non-image.

The resulting `WikiManifest` is immutable after construction and is passed through all subsequent stages.

**Key types**

```typescript
PageEntry       { sourcePath, outputPath, title, hierarchy, order }
AttachmentEntry { sourcePath, outputPath, isImage }
WikiManifest    { root, pages: PageEntry[], attachments: AttachmentEntry[] }
```

### Stage 4 — Normalize Markdown (`src/normalizer`)

`normalizeMarkdown` applies three transforms in order:

1. **Strip unsupported constructs** — replaces `` ```mermaid `` fenced blocks, `:::` Azure DevOps extension blocks, and `<iframe>` elements with a placeholder string. Each removal generates an `unsupported-construct` warning.

2. **Rewrite wiki links** — `[[Target]]` and `[[Target|Display]]` are matched with `/\[\[([^\]]+)\]\]/g`. The target is normalised (spaces→dashes) and looked up in a pre-built map (`hierarchy.join('/')` → `outputPath`). Successful rewrites produce a relative path computed with `path.relative(currentDir, targetOutputPath)`, ensuring correct `../` prefixes for cross-directory links. Failed lookups produce an `unresolved-link` warning and fall back to plain text.

3. **Resolve image paths** — local image references (non-`http://`/`https://`) are resolved to absolute paths with `path.resolve(sourceDir, imgPath)`. Pandoc uses these absolute paths to embed images into the DOCX. Missing files produce an `unresolved-image` warning and leave the original path unchanged.

Returns `{ content, warnings, linksRewritten, imagesResolved }` — the counts feed the conversion report.

### Stage 5 — Generate DOCX (`src/generator`)

`generateDocx` pipes normalised markdown to Pandoc via stdin:

```
pandoc
  --from markdown
  --to docx
  --output <dest>
  --reference-doc <reference.docx>
  --metadata title=<page-title>
  --resource-path <pageDir>:<extra...>
```

`generateAllDocx` iterates the manifest, reads + normalises each page, calls `generateDocx`, and catches per-page errors — a single page failure records an `error` string in `ConvertResult` and continues, giving graceful degradation across the whole wiki.

### Stage 6 — Assemble Output (`src/assembler`)

`copyAttachments` copies every `AttachmentEntry` to `outputDir/<outputPath>`, creating subdirectories as needed. Returns the count of non-image files copied.

`generateIndex` builds a markdown document grouping pages by their top-level hierarchy segment, converts it with Pandoc to `index.docx`, and writes it to the output root.

`assembleOutput` calls `copyAttachments` and `generateIndex`, then aggregates counts and warnings from all `ConvertResult` records into a `ConversionReport`, determines the exit code (0 / 1 / 2), and writes `conversion-report.json`.

**Exit codes**

| Code | Condition |
|------|-----------|
| 0 | All pages converted, no failures |
| 1 | At least one page failed; some output produced |
| 2 | All pages failed; no useful output produced |

## Data flow

```
CLI args / env
      │
      ▼
validateWikiUrl ──── error → exit 2
      │
      ▼
cloneWiki (retry×3)
      │  destDir
      ▼
buildManifest ──── WikiManifest
      │
      ▼
generateAllDocx ─────────────────────────────────────────────────────┐
  │ for each PageEntry                                                │
  │   readFileSync(sourcePath)                                        │
  │   normalizeMarkdown → { content, warnings, linksRewritten, imagesResolved }
  │   generateDocx → Pandoc → outputDir/<outputPath>                 │
  └────────────────────────── ConvertResult[] ──────────────────────┘
      │
      ▼
assembleOutput
  copyAttachments → outputDir/.attachments/
  generateIndex   → outputDir/index.docx
  writeReport     → outputDir/conversion-report.json
      │
      ▼
exit(exitCode)
```

## Edge-case handling

| Scenario | Behaviour |
|----------|-----------|
| Transient clone failure | `withRetrySync` retries up to 3× with 500ms → 1s → 2s backoff |
| PAT in logs / errors | `maskPat` replaces PAT with `***` before any string is surfaced |
| Unresolvable wiki link | Warning recorded; link replaced with plain display text |
| Missing image file | Warning recorded; original src kept (Pandoc alt-text fallback) |
| Mermaid / iframe / ::: block | Replaced with placeholder; warning recorded |
| Single page Pandoc failure | `error` field set in `ConvertResult`; pipeline continues |
| All pages fail | Exit code 2; report still written |
| No `.order` file | Siblings sorted alphabetically |
| Interleaved pages + folders in `.order` | Items sorted by unified order index before processing |
