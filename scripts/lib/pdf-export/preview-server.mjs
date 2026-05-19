import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const astroCli = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "node_modules",
    "astro",
    "astro.js",
);

export function startPreviewServer({ projectRoot, host = "127.0.0.1", port = 4321 }) {
    return spawn(process.execPath, [astroCli, "preview", "--host", host, "--port", String(port)], {
        cwd: projectRoot,
        stdio: "inherit",
        shell: false,
        env: {
            ...process.env,
            DIBS_SHIKI_RUNTIME_PATCH_ENABLED: "false",
        },
    });
}

export async function waitForPreview(baseUrl, timeoutMs) {
    const normalizedBaseUrl = new URL("/", baseUrl).href;
    const deadline = Date.now() + timeoutMs;
    let lastError;

    while (Date.now() < deadline) {
        try {
            const response = await fetch(normalizedBaseUrl, { method: "GET" });
            if (response.ok) {
                return normalizedBaseUrl;
            }

            lastError = new Error(`Preview responded with HTTP ${response.status}.`);
        } catch (error) {
            lastError = error;
        }

        await delay(250);
    }

    const message = lastError instanceof Error ? lastError.message : String(lastError ?? "Unknown error");
    throw new Error(`Preview server at ${normalizedBaseUrl} did not become ready within ${timeoutMs}ms. Last error: ${message}`);
}

export function stopPreviewServer(childProcess) {
    if (childProcess && !childProcess.killed) {
        childProcess.kill();
    }
}

function delay(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}