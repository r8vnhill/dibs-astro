import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

import {
    ASTRO_HEAD_PACKAGE,
    checkArchiveDigest,
    checkInstalledCandidateIdentity,
    loadCandidateManifest,
    parseCandidateManifest,
    resolveCandidateArchivePath,
    sha256OfFile,
} from "../lib/astro-head-candidate.mjs";

const VALID_MANIFEST = {
    schemaVersion: 1,
    package: ASTRO_HEAD_PACKAGE,
    version: "0.2.0",
    sourceCommit: "f673bac2470c04119ba9455da1c9feb954dcd943",
    archive: "ravenhill-astro-head-0.2.0.tgz",
    sha256: "f8009f6031f3ddbf2761ac40a315cad85368b366bf0d916f8b385e2fffdfc497",
    astroPeerRange: ">=7.0.0 <8",
};

let workdir;

afterEach(async () => {
    if (workdir) {
        await rm(workdir, { recursive: true, force: true });
        workdir = undefined;
    }
});

describe("given a candidate manifest's raw text", () => {
    test("then a well-formed manifest yields a normalized candidate", () => {
        const result = parseCandidateManifest(JSON.stringify(VALID_MANIFEST));

        expect(result).toEqual({
            valid: true,
            candidate: {
                package: ASTRO_HEAD_PACKAGE,
                version: "0.2.0",
                archive: "ravenhill-astro-head-0.2.0.tgz",
                sha256: VALID_MANIFEST.sha256,
                sourceCommit: VALID_MANIFEST.sourceCommit,
            },
        });
    });

    test("then an upper-case digest is normalized to lower case", () => {
        const result = parseCandidateManifest(
            JSON.stringify({ ...VALID_MANIFEST, sha256: VALID_MANIFEST.sha256.toUpperCase() }),
        );

        expect(result.valid).toBe(true);
        expect(result.candidate.sha256).toBe(VALID_MANIFEST.sha256);
    });

    test("then invalid JSON is rejected", () => {
        const result = parseCandidateManifest("{ not json");

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("not valid JSON");
    });

    test.each(["package", "version", "archive", "sha256"])("then a missing %s field is rejected", (field) => {
        const { [field]: _dropped, ...rest } = VALID_MANIFEST;
        const result = parseCandidateManifest(JSON.stringify(rest));

        expect(result.valid).toBe(false);
        expect(result.reason).toContain(field);
    });

    test("then a foreign package name is rejected", () => {
        const result = parseCandidateManifest(
            JSON.stringify({ ...VALID_MANIFEST, package: "@ravenhill/astro-site-header" }),
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain(ASTRO_HEAD_PACKAGE);
    });

    test("then a non-hex digest is rejected", () => {
        const result = parseCandidateManifest(JSON.stringify({ ...VALID_MANIFEST, sha256: "not-a-digest" }));

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("hex digest");
    });

    test.each([
        ["/etc/ravenhill-astro-head-0.2.0.tgz"],
        ["../ravenhill-astro-head-0.2.0.tgz"],
    ])("then an archive path escaping the manifest directory (%s) is rejected", (archive) => {
        const result = parseCandidateManifest(JSON.stringify({ ...VALID_MANIFEST, archive }));

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("relative name beside the manifest");
    });
});

describe("given a manifest path and its candidate", () => {
    test("then the archive resolves next to the manifest", () => {
        const resolved = resolveCandidateArchivePath(
            path.join("E:", "release", "package-manifest.json"),
            { archive: "ravenhill-astro-head-0.2.0.tgz" },
        );

        expect(resolved).toBe(path.resolve(path.join("E:", "release", "ravenhill-astro-head-0.2.0.tgz")));
    });
});

describe("given an archive on disk", () => {
    test("then its digest can be recomputed and matched against the manifest", async () => {
        workdir = await mkdtemp(path.join(os.tmpdir(), "astro-head-candidate-"));
        const archivePath = path.join(workdir, "candidate.tgz");
        await writeFile(archivePath, "kaleido-stage-archive-bytes");

        const actual = await sha256OfFile(archivePath);

        expect(checkArchiveDigest({ expected: actual, actual, archivePath })).toEqual({ valid: true });
        expect(checkArchiveDigest({ expected: VALID_MANIFEST.sha256, actual, archivePath }).valid).toBe(false);
    });
});

describe("given an installed package.json and a candidate", () => {
    const candidate = { package: ASTRO_HEAD_PACKAGE, version: "0.2.0" };

    test("then a matching name and version is accepted", () => {
        expect(
            checkInstalledCandidateIdentity({
                installed: { name: ASTRO_HEAD_PACKAGE, version: "0.2.0" },
                candidate,
            }),
        ).toEqual({ valid: true });
    });

    test("then a version mismatch is rejected and names the installed version", () => {
        const result = checkInstalledCandidateIdentity({
            installed: { name: ASTRO_HEAD_PACKAGE, version: "0.1.0" },
            candidate,
        });

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("0.1.0");
    });

    test("then a name mismatch is rejected", () => {
        const result = checkInstalledCandidateIdentity({
            installed: { name: "@ravenhill/astro-site-header", version: "0.2.0" },
            candidate,
        });

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("@ravenhill/astro-site-header");
    });
});

describe("given a candidate manifest on disk", () => {
    test("then it loads, validates, and resolves the archive path", async () => {
        workdir = await mkdtemp(path.join(os.tmpdir(), "astro-head-candidate-"));
        const manifestPath = path.join(workdir, "package-manifest.json");
        await writeFile(manifestPath, JSON.stringify(VALID_MANIFEST, null, 4));

        const result = await loadCandidateManifest(manifestPath);

        expect(result.valid).toBe(true);
        expect(result.candidate.version).toBe("0.2.0");
        expect(result.archivePath).toBe(path.join(workdir, "ravenhill-astro-head-0.2.0.tgz"));
    });

    test("then a missing manifest file is rejected", async () => {
        const result = await loadCandidateManifest(path.join(os.tmpdir(), "does-not-exist", "package-manifest.json"));

        expect(result.valid).toBe(false);
        expect(result.reason).toContain("cannot read candidate manifest");
    });
});
