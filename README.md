# azure-devops-wiki-converter

Convert an Azure DevOps wiki into a set of Microsoft Word documents while preserving folder structure, cross-page hyperlinks, and embedded images.

## Quick start

```bash
npm install -g azure-devops-wiki-converter

converter convert \
  --url    "https://dev.azure.com/{org}/{project}/_git/{project}.wiki" \
  --token  "YOUR_PAT" \
  --output ./wiki-export
```

Or with Docker (no local Node or Pandoc required):

```bash
docker run --rm \
  -v "$(pwd)/wiki-export:/output" \
  ghcr.io/mr-pedro-damasio/azure-devops-wiki-converter:latest \
  convert \
  --url    "https://dev.azure.com/{org}/{project}/_git/{project}.wiki" \
  --token  "YOUR_PAT" \
  --output /output
```

## Commands

### `converter convert`

Clone a wiki and convert all pages to DOCX files.

```
converter convert [options]

Required:
  --url <git-url>     Azure DevOps wiki Git URL
  --output <dir>      Output directory

Optional:
  --token <pat>       Personal Access Token (default: AZURE_DEVOPS_PAT env var)
  --template <docx>   Custom reference.docx style template
  --clean             Remove the existing output directory before writing
  --verbose           Enable verbose logging
```

### `converter download`

Validate access and list pages without generating output.

```
converter download [options]

Required:
  --url <git-url>     Azure DevOps wiki Git URL

Optional:
  --token <pat>       Personal Access Token (default: AZURE_DEVOPS_PAT env var)
  --dry-run           Validate URL format only; skip cloning
```

## PAT requirements

The Personal Access Token must have **Code → Read** scope. Supply it via:

- `--token YOUR_PAT` flag (highest precedence)
- `AZURE_DEVOPS_PAT` environment variable

Azure DevOps may show clone URLs in the form `https://{user}@dev.azure.com/{org}/{project}/_git/{repo}`. The converter accepts either that form or the same URL without the optional `{user}@` prefix.

The token is never written to disk or included in log output.

## Output structure

```
wiki-export/
  index.docx                     # root index linking to all pages
  Introduction.docx
  Getting-Started/
    Overview.docx
  .attachments/
    logo.png                     # images (also embedded in DOCX)
    report.xlsx                  # non-markdown files copied as-is
  conversion-report.json         # machine-readable summary
```

## Supported markdown features

| Feature | Behaviour |
|---------|-----------|
| Headings, paragraphs, lists | Full support via Pandoc |
| Tables | Full GFM table support |
| Fenced code blocks | Preserved with syntax highlighting |
| Embedded images (`.attachments/`) | Embedded in DOCX via Pandoc resource paths |
| `[[WikiLink]]` cross-page links | Rewritten to relative `.docx` hyperlinks |
| `[[Target\|Display Text]]` links | Custom display text preserved |
| Non-markdown attachments (PDF, xlsx) | Copied to output alongside DOCX files |

## Known limitations

| Feature | Behaviour |
|---------|-----------|
| Mermaid diagrams | Replaced with placeholder; warning in report |
| Azure DevOps `:::` extension blocks | Replaced with placeholder; warning in report |
| `<iframe>` embeds | Replaced with placeholder; warning in report |
| External image URLs | Not downloaded; remain as hyperlinks |
| Multiple wikis per invocation | Not supported (one `--url` per run) |
| Single combined DOCX | Not supported (one file per page) |

## Custom Word template

Override the default styling by providing your own `reference.docx`:

```bash
converter convert --url <...> --output ./out --template ./corporate-style.docx
```

Create a `reference.docx` by opening any Word document, applying the styles you want (Heading 1, Body Text, Code, etc.), and saving it. Pandoc uses the styles from this file when generating output.

## Cleaning output

By default, `converter convert` writes into the existing output directory and overwrites files with the same path, but it does not delete older files left over from previous runs.

Use `--clean` to remove the output directory before generating fresh output:

```bash
converter convert --url <...> --output ./out --clean
```

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | All pages converted successfully |
| 1 | Partial success — some pages or images were skipped |
| 2 | Critical failure — no output produced |

## Development

### Prerequisites

- Node.js ≥ 18
- Pandoc ≥ 3.0 (installed automatically in the Dev Container)

### Setup

```bash
git clone https://github.com/mr-pedro-damasio/azure-devops-wiki-converter
cd azure-devops-wiki-converter
npm install
npm run build
```

### Commands

```bash
npm run build    # compile TypeScript → dist/
npm test         # run unit + integration tests
npm run lint     # ESLint
npm run format   # Prettier
```

### Dev Container

Open in VS Code and choose **Dev Containers: Reopen in Container**. The container installs Node.js and Pandoc automatically.

## Repository layout

```
.
├── assets/
│   └── reference.docx          # default Word style template
├── docs/
│   ├── PLAN.md                 # implementation checklist
│   ├── ARCHITECTURE.md         # pipeline stages and data flow
│   ├── USER_GUIDE.md           # step-by-step usage instructions
│   └── architecture/
│       └── converter-pipeline.md
├── src/
│   ├── cli.ts                  # CLI entry point
│   ├── index.ts                # public API re-exports
│   ├── downloader/             # URL validation + git clone
│   ├── manifest/               # wiki tree walker
│   ├── normalizer/             # markdown transforms
│   ├── generator/              # Pandoc invocation
│   ├── assembler/              # output assembly + report
│   └── utils/                 # pandoc check, logger, retry
├── tests/
│   ├── fixtures/
│   │   └── sample-wiki/        # representative test fixture
│   ├── e2e.test.ts
│   ├── performance.test.ts
│   └── *.test.ts
├── Dockerfile
├── AGENTS.md
└── CLAUDE.md
```

## Further reading

- [User Guide](docs/USER_GUIDE.md) — detailed step-by-step walkthrough
- [Architecture](docs/ARCHITECTURE.md) — pipeline stages, data flow, edge-case handling
- [Plan](docs/PLAN.md) — implementation milestones and status
