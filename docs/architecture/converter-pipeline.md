# Converter Pipeline

High-level description of the six stages that turn an Azure DevOps wiki into a set of Word documents.

## Stage 1 — Authenticate & Clone

Perform a shallow authenticated HTTPS clone of the wiki Git repository using the supplied PAT (via `--token` flag or `AZURE_DEVOPS_PAT` environment variable) into a temporary working directory. Validate branch and commit metadata before proceeding. PAT is masked in all log and report output.

**Input:** Azure DevOps wiki Git URL + PAT  
**Output:** Cloned repo in temp directory

## Stage 2 — Discover & Inventory

Walk the cloned repository to identify all markdown pages, `.order` files, and `.attachments` resources (images and non-markdown files).

**Input:** Cloned repo  
**Output:** Raw file list with paths

## Stage 3 — Build Manifest

Parse the raw file list into a canonical page manifest. Each entry records: source `.md` path, output `.docx` path (sanitized, Word-safe filename), page title, position in hierarchy, sibling order from `.order` files, referenced images, and referenced cross-page links.

**Input:** Raw file list  
**Output:** Canonical page manifest (JSON structure in memory)

## Stage 4 — Normalize Markdown

For each page in the manifest, transform the source markdown into Pandoc-compatible markdown:

- Rewrite `[[PageName]]` wiki links → `[PageName](page-name.docx)` relative links
- Resolve `.attachments` image URLs → absolute local temp paths
- Copy non-markdown attachments (PDFs, spreadsheets, etc.) to the output folder and emit a warning in the conversion report
- Strip or replace unsupported constructs (Mermaid diagrams, iframes, custom widgets) with a placeholder and record a warning

**Input:** Source markdown + manifest  
**Output:** Normalized markdown files in temp directory

## Stage 5 — Generate DOCX

Invoke Pandoc once per normalized markdown page, passing:

- `--from markdown` / `--to docx`
- `--reference-doc` pointing to the bundled default `reference.docx` template (or user-supplied override via `--template`)
- `--resource-path` pointing to the `.attachments` temp directory so Pandoc embeds images directly
- `--metadata title=<page-title>`

Pandoc produces a fully-styled `.docx` with embedded images and rewritten hyperlinks — no post-processing of the DOCX file is required.

**Input:** Normalized markdown + reference.docx template  
**Output:** One `.docx` per page in temp directory

## Stage 6 — Assemble Output

Write the final output directory tree, mirroring the source wiki hierarchy and respecting `.order` file sibling ordering. Copy non-markdown attachments alongside the generated `.docx` files. Optionally generate a root `index.docx` listing top-level pages. Emit a machine-readable `conversion-report.json` summarising pages converted, images embedded, links rewritten, warnings, and failures.

**Input:** Generated `.docx` files + manifest  
**Output:** Final output directory + `conversion-report.json`

## Error handling

| Scenario | Behaviour |
|----------|-----------|
| Transient network/API error | Retry with backoff (up to 3 attempts) |
| Single page fails to convert | Log warning, skip page, continue |
| Single image fails to embed | Log warning, Pandoc uses alt-text fallback |
| Unresolved cross-page link | Log warning, link preserved as plain text |
| Critical failure (no pages, no repo access) | Exit code 2, no partial output written |

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | All pages converted successfully |
| 1 | Partial success — some pages or images skipped |
| 2 | Critical failure — no output produced |
