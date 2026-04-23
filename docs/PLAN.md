# PLAN

Living implementation plan for this repository.

## Status key

- [ ] Not started
- [~] In progress
- [x] Completed

---

## Milestone 1: Repository scaffolding

- [x] Initialize repository from template.
- [x] Configure devcontainer (Dockerfile, features, postCreateCommand).
- [x] Set up AGENTS.md, CLAUDE.md, and docs/ structure.

---

## Milestone 2: Project initialization and definition

- [x] Update project name and description in `README.md`.
- [x] Remove template-specific notes from this file.

---

## Milestone 3: MVP specification and toolchain

**Goal:** Define the MVP contract, product scope, and technology stack. Decisions recorded here are binding for all implementation phases.

- [x] Document MVP contract in `README.md`: input (Git URL + PAT), output (one .docx per page), features (embedded images, offline links, folder structure, conversion report), and explicit non-goals.
- [x] Confirm technology stack: Node.js/TypeScript, Git (authenticated HTTPS), Pandoc for DOCX generation, `commander.js`, `chalk`, `ora`. No separate DOCX post-processing library — Pandoc handles full conversion via `reference.docx` template and resource paths.
- [x] Update `.devcontainer/Dockerfile` to install Pandoc at build time.
- [x] Create `docs/architecture/converter-pipeline.md` documenting the six conversion stages: authenticate, discover, inventory, normalize, generate DOCX, assemble output.
- [x] Define unsupported-syntax handling policy: placeholder text with warning in conversion report (graceful degradation, no hard failure).
- [x] Confirm PAT input: `--token` flag AND `AZURE_DEVOPS_PAT` environment variable (env var takes lower precedence than flag). PAT must be masked in all log and report output.
- [x] Confirm DOCX styling: bundle a default `reference.docx` template in `assets/`; allow override via `--template <path>` CLI flag.
- [x] Confirm distribution: npm global install as primary target; Docker image (bundles Node + Pandoc) as secondary for users without a local Node/Pandoc setup.
- [x] Confirm scope: one wiki URL per invocation. Multiple wikis in a single run is a non-goal for MVP.
- [x] Confirm non-markdown attachments policy: copy as-is to output folder, emit a warning in conversion report.

---

## Milestone 4: Implementation phases

**Goal:** Implement the converter in verifiable phases, each building on the last.

### Phase 4.0: Project bootstrap (Week 1)

- [x] Initialise `package.json` with name, version, description, bin entry (`converter`), and scripts (`build`, `lint`, `test`, `start`).
- [x] Configure TypeScript: `tsconfig.json` targeting Node 18+, `src/` as root, `dist/` as output.
- [x] Configure ESLint and Prettier.
- [x] Create folder skeleton: `src/`, `tests/`, `tests/fixtures/`, `assets/`.
- [x] Add Pandoc version check at CLI startup — fail fast with a clear message if Pandoc is not installed or is below the minimum supported version (`src/utils/pandoc.ts`).
- [x] Create the default `assets/reference.docx` template (Pandoc default; replace with styled version before first release).
- [x] Update `.devcontainer/devcontainer.json` to install Pandoc 3.6.4 via the `ghcr.io/rocker-org/devcontainer-features/pandoc` feature.
- [x] Create minimal fixture wiki in `tests/fixtures/sample-wiki/`: two nested pages, one `.order` file, one `.attachments` image, and one `[[WikiLink]]` cross-page reference. This fixture supports all unit tests in Phases 4.1–4.3.

### Phase 4.1: Source acquisition & inventory (Weeks 1–2)

- [x] Implement repo downloader module: accept Azure DevOps wiki Git URL + PAT, validate the URL format (`https://dev.azure.com/{org}/{project}/_git/{project}.wiki`), perform a shallow authenticated HTTPS clone into a temp directory, and validate branch/commit metadata.
- [x] Accept Azure DevOps Git URLs that include an optional username prefix (`https://user@dev.azure.com/...`) during downloader validation.
- [x] Support PAT input from `--token` flag and `AZURE_DEVOPS_PAT` environment variable; mask PAT in all logging and report output.
- [ ] Add dry-run mode: validate access and list detected markdown pages without generating any output.
- [x] Build wiki manifest parser: scan the cloned repo, identify markdown pages, read `.order` files for sibling ordering, inventory `.attachments` resources (images and non-markdown files), and produce a canonical page manifest with source paths, output `.docx` paths, titles, hierarchy, and link/image references.
- [x] Add unit tests for manifest building, folder hierarchy resolution, and `.order` file parsing against the minimal fixture from Phase 4.0.

### Phase 4.2: Markdown normalization & link rewriting (Weeks 2–3)

- [x] Implement markdown normalizer:
  - Rewrite `[[PageName]]` wiki links → `[PageName](page-name.docx)` relative links.
  - Resolve `.attachments` image URLs → absolute local temp paths.
  - Sanitize filenames into Word-safe output names (build reverse-lookup map for correct cross-page link rewriting).
  - Strip or replace unsupported constructs (Mermaid diagrams, iframes, custom widgets) with a placeholder string; record each as a warning.
  - Identify non-markdown attachments; record for copy-through in Phase 4.4.
- [x] Add unit tests for link rewriting, filename sanitization, image URL resolution, and unsupported-construct handling against the minimal fixture.

### Phase 4.3: DOCX generation (Weeks 3–4)

- [x] Implement Pandoc invocation wrapper: for each normalized markdown page, call Pandoc with `--from markdown --to docx`, `--reference-doc` (default `assets/reference.docx` or user-supplied `--template`), `--resource-path` pointing to the `.attachments` temp directory, and `--metadata title=<page-title>`.
- [x] Ensure deterministic output naming and sibling ordering based on the manifest from Phase 4.1.
- [x] Add integration tests that convert the minimal fixture and verify: DOCX files are generated, images are embedded, and cross-page hyperlinks point to the correct `.docx` targets.

### Phase 4.4: Output assembly & error handling (Week 4)

- [x] Write final output directory tree mirroring the source wiki hierarchy and `.order` file ordering.
- [x] Copy non-markdown attachments (PDFs, spreadsheets, etc.) from the source wiki into the corresponding output folder alongside the generated `.docx` files.
- [x] Generate root `index.docx` listing and linking to top-level pages in wiki order.
- [x] Emit `conversion-report.json` summarising: pages converted, images embedded, links rewritten, non-markdown files copied, warnings (unsupported constructs, broken links, failed images), and failures.
- [x] Implement retry logic for transient network/clone errors (up to 3 attempts with backoff); graceful degradation when a single page or image fails (log warning, skip, continue).
- [x] Add structured logging and `--verbose` flag for diagnosing large-wiki runs.
- [x] Define and document exit codes: 0 (full success), 1 (partial — some pages/images skipped), 2 (critical — no output produced).

### Phase 4.5: Full test fixtures & integration tests (Week 5)

- [x] Expand the minimal fixture into a full representative fixture in `tests/fixtures/sample-wiki/`: nested folders, multiple `.order` files, multiple `.attachments` images, relative markdown links, `[[WikiLink]]` cross-page links, tables, fenced code blocks, special characters in filenames, a non-markdown attachment (PDF), and at least one unsupported construct (Mermaid diagram).
- [x] Add comprehensive unit tests for each module: manifest parsing, filename sanitization, link rewriting, image resolution, unsupported-construct degradation.
- [x] Add end-to-end integration tests against the full fixture: assert output tree structure, generated filenames, rewritten hyperlink targets, image embedding, non-markdown attachment copy-through, and conversion report accuracy.
- [x] Add validation tests that intentionally break an image reference and an unresolved link to confirm warning generation without full-process failure.
- [x] Measure export time and memory usage on small (10-page) and medium (50-page) fixture runs to establish acceptable baselines.

### Phase 4.6: CLI implementation & documentation (Weeks 5–6)

- [x] Implement CLI entry point using `commander.js`:
  - `converter download --url <git-url> [--token <pat>] [--dry-run]` — validate access and list pages.
  - `converter convert --url <git-url> [--token <pat>] --output <dir> [--template <docx>] [--clean] [--verbose]` — full conversion.
  - `AZURE_DEVOPS_PAT` environment variable accepted in place of `--token` in both commands.
- [x] Add user-friendly terminal output using `chalk` for colours and `ora` for spinners.
- [x] Configure `package.json` for npm publish: `bin`, `main`, `files`, `publishConfig`.
- [x] Add `Dockerfile` at repo root that builds a Docker image bundling Node.js and Pandoc, with the CLI as the entrypoint — for users who prefer not to install Node/Pandoc locally.
- [x] Update `README.md` with CLI usage examples, PAT requirements, `--template` usage, supported markdown features, known limitations, and troubleshooting for broken links and failed downloads.
- [x] Create `docs/USER_GUIDE.md` with step-by-step instructions: obtain an Azure DevOps PAT, construct the wiki Git URL, run the converter, validate output in Microsoft Word.
- [x] Create `docs/ARCHITECTURE.md` with detailed pipeline stages, data flow, module responsibilities, and edge-case handling (expands on `docs/architecture/converter-pipeline.md`).

### Phase 4.7: Manual validation & polish (Weeks 6–7)

- [ ] Perform manual QA on a real or approved test Azure DevOps wiki: export a representative sample (mix of sizes, structures, link types) and open each `.docx` in Microsoft Word.
- [ ] Spot-check: text formatting, image rendering (no broken placeholders), hyperlinks functional, no encoding issues, professional appearance.
- [ ] Verify Docker image builds cleanly and produces identical output to the npm install path.
- [ ] Document known limitations and formatting gaps in release notes.
- [ ] Address any critical defects found during manual QA.
- [ ] Generate a final conversion report and store as reference output.

  **Note:** Phase 4.7 requires access to a real Azure DevOps wiki and Microsoft Word for manual QA. The Dockerfile and CLI are code-complete; Docker build validation and Word spot-check require a human in the loop.

---

## Non-goals for MVP

- Desktop or web UI — CLI only.
- Editing or publishing content back to Azure DevOps.
- Single combined DOCX export — one file per page is the output shape.
- Multiple wikis in a single invocation.
- Pixel-perfect rendering of every Azure DevOps wiki extension (Mermaid, custom widgets, iframes) — graceful degradation with warnings is acceptable.
- Separate DOCX post-processing library — Pandoc handles full conversion.

---

## Notes

- Keep this file updated whenever scope or priorities change.
- Update task status as work starts and completes to maintain a single source of truth.
