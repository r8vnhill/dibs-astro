import {
    filterManifest,
    derivePdfOutputPath,
    normalizeExportFindingKind,
    normalizeLessonRoute,
} from "@ravenhill/lesson-export-core";

export function parseCliArgs(argv, defaults = {}) {
    const selection = {
        route: undefined,
        subtree: undefined,
        all: false,
    };

    const options = {
        outDir: normalizeRelativePath(defaults.outDir ?? "dist/exports/pdf"),
        reportPath: normalizeRelativePath(defaults.reportPath ?? "dist/exports/pdf/report.json"),
        baseUrl: undefined,
        port: defaults.port ?? 4321,
        skipBuild: false,
        keepServer: false,
        findingPolicy: { failOn: [] },
        timeoutMs: defaults.timeoutMs ?? 30_000,
        dryRun: false,
        diagnostics: {
            usedDeprecatedFailOnFinding: false,
        },
    };
    const failOnKinds = [];
    let deprecatedFailOnFinding = false;

    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];

        if (!argument.startsWith("--")) {
            throw new Error(`Unexpected positional argument: ${argument}`);
        }

        const [flag, inlineValue] = argument.split("=", 2);
        const value = inlineValue ?? argv[index + 1];

        switch (flag) {
            case "--route":
                selection.route = requireValue(flag, value);
                if (inlineValue === undefined) index += 1;
                break;
            case "--subtree":
                selection.subtree = requireValue(flag, value);
                if (inlineValue === undefined) index += 1;
                break;
            case "--all":
                selection.all = true;
                break;
            case "--outDir":
                options.outDir = normalizeRelativePath(requireValue(flag, value));
                if (inlineValue === undefined) index += 1;
                break;
            case "--report":
                options.reportPath = normalizeRelativePath(requireValue(flag, value));
                if (inlineValue === undefined) index += 1;
                break;
            case "--baseUrl":
                options.baseUrl = requireValue(flag, value);
                if (inlineValue === undefined) index += 1;
                break;
            case "--port":
                options.port = parsePositiveInteger(requireValue(flag, value), flag);
                if (inlineValue === undefined) index += 1;
                break;
            case "--skip-build":
                options.skipBuild = true;
                break;
            case "--keep-server":
                options.keepServer = true;
                break;
            case "--fail-on":
                failOnKinds.push(parseFindingKind(requireValue(flag, value), flag));
                if (inlineValue === undefined) index += 1;
                break;
            case "--fail-on-finding":
                deprecatedFailOnFinding = true;
                options.diagnostics.usedDeprecatedFailOnFinding = true;
                break;
            case "--timeout":
                options.timeoutMs = parsePositiveInteger(requireValue(flag, value), flag);
                if (inlineValue === undefined) index += 1;
                break;
            case "--dry-run":
                options.dryRun = true;
                break;
            default:
                throw new Error(`Unknown flag: ${flag}`);
        }
    }

    const selectionKinds = [selection.route, selection.subtree, selection.all].filter((value) => value !== undefined && value !== false);
    if (selectionKinds.length !== 1) {
        throw new Error("Exactly one of --route, --subtree, or --all must be provided.");
    }

    if (deprecatedFailOnFinding && failOnKinds.length > 0) {
        throw new Error("--fail-on-finding cannot be combined with --fail-on.");
    }

    options.findingPolicy = {
        failOn: deprecatedFailOnFinding ? "any" : deduplicateKinds(failOnKinds),
    };

    if (selection.route !== undefined) {
        return {
            selection: { kind: "route", value: normalizeLessonRoute(selection.route) },
            ...options,
        };
    }

    if (selection.subtree !== undefined) {
        return {
            selection: { kind: "subtree", value: normalizeLessonRoute(selection.subtree) },
            ...options,
        };
    }

    return {
        selection: { kind: "all" },
        ...options,
    };
}

export function selectExportEntries(manifest, selection) {
    if (selection.kind === "all") {
        return [...manifest.entries];
    }

    const filter = selection.kind === "route"
        ? { kind: "exact-route", route: selection.value }
        : { kind: "subtree", routePrefix: selection.value };

    const filtered = filterManifest(manifest, filter);
    if (filtered.entries.length === 0) {
        throw new Error(selection.kind === "route"
            ? `No export entry found for ${selection.value}.`
            : `No export entries found under ${selection.value}.`);
    }

    return [...filtered.entries];
}

export function resolveExportTargets(entries, outDir) {
    return entries.map((entry) => ({
        entry,
        outputPath: derivePdfOutputPath(entry.route, { rootDir: outDir }),
    }));
}

function requireValue(flag, value) {
    if (value === undefined || value.startsWith("--")) {
        throw new Error(`Missing value for ${flag}.`);
    }

    return value;
}

function parsePositiveInteger(value, flag) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Invalid numeric value for ${flag}: ${value}`);
    }

    return parsed;
}

function parseFindingKind(value, flag) {
    const findingKind = normalizeExportFindingKind(value);
    if (findingKind === undefined) {
        throw new Error(`Invalid finding kind for ${flag}: ${value}`);
    }

    return findingKind;
}

function deduplicateKinds(kinds) {
    return [...new Set(kinds)];
}

function normalizeRelativePath(value) {
    const trimmed = value.trim().replaceAll("\\", "/");

    if (trimmed.length === 0) {
        throw new Error("Path value must not be empty.");
    }

    if (/^[A-Za-z]:/u.test(trimmed) || trimmed.startsWith("/") || trimmed.startsWith("..")) {
        throw new Error(`Path must be relative: ${value}`);
    }

    return trimmed.replace(/\/+$/u, "");
}
