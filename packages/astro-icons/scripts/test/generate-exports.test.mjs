import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
    chunkItems,
    planExportModules,
    renderBarrelModule,
    renderExportLine,
    renderExportModule,
} from "../lib/generate-exports.mjs";

describe("renderExportLine", () => {
    test("renders a named default re-export for one icon", () => {
        assert.equal(
            renderExportLine({ exportName: "Acorn", relativePath: "../../acorn.svg" }),
            'export { default as Acorn } from "../../acorn.svg";',
        );
    });
});

describe("renderExportModule", () => {
    test("renders the generated header followed by one line per icon", () => {
        const content = renderExportModule([
            { exportName: "Acorn", relativePath: "../../acorn.svg" },
            { exportName: "Roshar", relativePath: "../../roshar.svg" },
        ]);

        assert.match(content, /^\/\/ This file is auto-generated/u);
        assert.match(content, /export \{ default as Acorn \} from "\.\.\/\.\.\/acorn\.svg";/u);
        assert.match(content, /export \{ default as Roshar \} from "\.\.\/\.\.\/roshar\.svg";/u);
        assert.ok(content.endsWith("\n"));
    });
});

describe("renderBarrelModule", () => {
    test("re-exports every shard by wildcard", () => {
        const content = renderBarrelModule([
            "./generated/internal/part-001",
            "./generated/internal/part-002",
        ]);

        assert.match(content, /export \* from "\.\/generated\/internal\/part-001";/u);
        assert.match(content, /export \* from "\.\/generated\/internal\/part-002";/u);
    });
});

describe("chunkItems", () => {
    test("splits items into fixed-size chunks, preserving order", () => {
        assert.deepEqual(chunkItems([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
    });

    test("returns no chunks for an empty input", () => {
        assert.deepEqual(chunkItems([], 2), []);
    });

    test("rejects a non-positive shard size", () => {
        assert.throws(() => chunkItems([1], 0), RangeError);
        assert.throws(() => chunkItems([1], -1), RangeError);
    });
});

describe("planExportModules", () => {
    const icons = [
        { file: "scadrial.svg", exportName: "Scadrial" },
        { file: "acorn.svg", exportName: "Acorn" },
        { file: "roshar.svg", exportName: "Roshar" },
    ];

    test("shards icons deterministically sorted by filename, regardless of input order", () => {
        const { parts } = planExportModules({
            icons,
            svgRelativePrefix: "../../",
            partDirSpecifier: "./generated/internal",
            shardSize: 2,
        });

        assert.equal(parts.length, 2);
        assert.equal(parts[0].fileName, "part-001.ts");
        assert.match(parts[0].content, /Acorn/u);
        assert.match(parts[0].content, /Roshar/u);
        assert.equal(parts[1].fileName, "part-002.ts");
        assert.match(parts[1].content, /Scadrial/u);
    });

    test("produces a barrel that references every part under the given directory specifier", () => {
        const { barrel } = planExportModules({
            icons,
            svgRelativePrefix: "../../",
            partDirSpecifier: "./generated/publishable",
            shardSize: 2,
        });

        assert.match(barrel, /export \* from "\.\/generated\/publishable\/part-001";/u);
        assert.match(barrel, /export \* from "\.\/generated\/publishable\/part-002";/u);
    });

    test("keeps shard size comfortably below the repository's generated-source line limit", () => {
        const manyIcons = Array.from({ length: 1521 }, (_, index) => ({
            file: `icon-${String(index).padStart(4, "0")}.svg`,
            exportName: `Icon${index}`,
        }));

        const { parts } = planExportModules({
            icons: manyIcons,
            svgRelativePrefix: "../../",
            partDirSpecifier: "./generated/internal",
            shardSize: 300,
        });

        for (const part of parts) {
            const lineCount = part.content.split("\n").length;
            assert.ok(lineCount < 500, `part ${part.fileName} has ${lineCount} lines`);
        }
    });

    test("re-planning identical input produces byte-identical output (no regeneration churn)", () => {
        const first = planExportModules({
            icons,
            svgRelativePrefix: "../../",
            partDirSpecifier: "./generated/internal",
            shardSize: 2,
        });
        const second = planExportModules({
            icons: [...icons].reverse(),
            svgRelativePrefix: "../../",
            partDirSpecifier: "./generated/internal",
            shardSize: 2,
        });

        assert.deepEqual(first, second);
    });
});
