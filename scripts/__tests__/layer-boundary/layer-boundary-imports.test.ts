import { describe, expect, it, test } from "vitest";

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverSourceFiles, extractImports } from "../../lib/layer-boundary/checker.mjs";

describe("boundary checker dependencies", () => {
    it("loads the dependency-backed checker adapters in the ESM test environment", async () => {
        await expect(import("es-module-lexer")).resolves.toBeDefined();
        await expect(import("globby")).resolves.toBeDefined();
        await expect(import("picomatch")).resolves.toBeDefined();
        await expect(import("get-tsconfig")).resolves.toBeDefined();
    });
});

describe("extractImports", () => {
    test.each([
        ["static import", "import { x } from \"$domain/x\";", "$domain/x", "static-import"],
        ["type import", "import type { x } from \"$domain/x\";", "$domain/x", "type-import"],
        [
            "side-effect import",
            "import \"$domain/register\";",
            "$domain/register",
            "side-effect-import",
        ],
        ["re-export", "export { x } from \"$domain/x\";", "$domain/x", "re-export"],
        ["type re-export", "export type { x } from \"$domain/x\";", "$domain/x", "type-re-export"],
        [
            "dynamic import",
            "const module = await import(\"$domain/dynamic\");",
            "$domain/dynamic",
            "dynamic-import",
            { line: 1, column: 22 },
        ],
        [
            "inline type-only import",
            "import { type x } from \"$domain/x\";",
            "$domain/x",
            "type-import",
        ],
        [
            "mixed inline type and value import",
            "import { type X, y } from \"$domain/x\";",
            "$domain/x",
            "static-import",
        ],
    ])(
        "extracts a %s as an architectural dependency",
        async (_label, source, target, kind, location = { line: 1, column: 1 }) => {
            const [record] = await extractImports(source, "src/domain/example.ts");

            expect(record).toMatchObject({
                sourceFile: "src/domain/example.ts",
                target,
                kind,
                location,
            });
        },
    );

    it("extracts only Astro frontmatter imports", async () => {
        const source = `---
import Layout from "$presentation/adapters/layout";
import type { Lesson } from "$domain/lesson";
---
<script>
  await import("$infrastructure/not-scanned")
</script>`;

        const records = await extractImports(source, "src/layouts/Example.astro");

        expect(records.map((record) => [record.target, record.kind])).toEqual([
            ["$presentation/adapters/layout", "static-import"],
            ["$domain/lesson", "type-import"],
        ]);
    });

    it("ignores Astro template content when frontmatter is absent", async () => {
        const records = await extractImports(
            '<p>import { Adapter } from "$infrastructure/adapters/Adapter";</p>',
            "src/components/Card.astro",
        );

        expect(records).toEqual([]);
    });

    it("falls back to import extraction when TSX syntax cannot be parsed as plain ESM", async () => {
        const source = `import React from "react";
import type { Lesson } from "$domain/entities/Lesson";

export function Card() {
  return <div>{String(Boolean(React))}</div>;
}`;

        const records = await extractImports(source, "src/components/Card.tsx");

        expect(records.map((record) => [record.target, record.kind])).toEqual([
            ["react", "static-import"],
            ["$domain/entities/Lesson", "type-import"],
        ]);
    });
});

describe("discoverSourceFiles", () => {
    it("discovers TypeScript, TSX, and Astro files under src while excluding declarations", async () => {
        const cwd = await mkdtemp(join(tmpdir(), "layer-boundary-files-"));
        await mkdir(join(cwd, "src", "domain"), { recursive: true });
        await mkdir(join(cwd, "scripts"), { recursive: true });
        await writeFile(join(cwd, "src", "domain", "a.ts"), "export const a = 1;");
        await writeFile(join(cwd, "src", "domain", "b.tsx"), "export const b = <div />;");
        await writeFile(join(cwd, "src", "domain", "c.astro"), "---\nconst c = 1;\n---");
        await writeFile(join(cwd, "src", "domain", "types.d.ts"), "export type T = string;");
        await writeFile(join(cwd, "scripts", "outside.ts"), "export const outside = 1;");

        const files = await discoverSourceFiles({ cwd });

        expect(files.map((file) => file.path)).toEqual([
            "src/domain/a.ts",
            "src/domain/b.tsx",
            "src/domain/c.astro",
        ]);
    });
});
