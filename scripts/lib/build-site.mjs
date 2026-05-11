import { spawn } from "node:child_process";

export async function buildSite({ projectRoot }) {
    await runPackageCommand({
        projectRoot,
        args: ["build"],
        logPrefix: "[export-lessons-pdf]",
    });
}

async function runPackageCommand({ projectRoot, args, logPrefix }) {
    await new Promise((resolve, reject) => {
        const isWindows = process.platform === "win32";
        const command = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "pnpm";
        const commandArgs = isWindows ? ["/d", "/s", "/c", ["pnpm", ...args].join(" ")] : args;

        const childProcess = spawn(command, commandArgs, {
            cwd: projectRoot,
            stdio: "inherit",
            shell: false,
            env: {
                ...process.env,
            },
        });

        childProcess.on("error", (error) => {
            reject(new Error(`${logPrefix} Failed to start build: ${error instanceof Error ? error.message : String(error)}`));
        });

        childProcess.on("exit", (code, signal) => {
            if (signal) {
                reject(new Error(`${logPrefix} Build terminated with signal ${signal}.`));
                return;
            }

            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`${logPrefix} Build failed with exit code ${code ?? 1}.`));
        });
    });
}