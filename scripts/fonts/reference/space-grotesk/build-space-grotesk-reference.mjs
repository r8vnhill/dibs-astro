/**
 * @fileoverview Vendors and verifies the pinned Space Grotesk 2.0.0 reference.
 *
 * Space Grotesk 2.0.0 is used only as the local visual/layout comparator for the DIBS Slab heading
 * experiment; it is never a production dependency. All behavior lives in the shared engine
 * (`../lib/reference-font-provenance.mjs`); this file only supplies the Space-Grotesk-specific pins.
 *
 * Usage: `pnpm fonts:reference:space-grotesk:check` (offline) or
 * `pnpm fonts:reference:space-grotesk:vendor`. See ./README.md for the committed asset list.
 */

import { defineReferenceFont, runReferenceFontCli } from "../lib/reference-font-provenance.mjs";

const { check, vendor } = defineReferenceFont({
    importMetaUrl: import.meta.url,
    dirName: "space-grotesk",
    referenceDirName: "space-grotesk-2.0.0",
    archiveName: "SpaceGrotesk-2.0.0.zip",
    family: "Space Grotesk Reference 2.0.0",
    tmpPrefix: "dibs-space-grotesk-",
});

runReferenceFontCli({ importMetaUrl: import.meta.url, check, vendor });

export { check, vendor };
