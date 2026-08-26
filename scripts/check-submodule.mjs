#!/usr/bin/env node

import { inspectExternalSource } from "./lib/submodule.mjs";

const result = await inspectExternalSource({ cwd: process.cwd() });

if (result.findings.length > 0) {
    console.error(result.findings.join("\n\n"));
    process.exitCode = 1;
} else {
    console.log("External astro-site-shell source is initialized at the recorded commit.");
}
