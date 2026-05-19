import path from "node:path";
import { loadAliasMappings } from "./aliases.mjs";

const packageScopePattern = /^@[^/]+\/[^/]+/;

export function normalizeProjectPath(inputPath) {
    return path.posix
        .normalize(inputPath.replaceAll("\\", "/").replace(/^\.\//, ""))
        .replace(/\/$/, "");
}

function packageNameFor(importTarget) {
    if (importTarget.startsWith("@")) {
        return importTarget.match(packageScopePattern)?.[0] ?? importTarget;
    }

    return importTarget.split("/")[0];
}

function resolveAlias(importTarget, aliases) {
    const orderedAliases = Object.entries(aliases).sort(
        ([left], [right]) => right.length - left.length,
    );

    for (const [alias, target] of orderedAliases) {
        if (importTarget === alias || importTarget.startsWith(`${alias}/`)) {
            return normalizeProjectPath(`${target}${importTarget.slice(alias.length)}`);
        }
    }

    return undefined;
}

export function resolveImportTarget(importTarget, sourceFile, options = {}) {
    const normalizedSource = normalizeProjectPath(sourceFile);
    const aliases = loadAliasMappings(options);
    const aliasPath = resolveAlias(importTarget, aliases);

    if (aliasPath) {
        return {
            original: importTarget,
            resolvedPath: aliasPath,
            isRelative: false,
            isAlias: true,
            isPackage: false,
            isResolvable: true,
        };
    }

    if (importTarget.startsWith(".")) {
        const sourceDirectory = path.posix.dirname(normalizedSource);
        return {
            original: importTarget,
            resolvedPath: normalizeProjectPath(path.posix.join(sourceDirectory, importTarget)),
            isRelative: true,
            isAlias: false,
            isPackage: false,
            isResolvable: true,
        };
    }

    if (importTarget.startsWith("src/")) {
        return {
            original: importTarget,
            resolvedPath: normalizeProjectPath(importTarget),
            isRelative: false,
            isAlias: false,
            isPackage: false,
            isResolvable: true,
        };
    }

    return {
        original: importTarget,
        packageName: packageNameFor(importTarget),
        isRelative: false,
        isAlias: false,
        isPackage: true,
        isResolvable: false,
    };
}
