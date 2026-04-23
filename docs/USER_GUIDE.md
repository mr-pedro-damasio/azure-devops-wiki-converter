# User Guide

Step-by-step instructions for converting an Azure DevOps wiki to Word documents.

## Prerequisites

- Node.js 18 or later **and** Pandoc 3.0 or later — for the npm install path.
- Docker — for the Docker image path (no local Node or Pandoc required).

## Step 1 — Obtain a Personal Access Token

1. Sign in to your Azure DevOps organisation at `https://dev.azure.com/{org}`.
2. Click your profile picture → **Personal access tokens**.
3. Click **New Token**.
4. Set **Scopes** to **Code → Read** (wiki content is stored in a Git repository).
5. Copy the generated token — you will not be able to see it again.

## Step 2 — Find the wiki Git URL

The wiki Git URL follows this pattern:

```
https://dev.azure.com/{org}/{project}/_git/{project}.wiki
```

You can also find it in Azure DevOps:

1. Open the wiki for the project.
2. Click the **⋮** menu in the top right → **Clone wiki**.
3. Copy the HTTPS clone URL.

## Step 3 — Install the converter

### Option A: npm (requires Node.js ≥ 18 and Pandoc ≥ 3.0)

```bash
npm install -g azure-devops-wiki-converter
```

Verify the installation:

```bash
converter --version
```

### Option B: Docker (no local Node or Pandoc needed)

```bash
docker pull ghcr.io/mr-pedro-damasio/azure-devops-wiki-converter:latest
```

Use the alias below to invoke the converter as if it were installed locally:

```bash
alias converter='docker run --rm -v "$(pwd):/output" ghcr.io/mr-pedro-damasio/azure-devops-wiki-converter:latest'
```

## Step 4 — Validate access (optional)

Before a full conversion, check that the token and URL work:

```bash
converter download \
  --url  "https://dev.azure.com/myorg/myproject/_git/myproject.wiki" \
  --token "YOUR_PAT"
```

Expected output: a list of all wiki pages. Use `--dry-run` to skip cloning and only validate the URL format:

```bash
converter download \
  --url "https://dev.azure.com/myorg/myproject/_git/myproject.wiki" \
  --dry-run
```

## Step 5 — Run the conversion

```bash
converter convert \
  --url    "https://dev.azure.com/myorg/myproject/_git/myproject.wiki" \
  --token  "YOUR_PAT" \
  --output ./wiki-export
```

Add `--clean` if you want the converter to remove the existing output directory before writing fresh files:

```bash
converter convert \
  --url    "https://dev.azure.com/myorg/myproject/_git/myproject.wiki" \
  --token  "YOUR_PAT" \
  --output ./wiki-export \
  --clean
```

Supplying the token via an environment variable (recommended for CI):

```bash
export AZURE_DEVOPS_PAT="YOUR_PAT"

converter convert \
  --url    "https://dev.azure.com/myorg/myproject/_git/myproject.wiki" \
  --output ./wiki-export
```

Add `--verbose` for detailed progress output on large wikis.

### Custom Word template

Override the default `reference.docx` style template with your own:

```bash
converter convert \
  --url      "https://dev.azure.com/myorg/myproject/_git/myproject.wiki" \
  --output   ./wiki-export \
  --template ./my-styles.docx
```

## Step 6 — Inspect the output

The output directory mirrors the wiki hierarchy:

```
wiki-export/
  index.docx                     # root index linking to all top-level pages
  Introduction.docx
  Getting-Started/
    Overview.docx
  Advanced/
    Tables.docx
  .attachments/
    logo.png
    report.xlsx                  # non-markdown files copied as-is
  conversion-report.json         # machine-readable summary
```

Open any `.docx` in Microsoft Word. Cross-page hyperlinks are relative and work when the folder structure is preserved.

## Step 7 — Review the conversion report

`conversion-report.json` records:

| Field | Description |
|-------|-------------|
| `pagesConverted` | Number of pages successfully converted |
| `pagesSkipped` | Number of pages that failed (see `failures`) |
| `imagesEmbedded` | Images successfully embedded |
| `linksRewritten` | `[[WikiLink]]` references rewritten to `.docx` links |
| `nonMarkdownFilesCopied` | PDFs, spreadsheets, etc. copied to output |
| `warnings` | Unsupported constructs, unresolved links, missing images |
| `failures` | Pages that could not be converted (with error message) |
| `exitCode` | 0 = success, 1 = partial, 2 = critical failure |

## Troubleshooting

### Clone fails with "authentication failed"

- Verify the PAT has **Code → Read** scope.
- Check the PAT has not expired.
- Confirm the wiki URL matches the pattern exactly.

### Broken links in the output

Wiki links that could not be resolved (e.g. a page was renamed or the target is outside the wiki) are replaced with plain text and recorded as `unresolved-link` warnings in `conversion-report.json`.

### Images not showing in Word

- Images referenced from external URLs are not downloaded — they remain as hyperlinks.
- Missing `.attachments` images are recorded as `unresolved-image` warnings. Verify the image exists in the source wiki and that its filename matches the reference exactly (case-sensitive on Linux).

### Mermaid diagrams or custom widgets missing

These constructs are not supported by Pandoc. They are replaced with the placeholder text _[Unsupported content — see conversion report]_ and recorded as `unsupported-construct` warnings.

### Pandoc not found or wrong version

The converter requires Pandoc 3.0 or later. Install it from [pandoc.org/installing](https://pandoc.org/installing.html) or use the Docker image which bundles a compatible version.
