#!/usr/bin/env node

import { inspectExternalSources } from "./lib/submodule.mjs";

const results = await inspectExternalSources({ cwd: process.cwd() });
const findings = results.flatMap((result) => result.findings);

if (findings.length > 0) {
    console.error(findings.join("\n\n"));
    process.exitCode = 1;
} else {
    console.log("External package sources are initialized at their recorded commits.");
}
