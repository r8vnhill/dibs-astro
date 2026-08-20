/**
 * Validates a `package.json` dependency specifier against an exact-version resolution contract.
 * Rejects range operators, workspace/link/file protocols, and Git URLs, since a published-package
 * contract must pin the exact release that was already validated rather than letting the package
 * manager silently widen resolution.
 */
export function validateDependencySpecifier(specifier, exactVersion) {
    if (specifier === exactVersion) {
        return { valid: true };
    }

    return {
        valid: false,
        reason: `expected exact version "${exactVersion}", got "${specifier}"`,
    };
}
