import { describe, expect, test } from "vitest";

import { findRootImporterDependency, validateLockfileEntry } from "../../lib/package-resolution/lockfile.mjs";

const publishedLockfile = `lockfileVersion: '9.0'

importers:

  .:
    dependencies:
      '@ravenhill/astro-icons':
        specifier: 0.2.0
        version: 0.2.0
      '@ravenhill/content-core':
        specifier: workspace:*
        version: link:packages/content-core
      '@ravenhill/site-core':
        specifier: 0.1.0
        version: 0.1.0

  packages/content-core:
    dependencies:
      astro:
        specifier: ^7.0.0
        version: 7.2.2

packages:

  '@ravenhill/site-core@0.1.0':
    resolution: {integrity: sha512-fake==}
`;

const workspaceLockfile = `lockfileVersion: '9.0'

importers:

  .:
    dependencies:
      '@ravenhill/site-core':
        specifier: workspace:*
        version: link:packages/site-core

  packages/content-core:
    dependencies:
      astro:
        specifier: ^7.0.0
        version: 7.2.2
`;

describe("given the root importer dependency block", () => {
    test("then it extracts a published entry", () => {
        expect(findRootImporterDependency(publishedLockfile, "@ravenhill/site-core")).toEqual({
            specifier: "0.1.0",
            version: "0.1.0",
        });
    });

    test("then it does not bleed into a different importer's dependencies", () => {
        expect(findRootImporterDependency(publishedLockfile, "astro")).toBeUndefined();
    });

    test("then a missing entry returns undefined", () => {
        expect(findRootImporterDependency(publishedLockfile, "@ravenhill/does-not-exist")).toBeUndefined();
    });
});

describe("given the lockfile contract for @ravenhill/site-core pinned to 0.1.0", () => {
    test("then a published root-importer resolution satisfies it", () => {
        expect(validateLockfileEntry(publishedLockfile, "@ravenhill/site-core", "0.1.0").valid).toBe(true);
    });

    test("then a workspace link resolution is rejected", () => {
        const result = validateLockfileEntry(workspaceLockfile, "@ravenhill/site-core", "0.1.0");
        expect(result.valid).toBe(false);
        expect(result.reason).toContain("link:");
    });
});
