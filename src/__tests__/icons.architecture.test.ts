import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { suite, test, expect } from "vitest";

suite("given the extracted astro-icons ownership boundary", () => {
    test("then the site keeps only the registry package and local language assets", () => {
        const facade = readFileSync(resolve("src/icons.ts"), "utf8");

        expect(facade).toContain('"@ravenhill/astro-icons"');
        expect(facade).toContain("./assets/icons/languages/");
        expect(facade).not.toContain("packages/astro-icons");
        expect(existsSync(resolve("packages/astro-icons/package.json"))).toBe(false);
    });
});
