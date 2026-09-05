import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const ASTRO_SITE_SHELL_PATH = "vendor/astro-site-shell";
export const ASTRO_SITE_SHELL_URL = "https://gitlab.com/r8vnhill/astro-site-shell.git";
export const ASTRO_SITE_SHELL_PACKAGE = "@ravenhill/astro-site-shell";

export const EXTERNAL_SOURCES = Object.freeze([
    Object.freeze({ path: ASTRO_SITE_SHELL_PATH, url: ASTRO_SITE_SHELL_URL, packageName: ASTRO_SITE_SHELL_PACKAGE }),
]);

async function runGit(args, cwd) {
    const result = await execFileAsync("git", args, { cwd, encoding: "utf8" });
    return result.stdout.trim();
}

async function tryRunGit(args, cwd) {
    try {
        return await runGit(args, cwd);
    } catch {
        return undefined;
    }
}

function parseIndexEntries(output) {
    return output
        ? output.split("\n").map((line) => {
            const [metadata, path] = line.split("\t");
            const [mode, object, stage] = metadata.split(" ");
            return { mode, object, path, stage };
        })
        : [];
}

export async function readRecordedGitlink({ cwd, path = ASTRO_SITE_SHELL_PATH } = {}) {
    const entries = parseIndexEntries(await runGit(["ls-files", "--stage", "--", path], cwd));

    if (entries.length === 0) {
        return { status: "absent", path };
    }

    if (entries.some((entry) => entry.stage !== "0")) {
        return { status: "conflicted", path, entries };
    }

    if (entries.length !== 1 || entries[0].mode !== "160000") {
        return { status: "not-gitlink", path, entries };
    }

    const indexCommit = entries[0].object;
    const committedCommit = await tryRunGit(["rev-parse", `HEAD:${path}`], cwd);

    return {
        status: "present",
        path,
        commit: /^[0-9a-f]{40}$/.test(committedCommit ?? "") ? committedCommit : indexCommit,
        indexCommit,
        committedCommit,
        entries,
    };
}

async function readSubmoduleCommit({ cwd, path }) {
    const submodulePath = join(cwd, path);

    try {
        await access(submodulePath);
    } catch {
        return { status: "uninitialized" };
    }

    const topLevel = await tryRunGit(["-C", submodulePath, "rev-parse", "--show-toplevel"], cwd);
    const commit = topLevel && await tryRunGit(["-C", submodulePath, "rev-parse", "--verify", "HEAD^{commit}"], cwd);

    return commit && resolve(isAbsolute(topLevel) ? topLevel : join(cwd, topLevel)) === resolve(submodulePath)
        ? { status: "present", commit }
        : { status: "uninitialized" };
}

async function readPackageIdentity({ cwd, path }) {
    const manifestPath = join(cwd, path, "package.json");

    let source;
    try {
        source = await readFile(manifestPath, "utf8");
    } catch (error) {
        if (error.code === "ENOENT") {
            return { status: "missing" };
        }
        return { status: "unreadable", message: error.message };
    }

    try {
        return { status: "present", manifest: JSON.parse(source) };
    } catch (error) {
        return { status: "malformed", message: error.message };
    }
}

async function readGitmodules({ cwd }) {
    const output = await tryRunGit(
        ["config", "--file", ".gitmodules", "--get-regexp", "^submodule\\..*\\.(path|url|branch)$"],
        cwd,
    );
    const entries = new Map();

    for (const line of output ? output.split("\n") : []) {
        const [key, ...valueParts] = line.split(" ");
        const match = /^submodule\.(.+)\.(path|url|branch)$/.exec(key);
        if (match) {
            const [, name, property] = match;
            const entry = entries.get(name) ?? {};
            entry[property] = valueParts.join(" ");
            entries.set(name, entry);
        }
    }

    return [...entries.values()];
}

async function hasWorkspaceRegistration({ cwd, path }) {
    try {
        const workspace = await readFile(join(cwd, "pnpm-workspace.yaml"), "utf8");
        return workspace.split(/\r?\n/).some((line) => line.trim() === `- ${path}` || line.trim() === `- ${path}/`);
    } catch {
        return false;
    }
}

export async function inspectExternalSource({
    cwd = process.cwd(),
    path = ASTRO_SITE_SHELL_PATH,
    url = ASTRO_SITE_SHELL_URL,
    packageName = ASTRO_SITE_SHELL_PACKAGE,
} = {}) {
    const findings = [];
    const gitmodules = await readGitmodules({ cwd });
    const declarations = gitmodules.filter((entry) => entry.path === path);
    const declaration = declarations[0];

    if (declarations.length === 0) {
        findings.push(`${path} is not declared in .gitmodules with its canonical path.`);
    } else if (declarations.length > 1) {
        findings.push(`${path} has multiple .gitmodules declarations; keep one canonical entry.`);
    } else if (declaration.url !== url) {
        findings.push(`${path} uses ${declaration.url ?? "no URL"}; expected ${url}.`);
    }

    if (declaration?.branch !== undefined) {
        findings.push(`${path} must not follow a configured submodule branch.`);
    }

    if (await hasWorkspaceRegistration({ cwd, path })) {
        findings.push(`${path} must remain external source, not a pnpm workspace package.`);
    }

    const gitlink = await readRecordedGitlink({ cwd, path });
    if (gitlink.status === "absent") {
        findings.push(`${path} is not declared as a gitlink; directory presence is not sufficient.`);
        return { findings, gitlink };
    }
    if (gitlink.status === "conflicted") {
        findings.push(`${path} gitlink has an unresolved merge state.`);
        return { findings, gitlink };
    }
    if (gitlink.status === "not-gitlink") {
        findings.push(`${path} is tracked, but its index entry is not a gitlink.`);
        return { findings, gitlink };
    }

    const checkout = await readSubmoduleCommit({ cwd, path });
    if (checkout.status === "uninitialized") {
        findings.push(`${path} submodule is not initialized.`);
        return { findings, gitlink, checkout };
    }
    if (checkout.commit !== gitlink.commit) {
        findings.push(`${path} is checked out at ${checkout.commit}, but DIBS records ${gitlink.commit}.`);
        return { findings, gitlink, checkout };
    }

    const identity = await readPackageIdentity({ cwd, path });
    if (identity.status === "missing") {
        findings.push(`${path}/package.json is missing.`);
    } else if (identity.status === "malformed") {
        findings.push(`${path}/package.json cannot be parsed: ${identity.message}`);
    } else if (identity.status === "unreadable") {
        findings.push(`${path}/package.json cannot be read: ${identity.message}`);
    } else if (identity.manifest.name !== packageName) {
        findings.push(
            `${path}/package.json identifies ${
                identity.manifest.name ?? "an unnamed package"
            }; expected ${packageName}.`,
        );
    }

    return { findings, gitlink, checkout, identity };
}

export async function inspectExternalSources({ cwd = process.cwd() } = {}) {
    return Promise.all(EXTERNAL_SOURCES.map((source) => inspectExternalSource({ cwd, ...source })));
}
