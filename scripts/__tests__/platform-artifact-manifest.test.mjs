import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, suite, test } from "vitest";

import { buildPlatformArtifactManifest } from "../lib/platform-artifact-manifest.mjs";

suite("given static Astro output", () => {
    test("then its route, heading, fragment, and island contracts are recorded semantically", async () => {
        const fixtureDir = await createFixtureDirectory();

        try {
            const manifest = await buildPlatformArtifactManifest(fixtureDir);

            expect(manifest).toEqual({
                routes: [
                    {
                        route: "/",
                        headingIds: [{ level: 1, id: "home" }],
                        localFragmentTargets: ["#home"],
                        islands: [],
                    },
                    {
                        route: "/notes/example/",
                        headingIds: [{ level: 2, id: "contract" }],
                        localFragmentTargets: ["/notes/example/#contract"],
                        islands: [{ componentUrl: "/_astro/Example.js", client: "visible" }],
                    },
                ],
            });
        } finally {
            await rm(fixtureDir, { force: true, recursive: true });
        }
    });
});

async function createFixtureDirectory() {
    const fixtureDir = path.join(os.tmpdir(), `dibs-platform-artifacts-${process.pid}`);
    await mkdir(path.join(fixtureDir, "notes", "example"), { recursive: true });
    await writeFile(path.join(fixtureDir, "index.html"), "<h1 id=\"home\">Home</h1><a href=\"#home\">Home</a>");
    await writeFile(
        path.join(fixtureDir, "notes", "example", "index.html"),
        "<h2 id=\"contract\">Contract</h2><a href=\"/notes/example/#contract\">Contract</a><astro-island component-url=\"/_astro/Example.js\" client=\"visible\"></astro-island>",
    );
    return fixtureDir;
}
