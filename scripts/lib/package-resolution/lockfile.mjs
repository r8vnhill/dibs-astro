/**
 * Targeted, line-based extraction of one dependency entry from the root importer (`.`) block of a
 * pnpm lockfile. This intentionally avoids a full YAML parse and avoids depending on pnpm's
 * broader serialization shape: only the two fields the resolution contract actually owns
 * (`specifier`, `version`) are read from the root importer's `dependencies`/`devDependencies`
 * block for a given package name.
 */
export function findRootImporterDependency(lockfileContent, packageName) {
    const lines = lockfileContent.split(/\r?\n/);

    const rootImporterIndex = lines.findIndex((line) => line === "  .:");
    if (rootImporterIndex === -1) {
        return undefined;
    }

    let inDependenciesBlock = false;
    let inTargetEntry = false;
    const entry = {};

    for (let i = rootImporterIndex + 1; i < lines.length; i++) {
        const line = lines[i];

        if (/^ {0,2}\S/.test(line)) {
            break; // left the root importer block (next importer or top-level section)
        }

        const dependenciesHeader = /^ {4}(?:dependencies|devDependencies):$/.exec(line);
        if (dependenciesHeader) {
            inDependenciesBlock = true;
            inTargetEntry = false;
            continue;
        }

        if (inDependenciesBlock && /^ {4}\S/.test(line) && !dependenciesHeader) {
            inDependenciesBlock = false; // entered a different indent-4 section
        }

        if (!inDependenciesBlock) {
            continue;
        }

        const keyMatch = /^ {6}(?:'([^']+)'|"([^"]+)"|(\S+)):$/.exec(line);
        if (keyMatch) {
            const key = keyMatch[1] ?? keyMatch[2] ?? keyMatch[3];
            inTargetEntry = key === packageName;
            continue;
        }

        if (!inTargetEntry) {
            continue;
        }

        const specifierMatch = /^ {8}specifier:\s*(.+)$/.exec(line);
        if (specifierMatch) {
            entry.specifier = specifierMatch[1].trim();
        }

        const versionMatch = /^ {8}version:\s*(.+)$/.exec(line);
        if (versionMatch) {
            entry.version = versionMatch[1].trim();
        }
    }

    return entry.specifier || entry.version ? entry : undefined;
}

/**
 * Validates the root importer's lockfile entry for a package against an exact-version contract:
 * the specifier and resolved version must both equal the expected version, and the resolved
 * version must not be a local `link:` target.
 */
export function validateLockfileEntry(lockfileContent, packageName, exactVersion) {
    const entry = findRootImporterDependency(lockfileContent, packageName);

    if (!entry) {
        return { valid: false, reason: `no root importer dependency entry found for "${packageName}"` };
    }

    if (entry.version?.startsWith("link:")) {
        return { valid: false, reason: `resolved version is a local link ("${entry.version}"), expected "${exactVersion}"` };
    }

    if (entry.specifier !== exactVersion) {
        return { valid: false, reason: `lockfile specifier "${entry.specifier}" does not match expected "${exactVersion}"` };
    }

    if (entry.version !== exactVersion) {
        return { valid: false, reason: `lockfile resolved version "${entry.version}" does not match expected "${exactVersion}"` };
    }

    return { valid: true };
}
