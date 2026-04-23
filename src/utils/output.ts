import * as fs from 'fs';

export function prepareOutputDir(outputDir: string, clean: boolean): void {
  if (clean && fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }

  fs.mkdirSync(outputDir, { recursive: true });
}