/** Regenerates the bibliography catalog before producing its JSON and CSV reports. */

import { runCommand, runPackageScripts } from "./run-package-commands.mjs";

await runPackageScripts(["generate:bibliography-catalog"]);
await runCommand(process.execPath, ["scripts/bibliography-report.mjs"]);
