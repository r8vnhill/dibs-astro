import { readFile } from "node:fs/promises";

import { assertSupportedToolchain } from "./lib/toolchain.mjs";

const manifestUrl = new URL("../package.json", import.meta.url);
const packageManifest = JSON.parse(await readFile(manifestUrl, "utf8"));
const pnpmVersion = process.env.npm_config_user_agent?.match(/pnpm\/(\d+\.\d+\.\d+)/)?.[1];

try {
    assertSupportedToolchain({
        packageManifest,
        nodeVersion: process.versions.node,
        pnpmVersion,
    });
    console.log(`Toolchain is supported: Node ${process.versions.node}, pnpm ${pnpmVersion}.`);
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
