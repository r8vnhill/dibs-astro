const scopedPackagePattern = /^@[^/]+\/[^/]+/;

function assertImportPathValue(importPath, name = "import path") {
    if (typeof importPath !== "string") {
        throw new TypeError(`${name} must be a string`);
    }
}

function assertImportRecord(importRecord) {
    if (importRecord === null || typeof importRecord !== "object") {
        throw new TypeError("import record must be an object");
    }
}

export function extractImportPath(importRecord) {
    assertImportRecord(importRecord);

    const { importPath, target } = importRecord;

    if (typeof importPath === "string") {
        return importPath;
    }

    if (importPath === undefined || importPath === null) {
        if (typeof target === "string") {
            return target;
        }

        throw new TypeError("import record must include a string importPath or target");
    }

    throw new TypeError("importPath must be a string");
}

export function classifyImportKind(kind) {
    return kind === "type-import" || kind === "type-re-export" ? "type" : "value";
}

export function isRelativeImport(importPath) {
    assertImportPathValue(importPath);
    return importPath.startsWith(".");
}

export function isProjectAliasImport(importPath) {
    assertImportPathValue(importPath);
    return importPath === "~" || importPath.startsWith("~/") || /^\$[^/]*(?:\/|$)/.test(importPath);
}

export function isBarePackageImport(importPath) {
    assertImportPathValue(importPath);
    return !isRelativeImport(importPath)
        && !isProjectAliasImport(importPath)
        && !importPath.startsWith("/")
        && !importPath.startsWith("src/");
}

export function packageNameFromImportPath(importPath) {
    assertImportPathValue(importPath);

    return importPath.startsWith("@")
        ? importPath.match(scopedPackagePattern)?.[0] ?? importPath
        : importPath.split("/")[0];
}

export function classifyPackageImport(importPath) {
    const packageName = packageNameFromImportPath(importPath);

    return {
        target: "external-package",
        packageName,
    };
}

export function classifyUnresolvedImport(importPath) {
    if (isBarePackageImport(importPath)) {
        return classifyPackageImport(importPath);
    }

    return {
        target: "unknown",
    };
}

export { scopedPackagePattern };
