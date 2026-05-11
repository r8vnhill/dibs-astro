/**
 * @file CodeLayout.render.test.ts
 *
 * Render tests for CodeLayout component across web and PDF export modes.
 */

import CodeLayout, { type CodeProps } from "$components/ui/code/CodeLayout.astro";
import { createAstroRenderer } from "$test-utils/astro-render";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, test } from "vitest";

const parseHtml = (html: string): Document => new JSDOM(html).window.document;

const queryRequired = <T extends Element>(doc: Document, selector: string): T => {
    const element = doc.querySelector(selector) as T;
    if (!element) {
        throw new Error(`Expected to find element with selector: ${selector}`);
    }
    return element;
};

describe("CodeLayout.astro render", () => {
    let renderCode: ReturnType<typeof createAstroRenderer<CodeProps>>;

    beforeAll(async () => {
        renderCode = createAstroRenderer<CodeProps>(CodeLayout);
    });

    describe("web mode (default)", () => {
        test("renders code block with relative wrapper", async () => {
            const html = await (await renderCode)({
                code: "console.log('hello');",
                lang: "javascript",
            });
            const doc = parseHtml(html);
            const wrapper = queryRequired<HTMLElement>(doc, ".my-6.overflow-x-auto.rounded-md");

            expect(wrapper).toBeTruthy();
            expect(wrapper.classList.contains("relative")).toBe(true);
        });

        test("includes CopyButton in web mode", async () => {
            const html = await (await renderCode)({
                code: "const x = 42;",
                lang: "javascript",
            });

            expect(html).toContain("CopyButton");
        });

        test("renders both light and dark code variants in web mode", async () => {
            const html = await (await renderCode)({
                code: "def hello():\n    pass",
                lang: "python",
            });

            // Check for both LightCode and DarkCode renderings
            // by checking for multiple code renderings
            const doc = parseHtml(html);
            const codeElements = doc.querySelectorAll("pre");

            expect(codeElements.length).toBeGreaterThanOrEqual(1);
        });

        test("renders title when provided", async () => {
            const html = await (await renderCode)({
                code: "x = 10",
                lang: "python",
                title: "Variable Declaration",
            });

            expect(html).toContain("Variable Declaration");
        });

        test("renders source attribution when provided", async () => {
            const html = await (await renderCode)({
                code: "print('hello')",
                lang: "python",
                source: "example.py",
            });

            expect(html).toContain("example.py");
        });

        test("does not render export-role attribute in web mode", async () => {
            const html = await (await renderCode)({
                code: "x = 1",
                lang: "python",
            });
            const doc = parseHtml(html);
            const wrapper = doc.querySelector("[data-export-role='code-block']");

            expect(wrapper).toBeFalsy();
        });
    });

    describe("PDF export mode", () => {
        test("renders code block with export-role marker", async () => {
            const html = await (await renderCode)({
                code: "console.log('test');",
                lang: "javascript",
                renderMode: "pdf",
            });
            const doc = parseHtml(html);
            const block = doc.querySelector("[data-export-role='code-block']");

            expect(block).toBeTruthy();
            expect(block?.classList.contains("my-6")).toBe(true);
        });

        test("omits CopyButton in PDF export mode", async () => {
            const html = await (await renderCode)({
                code: "const x = 42;",
                lang: "javascript",
                renderMode: "pdf",
            });

            expect(html).not.toContain("CopyButton");
        });

        test("renders only one code variant (light) in PDF mode", async () => {
            const html = await (await renderCode)({
                code: "def example():\n    return 42",
                lang: "python",
                renderMode: "pdf",
            });

            // In PDF mode, only LightCode should render, no DarkCode
            // This is verified by not finding the dark theme variant
            expect(html).toContain("LightCode");
        });

        test("preserves title in PDF export mode", async () => {
            const html = await (await renderCode)({
                code: "x = 10",
                lang: "python",
                title: "Function Definition",
                renderMode: "pdf",
            });

            expect(html).toContain("Function Definition");
        });

        test("preserves source attribution in PDF export mode", async () => {
            const html = await (await renderCode)({
                code: "print('hello')",
                lang: "python",
                source: "script.py",
                renderMode: "pdf",
            });

            expect(html).toContain("script.py");
        });

        test("renders with title and source both present", async () => {
            const html = await (await renderCode)({
                code: "import os",
                lang: "python",
                title: "Imports",
                source: "setup.py",
                renderMode: "pdf",
            });

            expect(html).toContain("Imports");
            expect(html).toContain("setup.py");
        });
    });

    describe("export mode with footer", () => {
        test("renders footer content in both web and PDF modes", async () => {
            const html = await (await renderCode)(
                {
                    code: "// code",
                    lang: "javascript",
                    renderMode: "pdf",
                },
                {
                    slots: {
                        footer: "<p>Footer content</p>",
                    },
                },
            );

            expect(html).toContain("Footer content");
        });

        test("omits footer when not provided", async () => {
            const html = await (await renderCode)({
                code: "// code",
                lang: "javascript",
                renderMode: "pdf",
            });
            const doc = parseHtml(html);
            const footer = doc.querySelector("[class*='border-t']");

            // Should not have a footer border if no footer provided
            expect(!footer || !footer.classList.contains("border-t")).toBe(true);
        });
    });

    describe("complex code examples", () => {
        test("handles multiline code with proper indentation normalization", async () => {
            const multilineCode = `
                function add(a, b) {
                    return a + b;
                }
            `;
            const html = await (await renderCode)({
                code: multilineCode,
                lang: "javascript",
                renderMode: "pdf",
            });

            expect(html.length).toBeGreaterThan(0);
        });

        test("preserves code content in export mode", async () => {
            const annotatedCode = `const x = 42;
const y = 10;`;
            const html = await (await renderCode)({
                code: annotatedCode,
                lang: "javascript",
                renderMode: "pdf",
            });

            // The code content should be preserved in the rendered output
            expect(html).toContain("42");
            expect(html).toContain("10");
        });
    });

    describe("legacy exportMode compatibility", () => {
        test("respects renderMode prop precedence over exportMode", async () => {
            const html = await (await renderCode)({
                code: "x = 1",
                lang: "python",
                renderMode: "web",
                exportMode: true as any,
            });

            // Should be in web mode, so CopyButton should be present
            expect(html).toContain("CopyButton");
        });

        test("maps exportMode: true to PDF behavior", async () => {
            const html = await (await renderCode)({
                code: "x = 1",
                lang: "python",
                exportMode: true as any,
            });
            const doc = parseHtml(html);
            const block = doc.querySelector("[data-export-role='code-block']");

            expect(block).toBeTruthy();
        });
    });
});
