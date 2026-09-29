import fs from 'fs';
import path from 'path';
import { executePipeline } from '../services/pipeline.js';
import {
  KitResultItem,
  EvaluationOutput,
  EvaluationCase,
} from '../types/kit.js';

function parseArgs() {
  const args = process.argv.slice(2);
  let inputPath = '';
  let outputPath = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && i + 1 < args.length) {
      inputPath = args[i + 1];
      i++;
    } else if (args[i] === '--output' && i + 1 < args.length) {
      outputPath = args[i + 1];
      i++;
    }
  }

  return { inputPath, outputPath };
}

function resolvePath(filePath: string): string {
  if (path.isAbsolute(filePath)) return filePath;
  const fromCwd = path.resolve(process.cwd(), filePath);
  if (fs.existsSync(fromCwd)) return fromCwd;

  const fromParent = path.resolve(process.cwd(), '..', filePath);
  if (fs.existsSync(fromParent)) return fromParent;

  return fromCwd;
}

async function main() {
  const { inputPath, outputPath } = parseArgs();

  if (!inputPath || !outputPath) {
    console.error('Usage: npm run evaluate -- --input <cases.json> --output <kits.json>');
    process.exit(1);
  }

  const absoluteInput = resolvePath(inputPath);
  const absoluteOutput = path.isAbsolute(outputPath)
    ? outputPath
    : path.resolve(process.cwd(), outputPath);

  if (!fs.existsSync(absoluteInput)) {
    console.error(`Input file not found: ${absoluteInput}`);
    process.exit(1);
  }

  let rawData: unknown;
  try {
    const fileContent = fs.readFileSync(absoluteInput, 'utf-8');
    rawData = JSON.parse(fileContent);
  } catch (err: any) {
    console.error(`Failed to read/parse input JSON file: ${err.message}`);
    process.exit(1);
  }

  let cases: EvaluationCase[] = [];
  if (Array.isArray(rawData)) {
    cases = rawData;
  } else if (typeof rawData === 'object' && rawData !== null && 'cases' in rawData && Array.isArray((rawData as any).cases)) {
    cases = (rawData as any).cases;
  } else if (typeof rawData === 'object' && rawData !== null && 'id' in rawData) {
    cases = [rawData as EvaluationCase];
  } else {
    console.error('Invalid input JSON format. Expected an array of cases.');
    process.exit(1);
  }

  console.log(`[Batch CLI] Starting evaluation for ${cases.length} cases...`);
  const kitResults: KitResultItem[] = [];

  for (let i = 0; i < cases.length; i++) {
    const item = cases[i];
    console.log(`[Batch CLI] Processing case ${i + 1}/${cases.length}: "${item.id}" (${item.days} days)...`);

    try {
      const kit = await executePipeline({
        jd: item.jd,
        companyUrl: item.company_url,
        daysAvailable: item.days,
        allowLocalUrls: true,
      });

      kitResults.push({
        id: item.id,
        status: 'ok',
        kit,
        error: null,
      });
      console.log(`[Batch CLI] Case "${item.id}" completed successfully.`);
    } catch (err: any) {
      console.error(`[Batch CLI] Case "${item.id}" failed: ${err.message}`);
      kitResults.push({
        id: item.id,
        status: 'failed',
        kit: null,
        error: {
          code: 'GENERATION_FAILED',
          message: err.message || 'Unknown error during pipeline execution',
        },
      });
    }
  }

  const output: EvaluationOutput = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    kits: kitResults,
  };

  const outputDir = path.dirname(absoluteOutput);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(absoluteOutput, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`[Batch CLI] Finished! Generated evaluation output saved to: ${absoluteOutput}`);
}

main().catch((err) => {
  console.error('CLI Evaluation fatal error:', err);
  process.exit(1);
});
