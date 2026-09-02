/** Runs the content-core Vitest type listing and the package's strict TypeScript compiler check. */

import { packageManagerCommand, runCommand } from "./run-package-commands.mjs";

await runCommand(process.execPath, [
    "node_modules/vitest/vitest.mjs",
    "list",
    "--typecheck.only",
    "--config",
    "vitest.content-core.types.config.ts",
]);
await runCommand(packageManagerCommand(), [
    "--dir=packages/content-core",
    "exec",
    "tsc",
    "--noEmit",
    "--pretty",
    "false",
]);
