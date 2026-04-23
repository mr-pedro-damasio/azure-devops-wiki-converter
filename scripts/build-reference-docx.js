#!/usr/bin/env node
/**
 * Generates a styled reference.docx for Pandoc DOCX output.
 * Starts from Pandoc's default reference.docx and applies GitHub-inspired styles:
 *   - Headings: dark text, H1/H2 with bottom border, clean sans-serif
 *   - Code blocks (SourceCode): light gray background, border, monospace
 *   - Hyperlinks: GitHub blue (#0969DA), underline
 *   - Blockquotes (BlockText): left border, muted text color
 *   - Tables: visible cell borders
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const OUT_PATH = path.join(ASSETS_DIR, 'reference.docx');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ref-docx-'));
const tmpDocx = path.join(tmpDir, 'reference.docx');
const extractDir = path.join(tmpDir, 'extract');

try {
  // 1. Extract default pandoc reference.docx
  const pandocResult = spawnSync(
    'pandoc',
    ['--print-default-data-file', 'reference.docx'],
    { encoding: 'buffer' }
  );
  if (pandocResult.status !== 0) throw new Error('pandoc --print-default-data-file failed');
  fs.writeFileSync(tmpDocx, pandocResult.stdout);

  fs.mkdirSync(extractDir, { recursive: true });
  execSync(`unzip -o "${tmpDocx}" -d "${extractDir}"`, { stdio: 'ignore' });

  // 2. Modify word/styles.xml
  const stylesPath = path.join(extractDir, 'word', 'styles.xml');
  let styles = fs.readFileSync(stylesPath, 'utf-8');

  // ── Heading 1: dark text, bottom border, bold, 20pt ──────────────────────
  styles = styles.replace(
    /<w:style w:type="paragraph" w:styleId="Heading1">[\s\S]*?<\/w:style>/,
    `<w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1" />
    <w:basedOn w:val="Normal" />
    <w:next w:val="BodyText" />
    <w:link w:val="Heading1Char" />
    <w:uiPriority w:val="9" />
    <w:qFormat />
    <w:pPr>
      <w:keepNext />
      <w:keepLines />
      <w:spacing w:before="480" w:after="120" />
      <w:outlineLvl w:val="0" />
      <w:pBdr>
        <w:bottom w:val="single" w:sz="4" w:space="1" w:color="D0D7DE"/>
      </w:pBdr>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:cs="Segoe UI" />
      <w:b />
      <w:bCs />
      <w:color w:val="1F2328" />
      <w:sz w:val="40" />
      <w:szCs w:val="40" />
    </w:rPr>
  </w:style>`
  );

  // ── Heading 1 Char: match Heading1 ───────────────────────────────────────
  styles = styles.replace(
    /<w:style w:type="character" w:customStyle="1" w:styleId="Heading1Char">[\s\S]*?<\/w:style>/,
    `<w:style w:type="character" w:customStyle="1" w:styleId="Heading1Char">
    <w:name w:val="Heading 1 Char" />
    <w:basedOn w:val="DefaultParagraphFont" />
    <w:link w:val="Heading1" />
    <w:uiPriority w:val="9" />
    <w:rPr>
      <w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:cs="Segoe UI" />
      <w:b />
      <w:bCs />
      <w:color w:val="1F2328" />
      <w:sz w:val="40" />
      <w:szCs w:val="40" />
    </w:rPr>
  </w:style>`
  );

  // ── Heading 2: dark text, bottom border, bold, 16pt ──────────────────────
  styles = styles.replace(
    /<w:style w:type="paragraph" w:styleId="Heading2">[\s\S]*?<\/w:style>/,
    `<w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2" />
    <w:basedOn w:val="Normal" />
    <w:next w:val="BodyText" />
    <w:link w:val="Heading2Char" />
    <w:uiPriority w:val="9" />
    <w:qFormat />
    <w:pPr>
      <w:keepNext />
      <w:keepLines />
      <w:spacing w:before="320" w:after="80" />
      <w:outlineLvl w:val="1" />
      <w:pBdr>
        <w:bottom w:val="single" w:sz="4" w:space="1" w:color="D0D7DE"/>
      </w:pBdr>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:cs="Segoe UI" />
      <w:b />
      <w:bCs />
      <w:color w:val="1F2328" />
      <w:sz w:val="32" />
      <w:szCs w:val="32" />
    </w:rPr>
  </w:style>`
  );

  // ── Heading 2 Char ────────────────────────────────────────────────────────
  styles = styles.replace(
    /<w:style w:type="character" w:customStyle="1"\s*w:styleId="Heading2Char">[\s\S]*?<\/w:style>/,
    `<w:style w:type="character" w:customStyle="1" w:styleId="Heading2Char">
    <w:name w:val="Heading 2 Char" />
    <w:basedOn w:val="DefaultParagraphFont" />
    <w:link w:val="Heading2" />
    <w:uiPriority w:val="9" />
    <w:rPr>
      <w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:cs="Segoe UI" />
      <w:b />
      <w:bCs />
      <w:color w:val="1F2328" />
      <w:sz w:val="32" />
      <w:szCs w:val="32" />
    </w:rPr>
  </w:style>`
  );

  // ── Heading 3: dark text, bold, 14pt ─────────────────────────────────────
  styles = styles.replace(
    /<w:style w:type="paragraph" w:styleId="Heading3">[\s\S]*?<\/w:style>/,
    `<w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3" />
    <w:basedOn w:val="Normal" />
    <w:next w:val="BodyText" />
    <w:link w:val="Heading3Char" />
    <w:uiPriority w:val="9" />
    <w:qFormat />
    <w:pPr>
      <w:keepNext />
      <w:keepLines />
      <w:spacing w:before="240" w:after="80" />
      <w:outlineLvl w:val="2" />
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:cs="Segoe UI" />
      <w:b />
      <w:bCs />
      <w:color w:val="1F2328" />
      <w:sz w:val="28" />
      <w:szCs w:val="28" />
    </w:rPr>
  </w:style>`
  );

  // ── Heading 4: dark text, bold, 12pt ─────────────────────────────────────
  styles = styles.replace(
    /<w:style w:type="paragraph" w:styleId="Heading4">[\s\S]*?<\/w:style>/,
    `<w:style w:type="paragraph" w:styleId="Heading4">
    <w:name w:val="heading 4" />
    <w:basedOn w:val="Normal" />
    <w:next w:val="BodyText" />
    <w:link w:val="Heading4Char" />
    <w:uiPriority w:val="9" />
    <w:qFormat />
    <w:pPr>
      <w:keepNext />
      <w:keepLines />
      <w:spacing w:before="160" w:after="60" />
      <w:outlineLvl w:val="3" />
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:cs="Segoe UI" />
      <w:b />
      <w:bCs />
      <w:color w:val="1F2328" />
      <w:sz w:val="24" />
      <w:szCs w:val="24" />
    </w:rPr>
  </w:style>`
  );

  // ── Heading 5 ─────────────────────────────────────────────────────────────
  styles = styles.replace(
    /<w:style w:type="paragraph" w:styleId="Heading5">[\s\S]*?<\/w:style>/,
    `<w:style w:type="paragraph" w:styleId="Heading5">
    <w:name w:val="heading 5" />
    <w:basedOn w:val="Normal" />
    <w:next w:val="BodyText" />
    <w:link w:val="Heading5Char" />
    <w:uiPriority w:val="9" />
    <w:qFormat />
    <w:pPr>
      <w:keepNext />
      <w:keepLines />
      <w:spacing w:before="120" w:after="40" />
      <w:outlineLvl w:val="4" />
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:cs="Segoe UI" />
      <w:b />
      <w:bCs />
      <w:color w:val="636E7B" />
      <w:sz w:val="22" />
      <w:szCs w:val="22" />
    </w:rPr>
  </w:style>`
  );

  // ── Heading 6 ─────────────────────────────────────────────────────────────
  styles = styles.replace(
    /<w:style w:type="paragraph" w:styleId="Heading6">[\s\S]*?<\/w:style>/,
    `<w:style w:type="paragraph" w:styleId="Heading6">
    <w:name w:val="heading 6" />
    <w:basedOn w:val="Normal" />
    <w:next w:val="BodyText" />
    <w:link w:val="Heading6Char" />
    <w:uiPriority w:val="9" />
    <w:qFormat />
    <w:pPr>
      <w:keepNext />
      <w:keepLines />
      <w:spacing w:before="80" w:after="40" />
      <w:outlineLvl w:val="5" />
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:cs="Segoe UI" />
      <w:color w:val="636E7B" />
      <w:sz w:val="22" />
      <w:szCs w:val="22" />
    </w:rPr>
  </w:style>`
  );

  // ── VerbatimChar (inline code): monospace, dark-on-muted ─────────────────
  styles = styles.replace(
    /<w:style w:type="character" w:customStyle="1" w:styleId="VerbatimChar">[\s\S]*?<\/w:style>/,
    `<w:style w:type="character" w:customStyle="1" w:styleId="VerbatimChar">
    <w:name w:val="Verbatim Char" />
    <w:basedOn w:val="BodyTextChar" />
    <w:rPr>
      <w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Courier New" />
      <w:color w:val="C0392B" />
      <w:sz w:val="20" />
      <w:szCs w:val="20" />
    </w:rPr>
  </w:style>`
  );

  // ── Hyperlink: GitHub blue, underline ─────────────────────────────────────
  styles = styles.replace(
    /<w:style w:type="character" w:styleId="Hyperlink">[\s\S]*?<\/w:style>/,
    `<w:style w:type="character" w:styleId="Hyperlink">
    <w:name w:val="Hyperlink" />
    <w:basedOn w:val="BodyTextChar" />
    <w:rPr>
      <w:color w:val="0969DA" />
      <w:u w:val="single" />
    </w:rPr>
  </w:style>`
  );

  // ── BlockText (blockquotes): left border, muted color ────────────────────
  styles = styles.replace(
    /<w:style w:type="paragraph" w:styleId="BlockText">[\s\S]*?<\/w:style>/,
    `<w:style w:type="paragraph" w:styleId="BlockText">
    <w:name w:val="Block Text" />
    <w:basedOn w:val="BodyText" />
    <w:pPr>
      <w:spacing w:before="80" w:after="80" />
      <w:ind w:left="480" />
      <w:pBdr>
        <w:left w:val="single" w:sz="12" w:space="12" w:color="D0D7DE"/>
      </w:pBdr>
    </w:pPr>
    <w:rPr>
      <w:color w:val="636E7B" />
    </w:rPr>
  </w:style>`
  );

  // ── SourceCode paragraph style: gray background, border, monospace ────────
  // Insert before </w:styles> if not already present
  if (!styles.includes('styleId="SourceCode"')) {
    styles = styles.replace(
      '</w:styles>',
      `<w:style w:type="paragraph" w:customStyle="1" w:styleId="SourceCode">
    <w:name w:val="Source Code" />
    <w:basedOn w:val="Normal" />
    <w:link w:val="VerbatimChar" />
    <w:pPr>
      <w:wordWrap w:val="off" />
      <w:spacing w:before="80" w:after="80" />
      <w:ind w:left="120" w:right="120" />
      <w:pBdr>
        <w:top w:val="single" w:sz="4" w:space="2" w:color="D0D7DE"/>
        <w:left w:val="single" w:sz="4" w:space="6" w:color="D0D7DE"/>
        <w:bottom w:val="single" w:sz="4" w:space="2" w:color="D0D7DE"/>
        <w:right w:val="single" w:sz="4" w:space="6" w:color="D0D7DE"/>
      </w:pBdr>
      <w:shd w:val="clear" w:color="auto" w:fill="F6F8FA"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Courier New" />
      <w:color w:val="1F2328" />
      <w:sz w:val="20" />
      <w:szCs w:val="20" />
    </w:rPr>
  </w:style>
</w:styles>`
    );
  }

  // ── Table: add visible borders ────────────────────────────────────────────
  // The Table style (tblStyle) needs w:tblBorders under w:tblPr.
  // We replace the existing Table paragraph style and add a tblStyle.
  if (!styles.includes('styleId="TableGrid"')) {
    styles = styles.replace(
      '<w:style w:type="paragraph" w:styleId="Table">',
      `<w:style w:type="table" w:styleId="TableGrid">
    <w:name w:val="Table Grid" />
    <w:basedOn w:val="TableNormal" />
    <w:tblPr>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="D0D7DE"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="D0D7DE"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="D0D7DE"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="D0D7DE"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="D0D7DE"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="D0D7DE"/>
      </w:tblBorders>
    </w:tblPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Table">`
    );
  }

  fs.writeFileSync(stylesPath, styles, 'utf-8');

  // 3. Repack the ZIP (from within extractDir so paths are relative)
  execSync(`cd "${extractDir}" && zip -r "${tmpDocx}" .`, { stdio: 'ignore' });

  // 4. Copy to assets/
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
  fs.copyFileSync(tmpDocx, OUT_PATH);

  console.log(`✓ Generated ${OUT_PATH}`);
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
