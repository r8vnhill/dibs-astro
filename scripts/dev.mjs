#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const astroCli = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "node_modules",
    "astro",
    "astro.js",
);

const child = spawn(process.execPath, [astroCli, "dev", ...process.argv.slice(2)], {
    stdio: "inherit",
    shell: false,
    env: {
        ...process.env,
        DIBS_SHIKI_RUNTIME_PATCH_ENABLED: "false",
    },
});

child.on("exit", (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }

    process.exit(code ?? 0);
});

child.on("error", (error) => {
    console.error("[dev] Failed to start Astro:", error);
    process.exit(1);
});
