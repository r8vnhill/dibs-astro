import { readFile, realpath } from "node:fs/promises";
import path from "node:path";

/**
 * Verifies the identity of an installed package on disk: its `package.json` reports the expected
 * name/version, and its canonical (symlink-resolved) path does not fall back into a forbidden
 * local workspace directory. Filesystem identity is used instead of trusting the displayed
 * dependency string, since a stale symlink can point at removed local sources while still
 * appearing to satisfy the specifier.
 */
export async function checkInstalledPackageIdentity({ cwd, packageName, expectedVersion, forbiddenLocalDir }) {
    const packageDir = path.join(cwd, "node_modules", ...packageName.split("/"));
    const manifestPath = path.join(packageDir, "package.json");

    let manifest;
    try {
        manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    } catch {
        return { valid: false, reason: `no installed package.json found at ${manifestPath}` };
    }

    if (manifest.name !== packageName) {
        return { valid: false, reason: `installed package.json name "${manifest.name}" does not match "${packageName}"` };
    }

    if (manifest.version !== expectedVersion) {
        return {
            valid: false,
            reason: `installed version "${manifest.version}" does not match expected "${expectedVersion}"`,
        };
    }

    if (forbiddenLocalDir) {
        const [canonicalPackageDir, canonicalForbiddenDir] = await Promise.all([
            realpath(packageDir),
            realpath(path.join(cwd, forbiddenLocalDir)).catch(() => undefined),
        ]);

        if (canonicalForbiddenDir) {
            const relative = path.relative(canonicalForbiddenDir, canonicalPackageDir);
            const isInsideForbiddenDir = relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));

            if (isInsideForbiddenDir) {
                return {
                    valid: false,
                    reason: `installed package resolves back into local directory "${forbiddenLocalDir}"`,
                };
            }
        }
    }

    return { valid: true };
}
