import {
    classifyImport,
    classifySourcePath,
} from "./classification.mjs";
import { normalizeProjectPath } from "./paths.mjs";
import {
    allowedExceptions,
    initialBoundaryRules,
    rootOnlyWorkspacePackages,
} from "./rules.mjs";

function importPathFrom(importRecord) {
    return importRecord.importPath ?? importRecord.target;
}

function findRuleForSource(sourceLayer, rules) {
    return rules.find((rule) => rule.source === sourceLayer);
}

function exceptionImportTarget(classifiedImport) {
    return classifiedImport.resolvedPath ?? classifiedImport.importPath;
}

function matchesException(sourcePath, classifiedImport, exceptions) {
    const normalizedSource = normalizeProjectPath(sourcePath);
    const importTarget = exceptionImportTarget(classifiedImport);

    return exceptions.find((exception) =>
        exception.sourcePath === normalizedSource && exception.importTarget === importTarget
    );
}

function isForbiddenPackage(rule, classifiedImport) {
    return Boolean(
        classifiedImport.packageName && rule.forbiddenPackages.includes(classifiedImport.packageName),
    );
}

/**
 * Checks a rule's package allowlist, when one is declared.
 *
 * `allowedPackages === undefined` preserves denylist-only behavior (allow unless forbidden). A declared array, even
 * an empty one, means only listed bare packages may be imported at all — used by reusable packages that must stay
 * dependency-free.
 */
function isPackageNotAllowed(rule, classifiedImport) {
    if (rule.allowedPackages === undefined || !classifiedImport.packageName) {
        return false;
    }

    return !rule.allowedPackages.includes(classifiedImport.packageName);
}

function isForbiddenTarget(rule, classifiedImport) {
    return rule.forbiddenTargets.includes(classifiedImport.target);
}

function isNotAllowedTarget(rule, classifiedImport) {
    if (classifiedImport.target === "unknown" || classifiedImport.target === "external-package") {
        return false;
    }

    return Boolean(
        rule.allowedTargets && !rule.allowedTargets.includes(classifiedImport.target),
    );
}

/**
 * Finds a root-only workspace package whose subpath was imported directly, if any.
 *
 * Data-driven replacement for a per-package "isForbiddenXSubpath" function: adding a new reusable package to
 * `rootOnlyWorkspacePackages` extends this check without touching the evaluator.
 */
function forbiddenWorkspacePackageSubpath(classifiedImport, registry) {
    return registry.find((entry) =>
        classifiedImport.packageName === entry.packageName && classifiedImport.importPath !== entry.packageName
    );
}

function toViolation(importRecord, classifiedSource, classifiedImport, rule, reason) {
    return {
        status: "violation",
        violation: {
            sourceFile: classifiedSource.path,
            importTarget: importPathFrom(importRecord),
            ...(classifiedImport.resolvedPath ? { resolvedTarget: classifiedImport.resolvedPath } : {}),
            ruleId: rule.id,
            message: rule.message,
            suggestion: rule.suggestion,
            importKind: classifiedImport.importKind,
            ...(classifiedImport.packageName ? { packageName: classifiedImport.packageName } : {}),
            sourceLayer: classifiedSource.layer,
            target: classifiedImport.target,
            reason,
        },
    };
}

export function evaluateBoundaryRules(
    sourceFile,
    importRecord,
    resolvedTarget,
    rules = initialBoundaryRules,
    exceptions = allowedExceptions,
) {
    const classifiedSource = classifySourcePath(sourceFile);

    if (classifiedSource.layer === "unknown") {
        return { status: "allowed" };
    }

    const rule = findRuleForSource(classifiedSource.layer, rules);

    if (!rule) {
        return { status: "allowed" };
    }

    const classifiedImport = classifyImport(importRecord, resolvedTarget?.resolvedPath);
    const matchingException = matchesException(sourceFile, classifiedImport, exceptions);

    if (matchingException) {
        return {
            status: "skipped-by-exception",
            exception: matchingException,
        };
    }

    if (isForbiddenPackage(rule, classifiedImport)) {
        return toViolation(
            importRecord,
            classifiedSource,
            classifiedImport,
            rule,
            "forbidden-package",
        );
    }

    if (isPackageNotAllowed(rule, classifiedImport)) {
        return toViolation(
            importRecord,
            classifiedSource,
            classifiedImport,
            rule,
            "package-not-allowed",
        );
    }

    const workspaceSubpathEntry = forbiddenWorkspacePackageSubpath(classifiedImport, rootOnlyWorkspacePackages);

    if (workspaceSubpathEntry) {
        return toViolation(
            importRecord,
            classifiedSource,
            classifiedImport,
            workspaceSubpathEntry,
            "forbidden-package-subpath",
        );
    }

    if (isForbiddenTarget(rule, classifiedImport)) {
        return toViolation(
            importRecord,
            classifiedSource,
            classifiedImport,
            rule,
            "forbidden-target",
        );
    }

    if (isNotAllowedTarget(rule, classifiedImport)) {
        return toViolation(
            importRecord,
            classifiedSource,
            classifiedImport,
            rule,
            "not-allowed-target",
        );
    }

    return { status: "allowed" };
}
