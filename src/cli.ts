#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import * as fs from 'fs';

import { checkPandoc } from './utils/pandoc';
import { validateWikiUrl, cloneWiki, maskPat } from './downloader';
import { buildManifest } from './manifest';
import { generateAllDocx } from './generator';
import { assembleOutput, EXIT_CODES } from './assembler';
import { setVerbose, logger } from './utils/logger';
import { withRetrySync } from './utils/retry';
import { prepareOutputDir } from './utils/output';

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const DEFAULT_REFERENCE_DOC = path.join(ASSETS_DIR, 'reference.docx');
const DEFAULT_LUA_FILTER = path.join(ASSETS_DIR, 'markdown.lua');

const program = new Command();

program
  .name('converter')
  .description('Convert an Azure DevOps wiki into Microsoft Word documents')
  .version('0.1.0');

// ── download ──────────────────────────────────────────────────────────────────

program
  .command('download')
  .description('Validate wiki access and list pages (no output written)')
  .requiredOption('--url <git-url>', 'Azure DevOps wiki Git URL')
  .option('--token <pat>', 'Personal Access Token (overrides AZURE_DEVOPS_PAT env var)')
  .option('--dry-run', 'Validate URL only — skip cloning', false)
  .action((opts: { url: string; token?: string; dryRun: boolean }) => {
    const pat = opts.token ?? process.env['AZURE_DEVOPS_PAT'];

    try {
      validateWikiUrl(opts.url);
    } catch (err) {
      console.error(chalk.red('Error:'), (err as Error).message);
      process.exit(EXIT_CODES.CRITICAL);
    }

    if (opts.dryRun) {
      console.log(chalk.green('✓ URL is valid:'), opts.url);
      return;
    }

    const spinner = ora('Cloning wiki…').start();
    let cloneDir: string | undefined;

    try {
      const result = withRetrySync(() => cloneWiki(opts.url, pat), 3, 500);
      cloneDir = result.destDir;
      spinner.succeed(
        `Cloned — branch: ${result.branch}, commit: ${result.commit.slice(0, 7)}`
      );

      const manifest = buildManifest(cloneDir);
      console.log(chalk.bold(`\nFound ${manifest.pages.length} page(s):\n`));
      for (const page of manifest.pages) {
        const indent = '  '.repeat(page.hierarchy.length - 1);
        console.log(`${indent}${chalk.cyan('▸')} ${page.title}`);
      }
    } catch (err) {
      const msg = pat ? maskPat((err as Error).message, pat) : (err as Error).message;
      spinner.fail(`Clone failed: ${msg}`);
      process.exit(EXIT_CODES.CRITICAL);
    } finally {
      if (cloneDir && fs.existsSync(cloneDir)) {
        fs.rmSync(cloneDir, { recursive: true, force: true });
      }
    }
  });

// ── convert ───────────────────────────────────────────────────────────────────

program
  .command('convert')
  .description('Clone a wiki and convert all pages to DOCX files')
  .requiredOption('--url <git-url>', 'Azure DevOps wiki Git URL')
  .option('--token <pat>', 'Personal Access Token (overrides AZURE_DEVOPS_PAT env var)')
  .requiredOption('--output <dir>', 'Output directory')
  .option('--template <docx>', 'Custom reference.docx template path')
  .option('--clean', 'Remove the existing output directory before writing', false)
  .option('--verbose', 'Enable verbose logging', false)
  .action((opts: {
    url: string; token?: string; output: string;
    template?: string; clean: boolean; verbose: boolean;
  }) => {
    if (opts.verbose) setVerbose(true);

    const pat = opts.token ?? process.env['AZURE_DEVOPS_PAT'];
    const referenceDoc = opts.template
      ? path.resolve(opts.template)
      : DEFAULT_REFERENCE_DOC;
    const outputDir = path.resolve(opts.output);
    let cloneDir: string | undefined;
    let exitCode: number = EXIT_CODES.SUCCESS;

    try {
      // 1. Pandoc version check
      const pandocSpinner = ora('Checking Pandoc…').start();
      try {
        checkPandoc();
        pandocSpinner.succeed('Pandoc OK');
      } catch (err) {
        pandocSpinner.fail((err as Error).message);
        process.exit(EXIT_CODES.CRITICAL);
      }

      // 2. Clone
      const cloneSpinner = ora('Cloning wiki…').start();
      try {
        const result = withRetrySync(() => cloneWiki(opts.url, pat), 3, 500);
        cloneDir = result.destDir;
        cloneSpinner.succeed(
          `Cloned — branch: ${result.branch}, commit: ${result.commit.slice(0, 7)}`
        );
      } catch (err) {
        const msg = pat ? maskPat((err as Error).message, pat) : (err as Error).message;
        cloneSpinner.fail(`Clone failed: ${msg}`);
        process.exit(EXIT_CODES.CRITICAL);
      }

      // 3. Manifest
      logger.debug('Building manifest…');
      const manifest = buildManifest(cloneDir!);
      console.log(chalk.dim(
        `  ${manifest.pages.length} page(s), ${manifest.attachments.length} attachment(s)`
      ));

      // 4. Generate DOCX
      prepareOutputDir(outputDir, opts.clean);
      const convertSpinner = ora(`Converting ${manifest.pages.length} page(s)…`).start();
      const convertResults = generateAllDocx(manifest, { referenceDoc, outputDir, luaFilter: DEFAULT_LUA_FILTER });
      const failures = convertResults.filter(r => r.error);

      if (failures.length === 0) {
        convertSpinner.succeed(`Converted all ${convertResults.length} page(s)`);
      } else {
        convertSpinner.warn(
          `Converted ${convertResults.length - failures.length}/${convertResults.length} page(s) — ${failures.length} failed`
        );
        for (const f of failures) {
          logger.warn(`  Skipped "${f.page.title}": ${f.error}`);
        }
      }

      // 5. Assemble output
      const assembleSpinner = ora('Assembling output…').start();
      const { report, exitCode: code } = assembleOutput({
        manifest, convertResults, outputDir, referenceDoc, wikiUrl: opts.url,
      });
      exitCode = code;
      assembleSpinner.succeed('Output assembled');

      // 6. Print summary
      console.log('\n' + chalk.bold('Conversion summary'));
      console.log(`  Pages converted   ${chalk.green(String(report.pagesConverted))}`);
      if (report.pagesSkipped > 0) {
        console.log(`  Pages skipped     ${chalk.yellow(String(report.pagesSkipped))}`);
      }
      console.log(`  Images embedded   ${report.imagesEmbedded}`);
      console.log(`  Links rewritten   ${report.linksRewritten}`);
      console.log(`  Files copied      ${report.nonMarkdownFilesCopied}`);
      if (report.warnings.length > 0) {
        console.log(`  Warnings          ${chalk.yellow(String(report.warnings.length))}`);
      }
      console.log(`\n  Output  ${chalk.cyan(outputDir)}`);
      console.log(
        `  Report  ${chalk.cyan(path.join(outputDir, 'conversion-report.json'))}`
      );

      const icon = exitCode === EXIT_CODES.SUCCESS ? chalk.green('✓')
                 : exitCode === EXIT_CODES.PARTIAL  ? chalk.yellow('⚠')
                 : chalk.red('✗');
      const label = exitCode === EXIT_CODES.SUCCESS ? 'Conversion complete'
                  : exitCode === EXIT_CODES.PARTIAL  ? 'Conversion complete with some failures'
                  : 'Conversion failed — no output produced';
      console.log(`\n${icon} ${label}`);
    } finally {
      if (cloneDir && fs.existsSync(cloneDir)) {
        fs.rmSync(cloneDir, { recursive: true, force: true });
      }
    }

    process.exit(exitCode);
  });

program.parse();
