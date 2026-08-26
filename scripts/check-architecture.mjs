#!/usr/bin/env node

import { runBoundaryCheck } from "./lib/layer-boundary/checker.mjs";
import { inspectExternalSource } from "./lib/submodule.mjs";

const [boundaryResult, externalSourceResult] = await Promise.all([
    runBoundaryCheck({ cwd: process.cwd() }),
    inspectExternalSource({ cwd: process.cwd() }),
]);

if (boundaryResult.findings.length > 0) {
    console.error(boundaryResult.output);
}

if (externalSourceResult.findings.length > 0) {
    console.error(externalSourceResult.findings.join("\n\n"));
}

if (boundaryResult.findings.length === 0 && externalSourceResult.findings.length === 0) {
    console.log(boundaryResult.output);
    console.log("External astro-site-shell source is initialized at the recorded commit.");
}

process.exitCode = boundaryResult.findings.length > 0 || externalSourceResult.findings.length > 0 ? 1 : 0;
