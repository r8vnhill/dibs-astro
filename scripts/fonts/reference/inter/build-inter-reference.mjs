/**
 * @fileoverview Vendors and verifies the pinned Inter 4.1 reference.
 *
 * Inter 4.1 is used only as the local visual/layout comparator for the DIBS Sans body/UI experiment;
 * it is never a production dependency. All behavior lives in the shared engine
 * (`../lib/reference-font-provenance.mjs`); this file only supplies the Inter-specific pins.
 *
 * Usage: `pnpm fonts:reference:inter:check` (offline) or `pnpm fonts:reference:inter:vendor`.
 * See ./README.md for the committed asset list and provenance details.
 */

import { defineReferenceFont, runReferenceFontCli } from "../lib/reference-font-provenance.mjs";

const { check, vendor } = defineReferenceFont({
    importMetaUrl: import.meta.url,
    dirName: "inter",
    referenceDirName: "inter-4.1",
    archiveName: "inter-4.1.zip",
    family: "Inter Reference 4.1",
    tmpPrefix: "dibs-inter-",
});

runReferenceFontCli({ importMetaUrl: import.meta.url, check, vendor });

export { check, vendor };
