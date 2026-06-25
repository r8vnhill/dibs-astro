import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { toPascalCase } from "../lib/icon-name.mjs";

describe("toPascalCase", () => {
    it("preserves the export name of a simple lowercase icon name", () => {
        assert.equal(toPascalCase("powershell.svg"), "Powershell");
    });

    it("capitalizes each segment of a hyphenated icon name", () => {
        assert.equal(toPascalCase("nushell-logo.svg"), "NushellLogo");
    });

    it("exercises the generic hyphen rule with a synthetic name", () => {
        assert.equal(toPascalCase("going-merry.svg"), "GoingMerry");
    });

    const cases = [
        ["acorn.svg", "Acorn"],
        ["file-csv.svg", "FileCsv"],
        ["nushell-logo.svg", "NushellLogo"],
        ["powershell.svg", "Powershell"],
    ];

    for (const [input, expected] of cases) {
        it(`produces the name already emitted by index.ts for ${input}`, () => {
            assert.equal(toPascalCase(input), expected);
        });
    }
});
