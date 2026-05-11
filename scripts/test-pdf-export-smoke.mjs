#!/usr/bin/env node

import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { mkdir, readFile, rm, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { buildLessonPdfExportManifest } from "./lib/pdf-export-manifest.mjs";
import {
    assertPdfSmokeReport,
    assertPreviewServerStopped,
    createPdfSmokeWorkspace,
    readPdfSmokeConfig,
    resolvePdfSmokeEntry,
} from "./lib/pdf-export-smoke.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const main = async () => {
    const smokeConfig = readPdfSmokeConfig();
    const workspace = createPdfSmokeWorkspace(projectRoot);
    const { manifest, validation } = buildLessonPdfExportManifest({ outDir: workspace.relativeOutDir });
    const validationErrors = validation.findings.filter((finding) => finding.severity === "error");

    try {
        if (validationErrors.length > 0) {
            throw new Error(formatValidationErrors(validationErrors));
        }

        const entry = resolvePdfSmokeEntry(manifest, smokeConfig.route);
        const port = await reserveFreePort();
        const exporterScript = path.resolve(projectRoot, "scripts", "export-lessons-pdf.mjs");
        const cliArgs = [
            exporterScript,
            "--route",
            entry.route,
            "--outDir",
            workspace.relativeOutDir,
            "--report",
            workspace.relativeReportPath,
            "--port",
            String(port),
        ];

        await mkdir(workspace.absoluteRoot, { recursive: true });

        const result = await runNodeCommand(process.execPath, cliArgs, {
            cwd: projectRoot,
            env: {
                ...process.env,
            },
        });

        if (result.code !== 0) {
            throw new Error(formatCommandFailure(result));
        }

        const reportText = await readFile(workspace.absoluteReportPath, "utf8");
        const report = JSON.parse(reportText);

        assertPdfSmokeReport(report, entry);

        const pdfPath = path.resolve(projectRoot, entry.outputPath);
        const pdfStats = await stat(pdfPath);

        if (pdfStats.size <= 0) {
            throw new Error(`PDF smoke export did not write a readable file at ${pdfPath}.`);
        }

        await assertPreviewServerStopped(port);

        console.log(`[pdf-export-smoke] Exported ${entry.route} to ${workspace.relativeOutDir}.`);
    } finally {
        if (!smokeConfig.keepOutput) {
            await rm(workspace.absoluteRoot, { recursive: true, force: true });
        }
    }
};

main().catch((error) => {
    console.error("[pdf-export-smoke] Unexpected error:", error);
    process.exitCode = 1;
});

function runNodeCommand(command, args, options) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: options.cwd,
            env: options.env,
            shell: false,
            stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";

        child.stdout.setEncoding("utf8");
        child.stdout.on("data", (chunk) => {
            stdout += chunk;
        });

        child.stderr.setEncoding("utf8");
        child.stderr.on("data", (chunk) => {
            stderr += chunk;
        });

        child.once("error", reject);
        child.once("close", (code, signal) => {
            resolve({ code, signal, stdout, stderr });
        });
    });
}

function formatCommandFailure(result) {
    return [
        "PDF smoke export failed.",
        `exit code: ${result.code ?? "unknown"}`,
        `signal: ${result.signal ?? "none"}`,
        "stdout:",
        result.stdout.trim().length > 0 ? result.stdout.trimEnd() : "(empty)",
        "stderr:",
        result.stderr.trim().length > 0 ? result.stderr.trimEnd() : "(empty)",
    ].join("\n");
}

function formatValidationErrors(findings) {
    return [
        "PDF smoke export manifest is invalid:",
        ...findings.map((finding) => `- ${finding.message}`),
    ].join("\n");
}

function reserveFreePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();

        server.unref();
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();

            if (!address || typeof address === "string") {
                reject(new Error("Failed to reserve a preview port for the PDF smoke test."));
                return;
            }

            const { port } = address;

            server.close((closeError) => {
                if (closeError) {
                    reject(closeError);
                    return;
                }

                resolve(port);
            });
        });
    });
}