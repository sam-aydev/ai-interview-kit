import fs from "fs/promises";
import path from "path";
import { parseArgs } from "util";
import { generatePrepKit } from "../packages/core/src/orchestrator.js";
import type {
  BatchInputCase,
  BatchOutput,
  BatchOutputResult,
} from "../packages/shared/src/types.ts";

// Minimal polyfill for dotenv so the script runs cleanly
import "dotenv/config";

async function run() {
  const { values } = parseArgs({
    options: {
      input: { type: "string" },
      output: { type: "string" },
    },
    strict: false,
  });

  if (typeof values.input !== "string" || typeof values.output !== "string") {
    console.error("Usage: npm run evaluate -- --input <path> --output <path>");
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), values.input);
  const outputPath = path.resolve(process.cwd(), values.output);

  console.log(`[Batch] Reading input from ${inputPath}`);

  let cases: BatchInputCase[];
  try {
    const rawData = await fs.readFile(inputPath, "utf-8");
    cases = JSON.parse(rawData);
  } catch (err: any) {
    console.error(`[Batch] Failed to read or parse input file: ${err.message}`);
    process.exit(1);
  }

  const output: BatchOutput = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    kits: [],
  };

  console.log(
    `[Batch] Found ${cases.length} cases to process. Starting sequential run...`,
  );

  // Process sequentially to protect free-tier TPM (Tokens Per Minute) rate limits
  for (const [index, testCase] of cases.entries()) {
    console.log(
      `\n--- Processing Case ${index + 1}/${cases.length}: [${testCase.id}] ---`,
    );

    const result: BatchOutputResult = {
      id: testCase.id,
      status: "ok",
      kit: null,
      error: null,
    };

    try {
      // We pass env: 'batch' to allow local mock servers during grading
      const kit = await generatePrepKit({
        jd: testCase.jd,
        companyUrl: testCase.company_url,
        days: testCase.days,
        env: "batch",
      });

      result.kit = kit;
      console.log(`[Batch] Case [${testCase.id}] completed successfully.`);
    } catch (err: any) {
      console.error(`[Batch] Case [${testCase.id}] FAILED: ${err.message}`);
      result.status = "failed";
      result.error = {
        code: "GENERATION_ERROR",
        message: err.message || "Unknown error occurred during generation",
      };
    }

    output.kits.push(result);
  }

  console.log(`\n[Batch] Run complete. Writing output to ${outputPath}`);
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf-8");
  console.log("[Batch] Done.");
}

run().catch((err) => {
  console.error("[Batch] Fatal script error:", err);
  process.exit(1);
});
