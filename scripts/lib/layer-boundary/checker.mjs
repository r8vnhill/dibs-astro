export { discoverSourceFiles } from "./files.mjs";
export { extractImports } from "./imports.mjs";
export { evaluateBoundaryRules } from "./rule-evaluation.mjs";
export { resolveImportTarget } from "./paths.mjs";

import { discoverSourceFiles } from "./files.mjs";
import { extractImports } from "./imports.mjs";
import { evaluateBoundaryRules } from "./rule-evaluation.mjs";
import { resolveImportTarget } from "./paths.mjs";
import { initialBoundaryRules } from "./rules.mjs";

export async function checkLayerBoundaries(files, options = {}) {
    const rules = options.rules ?? initialBoundaryRules;
    const exceptions = options.exceptions;
    const findings = [];

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
                findings.push(result.violation);
            }
        }
    }

    return findings.sort(compareBoundaryFindings);
}

function compareBoundaryFindings(left, right) {
    return left.sourceFile.localeCompare(right.sourceFile)
        || left.importTarget.localeCompare(right.importTarget)
        || left.ruleId.localeCompare(right.ruleId);
}

export function formatBoundaryFindings(findings) {
    if (findings.length === 0) {
        return "No layer boundary findings found.";
    }

    return findings
        .map((finding) =>
            [
                `Layer boundary finding: ${finding.ruleId}`,
                "",
                "Source:",
                `  ${finding.sourceFile}`,
                "",
                "Import:",
                `  ${finding.importTarget}`,
                ...(finding.resolvedTarget
                    ? ["", "Resolved target:", `  ${finding.resolvedTarget}`]
                    : []),
                "",
                "Rule:",
                `  ${finding.message}`,
                "",
                "Suggested fix:",
                `  ${finding.suggestion}`,
            ].join("\n")
        )
        .join("\n\n");
}

export const formatViolations = formatBoundaryFindings;

export async function runBoundaryCheck(options = {}) {
    const files = options.files ?? await discoverSourceFiles(options);
    const findings = await checkLayerBoundaries(files, options);

    return {
        files,
        findings,
        violations: findings,
        output: formatBoundaryFindings(findings),
        exitCode: findings.length > 0 ? 1 : 0,
    };
}
