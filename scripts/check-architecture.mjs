#!/usr/bin/env node

import { runBoundaryCheck } from "./lib/layer-boundary/checker.mjs";
import { inspectExternalSources } from "./lib/submodule.mjs";

const [boundaryResult, externalSourceResults] = await Promise.all([
    runBoundaryCheck({ cwd: process.cwd() }),
    inspectExternalSources({ cwd: process.cwd() }),
]);

const externalSourceFindings = externalSourceResults.flatMap((result) => result.findings);

if (boundaryResult.findings.length > 0) {
    console.error(boundaryResult.output);
}

if (externalSourceFindings.length > 0) {
    console.error(externalSourceFindings.join("\n\n"));
}

if (boundaryResult.findings.length === 0 && externalSourceFindings.length === 0) {
    console.log(boundaryResult.output);
    console.log("External package sources are initialized at their recorded commits.");
}

process.exitCode = boundaryResult.findings.length > 0 || externalSourceFindings.length > 0 ? 1 : 0;
