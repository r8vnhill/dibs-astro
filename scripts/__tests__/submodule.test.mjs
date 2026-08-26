import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, suite, test } from "vitest";

import { ASTRO_SITE_SHELL_PATH, inspectExternalSource } from "../lib/submodule.mjs";

const temporaryDirectories = [];

function git(cwd, args, options = {}) {
    return execFileSync("git", args, { cwd, encoding: "utf8", ...options }).trim();
}

async function createFixture({ packageName = "@ravenhill/astro-site-shell", manifest = true, malformed = false } = {}) {
    const root = await mkdtemp(join(tmpdir(), "dibs-submodule-"));
    temporaryDirectories.push(root);
    const source = join(root, "source");
    await mkdir(source, { recursive: true });
    git(source, ["init", "-b", "main"]);
    git(source, ["config", "user.email", "test@example.invalid"]);
    git(source, ["config", "user.name", "Test User"]);
    git(source, ["config", "commit.gpgsign", "false"]);

    if (manifest) {
        await writeFile(join(source, "package.json"), malformed ? "{\n" : JSON.stringify({ name: packageName }));
    }
    await writeFile(join(source, "README.md"), "fixture\n");
    git(source, ["add", "."]);
    git(source, ["commit", "-m", "fixture"]);
    const commit = git(source, ["rev-parse", "HEAD"]);

    git(root, ["init", "-b", "main"]);
    git(root, ["config", "user.email", "test@example.invalid"]);
    git(root, ["config", "user.name", "Test User"]);
    git(root, ["config", "commit.gpgsign", "false"]);
    await writeFile(
        join(root, ".gitmodules"),
        `[submodule "vendor/astro-site-shell"]\n\tpath = ${ASTRO_SITE_SHELL_PATH}\n\turl = https://gitlab.com/r8vnhill/astro-site-shell.git\n`,
    );
    await mkdir(join(root, "vendor"), { recursive: true });
    git(root, ["add", ".gitmodules"]);
    git(root, ["update-index", "--add", "--cacheinfo", `160000,${commit},${ASTRO_SITE_SHELL_PATH}`]);
    git(root, ["commit", "-m", "pin fixture"]);

    return { root, source, commit };
}

async function materialize(fixture, mode = "matching") {
    const checkout = join(fixture.root, ASTRO_SITE_SHELL_PATH);
    if (mode === "ordinary") {
        await mkdir(checkout, { recursive: true });
        await writeFile(join(checkout, "package.json"), JSON.stringify({ name: "@ravenhill/astro-site-shell" }));
    } else if (mode !== "absent") {
        git(fixture.root, ["clone", "--quiet", fixture.source, checkout]);
    }
}

afterEach(async () => {
    await Promise.all(
        temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
    );
});

suite("given a declared external package gitlink", () => {
    test("then an initialized checkout at the recorded commit passes", async () => {
        const fixture = await createFixture();
        await materialize(fixture);

        await expect(inspectExternalSource({ cwd: fixture.root })).resolves.toMatchObject({ findings: [] });
    });

    test.each([
        ["absent", "not initialized"],
        ["ordinary", "not initialized"],
    ])("then a %s checkout is rejected with a focused diagnostic", async (mode, expected) => {
        const fixture = await createFixture();
        await materialize(fixture, mode);

        const result = await inspectExternalSource({ cwd: fixture.root });

        expect(result.findings.join(" ")).toContain(expected);
    });

    test("then an ordinary directory without a declared gitlink is rejected", async () => {
        const fixture = await createFixture();
        git(fixture.root, ["rm", "--cached", "--ignore-unmatch", ASTRO_SITE_SHELL_PATH]);
        git(fixture.root, ["commit", "-m", "remove pin"]);
        await materialize(fixture, "ordinary");

        const result = await inspectExternalSource({ cwd: fixture.root });

        expect(result.findings.join(" ")).toContain("is not declared as a gitlink");
    });

    test("then a checkout at another commit reports both identities", async () => {
        const fixture = await createFixture();
        await writeFile(join(fixture.source, "second.txt"), "second\n");
        git(fixture.source, ["add", "."]);
        git(fixture.source, ["commit", "-m", "second fixture"]);
        const differentCommit = git(fixture.source, ["rev-parse", "HEAD"]);
        await materialize(fixture);
        git(join(fixture.root, ASTRO_SITE_SHELL_PATH), ["checkout", "--quiet", differentCommit]);

        const result = await inspectExternalSource({ cwd: fixture.root });

        expect(result.findings.join(" ")).toContain(`checked out at ${differentCommit}`);
        expect(result.findings.join(" ")).toContain(`records ${fixture.commit}`);
    });

    test("then unresolved gitlink index entries are rejected", async () => {
        const fixture = await createFixture();
        const other = await createFixture();
        git(fixture.root, ["rm", "--cached", "--ignore-unmatch", ASTRO_SITE_SHELL_PATH]);
        git(fixture.root, ["update-index", "--index-info"], {
            input:
                `160000 ${fixture.commit} 1\t${ASTRO_SITE_SHELL_PATH}\n160000 ${other.commit} 2\t${ASTRO_SITE_SHELL_PATH}\n`,
        });

        const result = await inspectExternalSource({ cwd: fixture.root });

        expect(result.findings).toContain(`${ASTRO_SITE_SHELL_PATH} gitlink has an unresolved merge state.`);
    });
});

suite("given an initialized external package checkout", () => {
    test.each([
        ["missing", { manifest: false }, "package.json is missing"],
        ["malformed", { malformed: true }, "cannot be parsed"],
        ["unexpected", { packageName: "wrong-package" }, "identifies wrong-package"],
    ])("then a %s manifest is rejected", async (_, options, expected) => {
        const fixture = await createFixture(options);
        await materialize(fixture);

        const result = await inspectExternalSource({ cwd: fixture.root });

        expect(result.findings.join(" ")).toContain(expected);
    });
});

suite("given repository topology declarations", () => {
    test("then a moving branch declaration is rejected", async () => {
        const fixture = await createFixture();
        const gitmodules = await readFile(join(fixture.root, ".gitmodules"), "utf8");
        await writeFile(join(fixture.root, ".gitmodules"), `${gitmodules}\tbranch = main\n`);
        await materialize(fixture);

        const result = await inspectExternalSource({ cwd: fixture.root });

        expect(result.findings.join(" ")).toContain("must not follow a configured submodule branch");
    });
});
