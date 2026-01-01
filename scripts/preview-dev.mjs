#!/usr/bin/env node

import { spawn } from "node:child_process";

import path from "node:path";
import { fileURLToPath } from "node:url";

const processes = [];
let shuttingDown = false;
const astroCli = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "node_modules",
    "astro",
    "astro.js",
);

function run(command, args) {
    const child = spawn(command, args, {
        stdio: "inherit",
        shell: false,
        env: process.env,
    });

    processes.push(child);

    child.on("exit", (code) => {
        shutdown(code ?? 0);
    });

    child.on("error", (error) => {
        console.error(`[preview-dev] Failed to start ${command}:`, error);
        shutdown(1);
    });
}

function shutdown(code = 0) {
    if (shuttingDown) return;
    shuttingDown = true;

    for (const child of processes) {
        if (!child.killed) {
            child.kill();
        }
    }

    process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

run(process.execPath, [
    astroCli,
    "dev",
    "--host",
    "127.0.0.1",
    "--port",
    "4321",
]);
run("wrangler", ["pages", "dev", "--proxy", "4321", "--host", "127.0.0.1"]);
