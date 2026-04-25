import {
    classifyImport,
    classifySourcePath,
} from "./layer-boundary-classification.mjs";
import { normalizeProjectPath } from "./layer-boundary-paths.mjs";
import {
    allowedExceptions,
    initialBoundaryRules,
} from "./layer-boundary-rules.mjs";

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
