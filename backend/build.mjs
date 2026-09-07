#!/usr/bin/env node
// Bundle the Lambda into a single ESM file at dist/index.mjs.
// The AWS SDK v3 is provided by the nodejs20.x runtime, so it stays external.
// The word-list JSON is inlined into the bundle.

import { build } from "esbuild";
import { rmSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "dist/index.mjs",
  loader: { ".json": "json" },
  external: ["@aws-sdk/*"],
  logLevel: "info",
});

console.log("built dist/index.mjs");
