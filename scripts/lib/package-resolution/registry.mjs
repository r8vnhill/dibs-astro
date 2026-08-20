const SCOPED_REGISTRY_LINE = /^@([\w.-]+):registry=(.+)$/;
const GITLAB_PROJECT_REGISTRY = /^https:\/\/gitlab\.com\/api\/v4\/projects\/(\d+)\/packages\/npm\/$/;

/**
 * Parses `.npmrc` content into a map of scope name (without the leading `@`) to its declared
 * registry URL. Only structural `@scope:registry=` lines are recognized; this intentionally does
 * not attempt to interpret every possible npmrc directive.
 */
export function parseScopedRegistries(npmrcContent) {
    const registries = new Map();

    for (const line of npmrcContent.split(/\r?\n/)) {
        const trimmed = line.trim();
        const match = SCOPED_REGISTRY_LINE.exec(trimmed);
        if (match) {
            registries.set(match[1], match[2].trim());
        }
    }

    return registries;
}

/**
 * Structurally extracts the GitLab project id from a scoped-registry URL, rather than relying on
 * an unconstrained substring search for the project id.
 */
export function extractGitlabProjectId(registryUrl) {
    const match = GITLAB_PROJECT_REGISTRY.exec(registryUrl);
    return match ? match[1] : undefined;
}

/**
 * Validates that a scope's registry resolves to the expected canonical GitLab project.
 */
export function validateScopedRegistry(npmrcContent, scope, expectedProjectId) {
    const registries = parseScopedRegistries(npmrcContent);
    const registryUrl = registries.get(scope);

    if (!registryUrl) {
        return { valid: false, reason: `no @${scope}:registry entry found in .npmrc` };
    }

    const projectId = extractGitlabProjectId(registryUrl);
    if (!projectId) {
        return { valid: false, reason: `@${scope}:registry "${registryUrl}" is not a canonical GitLab project registry URL` };
    }

    if (projectId !== expectedProjectId) {
        return {
            valid: false,
            reason: `@${scope}:registry resolves to project ${projectId}, expected project ${expectedProjectId}`,
        };
    }

    return { valid: true };
}
