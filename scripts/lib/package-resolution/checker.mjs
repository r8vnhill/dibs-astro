import { readFile } from "node:fs/promises";
import path from "node:path";

import { checkInstalledPackageIdentity } from "./installed-identity.mjs";
import { validateLockfileEntry } from "./lockfile.mjs";
import { validateScopedRegistry } from "./registry.mjs";
import { validateDependencySpecifier } from "./specifier.mjs";

export { packageResolutionContracts } from "./contracts.mjs";
export { validateDependencySpecifier } from "./specifier.mjs";
export { validateScopedRegistry } from "./registry.mjs";
export { checkInstalledPackageIdentity } from "./installed-identity.mjs";
export { validateLockfileEntry } from "./lockfile.mjs";

function scopeOf(packageName) {
    return packageName.split("/")[0].replace(/^@/, "");
}

function findDeclaredSpecifier(packageManifest, packageName) {
    return packageManifest.dependencies?.[packageName] ?? packageManifest.devDependencies?.[packageName];
}

/**
 * Runs one package's resolution contract against the repository state and returns a findings
 * list (empty when the contract is satisfied). The registry check always applies, since it is
 * scope-level; the specifier/installed-identity/lockfile checks only apply when the contract pins
 * an exact version, since that is what makes those checks meaningful.
 */
export async function checkPackageResolutionContract(contract, { cwd, packageManifest, npmrcContent, lockfileContent }) {
    const findings = [];
    const scope = scopeOf(contract.name);

    const registryResult = validateScopedRegistry(npmrcContent, scope, contract.registryProject);
    if (!registryResult.valid) {
        findings.push({ package: contract.name, check: "registry", reason: registryResult.reason });
    }

    if (contract.exactVersion) {
        const specifier = findDeclaredSpecifier(packageManifest, contract.name);
        if (specifier === undefined) {
            findings.push({ package: contract.name, check: "specifier", reason: "no dependency entry found in package.json" });
        } else {
            const specifierResult = validateDependencySpecifier(specifier, contract.exactVersion);
            if (!specifierResult.valid) {
                findings.push({ package: contract.name, check: "specifier", reason: specifierResult.reason });
            }
        }

        const identityResult = await checkInstalledPackageIdentity({
            cwd,
            packageName: contract.name,
            expectedVersion: contract.exactVersion,
            forbiddenLocalDir: contract.forbiddenLocalDir,
        });
        if (!identityResult.valid) {
            findings.push({ package: contract.name, check: "installed-identity", reason: identityResult.reason });
        }

        const lockfileResult = validateLockfileEntry(lockfileContent, contract.name, contract.exactVersion);
        if (!lockfileResult.valid) {
            findings.push({ package: contract.name, check: "lockfile", reason: lockfileResult.reason });
        }
    }

    return findings;
}

function formatFindings(findings) {
    if (findings.length === 0) {
        return "All package resolution contracts passed.";
    }

    return findings
        .map((finding) => `Package resolution finding: ${finding.package} [${finding.check}]\n  ${finding.reason}`)
        .join("\n\n");
}

export async function runPackageResolutionCheck(options = {}) {
    const cwd = options.cwd ?? process.cwd();
    const contracts = options.contracts ?? (await import("./contracts.mjs")).packageResolutionContracts;

    const [packageManifest, npmrcContent, lockfileContent] = await Promise.all([
        readFile(path.join(cwd, "package.json"), "utf8").then(JSON.parse),
        readFile(path.join(cwd, ".npmrc"), "utf8"),
        readFile(path.join(cwd, "pnpm-lock.yaml"), "utf8"),
    ]);

    const findings = [];
    for (const contract of contracts) {
        findings.push(...await checkPackageResolutionContract(contract, { cwd, packageManifest, npmrcContent, lockfileContent }));
    }

    return {
        findings,
        output: formatFindings(findings),
        exitCode: findings.length > 0 ? 1 : 0,
    };
}
