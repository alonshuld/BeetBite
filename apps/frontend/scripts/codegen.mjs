#!/usr/bin/env node
import openapiTS, { astToString } from "openapi-typescript";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3000";
const schemaUrl = new URL(`${backendUrl}/api/v1/docs-json`);
const outPath = path.join(
  __dirname,
  "..",
  "src",
  "api",
  "generated",
  "schema.d.ts",
);

console.log(`Fetching schema from ${schemaUrl.toString()}…`);
const ast = await openapiTS(schemaUrl);
const contents = astToString(ast);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, contents, "utf-8");
console.log(`Generated ${path.relative(process.cwd(), outPath)}`);
