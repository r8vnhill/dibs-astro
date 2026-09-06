import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Pure resolution and validation for an `@ravenhill/astro-head` package candidate,
 * described by the `release/package-manifest.json` its own packaging step emits.
 *
 * Keeping this separate from the qualification script's filesystem/subprocess
 * orchestration lets the identity rules be tested without packing archives or
 * spawning package managers, and keeps release-version knowledge out of the
 * script: the candidate identity comes from the manifest, not a hard-coded string.
 */

export const ASTRO_HEAD_PACKAGE = "@ravenhill/astro-head";

const HEX_SHA256 = /^[0-9a-f]{64}$/;
const REQUIRED_STRING_FIELDS = ["package", "version", "archive", "sha256"];

/**
 * Parses a candidate manifest's raw JSON text and checks its shape.
 *
 * @returns `{ valid: true, candidate }` with a normalized candidate, or
 *   `{ valid: false, reason }` describing the first unmet expectation.
 */
export function parseCandidateManifest(raw) {
    let manifest;
    try {
        manifest = JSON.parse(raw);
    } catch (error) {
        return { valid: false, reason: `candidate manifest is not valid JSON: ${error.message}` };
    }

    if (manifest === null || typeof manifest !== "object") {
        return { valid: false, reason: "candidate manifest is not a JSON object" };
    }

    const missing = REQUIRED_STRING_FIELDS.filter(
        (field) => typeof manifest[field] !== "string" || manifest[field].length === 0,
    );
    if (missing.length > 0) {
        return { valid: false, reason: `candidate manifest is missing string fields: ${missing.join(", ")}` };
    }

    if (manifest.package !== ASTRO_HEAD_PACKAGE) {
        return {
            valid: false,
            reason: `candidate manifest package "${manifest.package}" is not "${ASTRO_HEAD_PACKAGE}"`,
        };
    }

    const sha256 = manifest.sha256.toLowerCase();
    if (!HEX_SHA256.test(sha256)) {
        return { valid: false, reason: `candidate manifest sha256 "${manifest.sha256}" is not a 64-character hex digest` };
    }

    if (path.isAbsolute(manifest.archive) || manifest.archive.split(/[\\/]/).includes("..")) {
        return {
            valid: false,
            reason: `candidate manifest archive "${manifest.archive}" must be a relative name beside the manifest`,
        };
    }

    return {
        valid: true,
        candidate: {
            package: manifest.package,
            version: manifest.version,
            archive: manifest.archive,
            sha256,
            sourceCommit: typeof manifest.sourceCommit === "string" ? manifest.sourceCommit : undefined,
        },
    };
}

/** Resolves the archive path a candidate references, relative to the manifest's own directory. */
export function resolveCandidateArchivePath(manifestPath, candidate) {
    return path.resolve(path.dirname(path.resolve(manifestPath)), candidate.archive);
}

/** Computes the lowercase hex SHA-256 of a file's bytes. */
export async function sha256OfFile(filePath) {
    const hash = createHash("sha256");
    hash.update(await readFile(filePath));
    return hash.digest("hex");
}

/**
 * Compares an archive's actual digest against the manifest's expected digest.
 *
 * @returns `{ valid: true }` or `{ valid: false, reason }`.
 */
export function checkArchiveDigest({ expected, actual, archivePath }) {
    if (actual.toLowerCase() !== expected.toLowerCase()) {
        return {
            valid: false,
            reason: `candidate archive digest mismatch for ${archivePath}: expected ${expected}, got ${actual}`,
        };
    }
    return { valid: true };
}

/**
 * Confirms an installed package's `package.json` identity agrees with the candidate manifest.
 *
 * @returns `{ valid: true }` or `{ valid: false, reason }`.
 */
export function checkInstalledCandidateIdentity({ installed, candidate }) {
    if (installed.name !== candidate.package) {
        return {
            valid: false,
            reason: `installed package name "${installed.name}" does not match candidate "${candidate.package}"`,
        };
    }
    if (installed.version !== candidate.version) {
        return {
            valid: false,
            reason: `installed version "${installed.version}" does not match candidate "${candidate.version}"`,
        };
    }
    return { valid: true };
}

/**
 * Loads a candidate manifest from disk and resolves its archive path.
 *
 * @returns `{ valid: true, manifestPath, candidate, archivePath }` or `{ valid: false, reason }`.
 */
export async function loadCandidateManifest(manifestPathInput) {
    const manifestPath = path.resolve(manifestPathInput);
    let raw;
    try {
        raw = await readFile(manifestPath, "utf8");
    } catch (error) {
        return { valid: false, reason: `cannot read candidate manifest at ${manifestPath}: ${error.message}` };
    }

    const parsed = parseCandidateManifest(raw);
    if (!parsed.valid) return parsed;

    return {
        valid: true,
        manifestPath,
        candidate: parsed.candidate,
        archivePath: resolveCandidateArchivePath(manifestPath, parsed.candidate),
    };
}
