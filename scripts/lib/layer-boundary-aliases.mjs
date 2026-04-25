import { getTsconfig } from "get-tsconfig";

export const fallbackAliases = {
    "~": "src",
    "$domain": "src/domain",
    "$application": "src/application",
    "$infrastructure": "src/infrastructure",
    "$presentation": "src/presentation",
    "$utils": "src/utils",
};

function stripWildcard(value) {
    return value.replace(/\/\*$/, "").replace(/^\.\//, "");
}

export function aliasesFromTsconfig(tsconfig) {
    const paths = tsconfig?.config?.compilerOptions?.paths ?? {};
    const aliases = {};

    for (const [aliasPattern, targets] of Object.entries(paths)) {
        const [firstTarget] = targets;
        if (!firstTarget) {
            continue;
        }

        aliases[stripWildcard(aliasPattern)] = stripWildcard(firstTarget);
    }

    return { ...fallbackAliases, ...aliases };
}

export function loadAliasMappings(options = {}) {
    if (options.aliases) {
        return { ...fallbackAliases, ...options.aliases };
    }

    if (options.tsconfig) {
        return aliasesFromTsconfig(options.tsconfig);
    }

    const tsconfig = getTsconfig(options.cwd ?? process.cwd());
    return aliasesFromTsconfig(tsconfig);
}
