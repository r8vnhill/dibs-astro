import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, suite, test } from "vitest";

const root = resolve(process.cwd());
const fontsRoot = join(root, "public/fonts");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(fontsRoot, "provenance.json"), "utf8"));

function sha256(path) {
    return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

suite("given the committed DIBS font artifacts", () => {
    test("then every generated asset has complete and matching provenance", () => {
        expect(manifest.schemaVersion).toBe(1);
        expect(manifest.generation.target).toBe("woff2-unhinted");

        for (const asset of manifest.assets) {
            const path = join(root, "public", asset.path);
            expect(statSync(path).isFile()).toBe(true);
            expect(asset.sha256).toBe(sha256(path));
            expect(asset.bytes).toBe(statSync(path).size);
            expect(asset.family).toEqual(expect.any(String));
            expect(asset.style).toEqual(expect.any(String));
            expect(asset.weight).toEqual(expect.any(Number));
        }

        expect(sha256(join(fontsRoot, "LICENSE.txt"))).toBe(manifest.license.sha256);
    });

    test("then no unprovenanced WOFF2 files are present", () => {
        const expected = new Set(manifest.assets.map((asset) => asset.path.replace("fonts/", "")));
        const actual = ["dibs-sans", "dibs-slab"].flatMap((directory) =>
            readdirSync(join(fontsRoot, directory))
                .filter((file) => file.endsWith(".woff2"))
                .map((file) => `${directory}/${file}`),
        );

        expect(actual.sort()).toEqual([...expected].sort());
    });

    test("then normal site workflows do not invoke font generation", () => {
        for (const scriptName of ["predev", "dev", "prebuild", "build", "predeploy", "deploy", "test"]) {
            expect(packageJson.scripts[scriptName]).not.toContain("fonts:generate");
        }
    });
});
