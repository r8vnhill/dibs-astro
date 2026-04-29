#!/usr/bin/env node

import { runBoundaryCheck } from "./lib/layer-boundary-checker.mjs";

const result = await runBoundaryCheck({ cwd: process.cwd() });

if (result.findings.length > 0) {
    console.error(result.output);
} else {
    console.log(result.output);
}

process.exitCode = result.exitCode;
