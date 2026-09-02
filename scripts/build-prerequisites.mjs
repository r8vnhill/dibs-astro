/** Builds the generated inputs required by local development, production builds, and deployment. */

import { runPackageScripts } from "./run-package-commands.mjs";

await runPackageScripts([
    "i18n:compile",
    "build:content-core",
    "build:lesson-export-core",
    "build:shiki-core",
    "generate:bibliography-catalog",
    "generate:lesson-metadata",
]);
