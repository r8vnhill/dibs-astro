import {
    HTML_CORE_PACKAGE_NAME,
    HTML_CORE_VERSION,
} from "@ravenhill/html-core";
import { expect, suite, test } from "vitest";

suite("given the html-core root API", () => {
    test("then it exposes package identity values", () => {
        expect(HTML_CORE_PACKAGE_NAME).toBe("@ravenhill/html-core");
        expect(HTML_CORE_VERSION).toMatch(/^\d+\.\d+\.\d+$/u);
    });
});
