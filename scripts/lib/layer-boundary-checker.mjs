export { discoverSourceFiles } from "./layer-boundary-files.mjs";
export { extractImports } from "./layer-boundary-imports.mjs";
export { evaluateBoundaryRules } from "./layer-boundary-rule-evaluation.mjs";
export { resolveImportTarget } from "./layer-boundary-paths.mjs";

import { discoverSourceFiles } from "./layer-boundary-files.mjs";
import { extractImports } from "./layer-boundary-imports.mjs";
import { evaluateBoundaryRules } from "./layer-boundary-rule-evaluation.mjs";
import { resolveImportTarget } from "./layer-boundary-paths.mjs";
import { initialBoundaryRules } from "./layer-boundary-rules.mjs";

export async function checkLayerBoundaries(files, options = {}) {
    const rules = options.rules ?? initialBoundaryRules;
    const exceptions = options.exceptions;
    const violations = [];

    for (const file of files) {
        const imports = await extractImports(file.text, file.path);

        for (const importRecord of imports) {
            const resolvedTarget = resolveImportTarget(importRecord.target, file.path, options);
            const result = evaluateBoundaryRules(
                file.path,
                importRecord,
                resolvedTarget,
                rules,
                exceptions,
            );

            if (result.status === "violation") {
                violations.push(result.violation);
            }
        }
    }

    return violations;
}

export function formatViolations(violations) {
    if (violations.length === 0) {
        return "No layer boundary violations found.";
    }

    return violations
        .map((violation) =>
            [
                `Layer boundary violation: ${violation.ruleId}`,
                "",
                "Source:",
                `  ${violation.sourceFile}`,
                "",
                "Import:",
                `  ${violation.importTarget}`,
                ...(violation.resolvedTarget
                    ? ["", "Resolved target:", `  ${violation.resolvedTarget}`]
                    : []),
                "",
                "Rule:",
                `  ${violation.message}`,
                "",
                "Suggested fix:",
                `  ${violation.suggestion}`,
            ].join("\n")
        )
        .join("\n\n");
}

export async function runBoundaryCheck(options = {}) {
    const files = options.files ?? await discoverSourceFiles(options);
    const violations = await checkLayerBoundaries(files, options);

    return {
        files,
        violations,
        output: formatViolations(violations),
        exitCode: violations.length > 0 ? 1 : 0,
    };
}
