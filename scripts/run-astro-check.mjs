import { spawnSync } from "node:child_process";

const result = spawnSync(
    process.execPath,
    ["--require", "./scripts/astro-check-typescript6-bridge.cjs", "./node_modules/astro/bin/astro.mjs", "check"],
    {
        stdio: "inherit",
        env: {
            ...process.env,
            SKIP_ICON_GENERATION: "true",
        },
    },
);

if (result.error) {
    throw result.error;
}

process.exit(result.status ?? 1);
