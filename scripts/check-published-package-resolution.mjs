#!/usr/bin/env node

import { runPackageResolutionCheck } from "./lib/package-resolution/checker.mjs";

const result = await runPackageResolutionCheck({ cwd: process.cwd() });

if (result.findings.length > 0) {
    console.error(result.output);
} else {
    console.log(result.output);
}

process.exitCode = result.exitCode;
