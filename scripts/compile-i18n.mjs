/** Runs the checked-in Paraglide compilation with the repository's canonical paths. */

import { runCommand } from "./run-package-commands.mjs";

await runCommand(process.execPath, [
    "node_modules/@inlang/paraglide-js/bin/run.js",
    "compile",
    "--project",
    "project.inlang",
    "--outdir",
    "src/generated/i18n",
    "--emit-ts-declarations",
]);
