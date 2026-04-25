import picomatch from "picomatch";

export const initialBoundaryRules = [
    {
        id: "domain-must-not-import-outer-layers",
        source: ["src/domain/**"],
        forbiddenTargets: [
            "src/application/**",
            "src/infrastructure/**",
            "src/presentation/**",
        ],
        forbiddenPackages: ["astro", "react", "zod"],
        message:
            "Domain code must not import application, infrastructure, presentation, or UI framework dependencies.",
        suggestion:
            "Move the dependency behind a domain contract or invert the dependency direction.",
    },
    {
        id: "ui-must-not-import-infrastructure",
        source: [
            "src/components/**",
            "src/layouts/**",
            "src/pages/**",
        ],
        forbiddenTargets: ["src/infrastructure/**"],
        forbiddenPackages: [],
        message: "UI surfaces must not import infrastructure directly.",
        suggestion: "Expose this use case through src/presentation/adapters.",
    },
];

function matchesAny(patterns, value) {
    return picomatch(patterns)(value);
}

export function evaluateBoundaryRules(
    sourceFile,
    importRecord,
    resolvedTarget,
    rules = initialBoundaryRules,
) {
    return rules
        .filter((rule) => matchesAny(rule.source, sourceFile))
        .filter((rule) => {
            const targetViolation = resolvedTarget.resolvedPath
                ? matchesAny(rule.forbiddenTargets, resolvedTarget.resolvedPath)
                : false;
            const packageViolation = resolvedTarget.packageName
                ? rule.forbiddenPackages.includes(resolvedTarget.packageName)
                : false;

            return targetViolation || packageViolation;
        })
        .map((rule) => ({
            sourceFile,
            importTarget: importRecord.target,
            ...(resolvedTarget.resolvedPath ? { resolvedTarget: resolvedTarget.resolvedPath } : {}),
            ruleId: rule.id,
            message: rule.message,
            suggestion: rule.suggestion,
        }));
}
