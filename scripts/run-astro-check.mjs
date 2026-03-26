import { spawnSync } from "node:child_process";

const result = spawnSync(
    process.execPath,
    ["./node_modules/astro/astro.js", "check"],
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
