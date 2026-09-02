/** Writes the platform artifact manifest to the repository's standard temporary output path. */

import { runCommand } from "./run-package-commands.mjs";

await runCommand(process.execPath, [
    "scripts/generate-platform-artifact-manifest.mjs",
    "--out",
    "tmp/platform-artifact-manifest.json",
]);
