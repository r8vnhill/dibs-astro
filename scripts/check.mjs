/**
 * Runs the repository's merge-gating checks in their required order.
 *
 * Keeping orchestration here makes the package script readable and gives maintainers one place to update the check
 * sequence. The font provenance check stays near the other generated-artifact checks so local and CI validation agree.
 */

import { packageManagerCommand, runCommand, runPackageScripts } from "./run-package-commands.mjs";

const checks = [
    "check:toolchain",
    "fonts:check",
    "fonts:reference:check",
    "i18n:compile",
    "check:content-core",
    "check:lesson-export-core",
    "check:shiki-core",
    "generate:bibliography-catalog",
];

async function main() {
    const packageManager = packageManagerCommand();

    await runPackageScripts(checks);
    await runCommand(process.execPath, ["scripts/run-astro-check.mjs"]);
    await runCommand(process.execPath, ["scripts/generate-lesson-metadata.mjs", "--dry-run", "--quiet"]);
    await runCommand(packageManager, ["run", "check:architecture"]);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
