import fs from "fs/promises";
import path from "path";
import { parseArgs } from "util";
import { generatePrepKit } from "../packages/core/src/orchestrator.js";
import type {
  BatchInputCase,
  BatchOutput,
  BatchOutputResult,
} from "../packages/shared/src/types.ts";

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
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), values.input);
  const outputPath = path.resolve(process.cwd(), values.output);


  let cases: BatchInputCase[];
  try {
    const rawData = await fs.readFile(inputPath, "utf-8");
    cases = JSON.parse(rawData);
  } catch (err: any) {
    process.exit(1);
  }

  const output: BatchOutput = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    kits: [],
  };

 

  // Process sequentially to protect free-tier TPM (Tokens Per Minute) rate limits
  for (const [index, testCase] of cases.entries()) {
    

    const result = {
      id: testCase.id,
      status: "ok",
      kit: null,
      error: null,
    } as unknown as BatchOutputResult;

    try {
      // I pass env: 'batch' to allow local mock servers during grading
      const kit = await generatePrepKit({
        jd: testCase.jd,
        companyUrl: testCase.company_url,
        days: testCase.days,
        env: "batch",
      });

      
      result.kit = kit as any; 
      
    } catch (err: any) {
      result.status = "failed";
      result.error = {
        code: "GENERATION_ERROR",
        message: err.message || "Unknown error occurred during generation",
      };
    }

    output.kits.push(result);
  }

  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf-8");
}

run().catch((err) => {
  process.exit(1);
});