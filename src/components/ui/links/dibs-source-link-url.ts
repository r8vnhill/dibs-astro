const migratedProjectPaths = {
    "python-companion": "dibs-course/python-companion",
    "kotlin-companion": "dibs-course/kotlin-companion",
} as const;

export type DibsSourceProjectInput = {
    repo: string;
    projectPath?: string | undefined;
};

export type GitLabSourceUrlInput = {
    projectPath: string;
    file: string;
    ref?: string | undefined;
    line?: number | undefined;
    endLine?: number | undefined;
};

export type ResolvedGitLabSourceUrl = {
    href: string;
    ref: string;
    startLine?: number | undefined;
    endLine?: number | undefined;
};

export function resolveDibsProjectPath(input: DibsSourceProjectInput): string {
    if (input.projectPath) {
        return input.projectPath;
    }

    if (isMigratedRepo(input.repo)) {
        return migratedProjectPaths[input.repo];
    }

    return `r8vnhill/dibs-${input.repo}`;
}

export function buildGitLabSourceUrl(input: GitLabSourceUrlInput): ResolvedGitLabSourceUrl {
    const resolvedRef = input.ref ?? "main";
    const { startLine, endLine } = resolveLineRange(input.line, input.endLine);
    const lineFragment = buildLineFragment(startLine, endLine);

    return {
        href: `https://gitlab.com/${input.projectPath}/-/blob/${resolvedRef}/${input.file}${lineFragment}`,
        ref: resolvedRef,
        startLine,
        endLine,
    };
}

function isMigratedRepo(repo: string): repo is keyof typeof migratedProjectPaths {
    return Object.hasOwn(migratedProjectPaths, repo);
}

function resolveLineRange(
    line: number | undefined,
    endLine: number | undefined,
): Pick<ResolvedGitLabSourceUrl, "startLine" | "endLine"> {
    const startLine = normalizeLineNumber(line);
    const rawEndLine = normalizeLineNumber(endLine);
    const resolvedEndLine = startLine !== undefined && rawEndLine !== undefined && rawEndLine >= startLine
        ? rawEndLine
        : undefined;

    return { startLine, endLine: resolvedEndLine };
}

function normalizeLineNumber(line: number | undefined): number | undefined {
    return typeof line === "number" && Number.isFinite(line)
        ? Math.max(1, Math.floor(line))
        : undefined;
}

function buildLineFragment(startLine: number | undefined, endLine: number | undefined): string {
    if (startLine === undefined) {
        return "";
    }

    return `#L${startLine}${endLine ? `-${endLine}` : ""}`;
}
