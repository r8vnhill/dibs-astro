/** Runs the content-core package checks and its TypeScript validation in sequence. */

import { packageManagerCommand, runCommand } from "./run-package-commands.mjs";

const packageManager = packageManagerCommand();

await runCommand(packageManager, ["--dir=packages/content-core", "run", "check"]);
await runCommand(packageManager, ["run", "test:typecheck:content-core"]);
