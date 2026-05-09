import { describe, expect, it } from "vitest";
import { escapeCodeHtml, renderFallbackCodeHtml, buildPlainHtml } from "../src/fallback/html";

/**
 * Contract tests for fallback HTML rendering.
 *
 * These tests verify escaping, class handling, and the fallback rendering contract.
 */
describe("fallback HTML rendering", () => {
    describe("escapeCodeHtml", () => {
        it.each([
            { input: "hello", expected: "hello" },
            { input: "<div>", expected: "&lt;div&gt;" },
            { input: '&"\'', expected: "&amp;&quot;&#39;" },
            { input: "<script>alert('xss')</script>", expected: "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;" },
            { input: "", expected: "" },
            { input: "&amp;", expected: "&amp;amp;" },
        ])("escapes HTML special characters: $input", ({ input, expected }) => {
            expect(escapeCodeHtml(input)).toBe(expected);
        });

        it("escapes & before < and > to prevent double-escaping", () => {
            const input = "&<>";
            const result = escapeCodeHtml(input);
            expect(result).toBe("&amp;&lt;&gt;");
        });

        it("preserves line structure with newlines", () => {
            const input = "line1\nline2\nline3";
            const result = escapeCodeHtml(input);
            expect(result).toBe("line1\nline2\nline3");
        });
    });

    describe("renderFallbackCodeHtml", () => {
        it("renders plain HTML with pre and code elements", () => {
            const result = renderFallbackCodeHtml("hello");
            expect(result).toContain('<pre class="shiki">');
            expect(result).toContain('<code');
            expect(result).toContain("hello");
            expect(result).toContain("</code></pre>");
        });

        it("applies pre classes correctly", () => {
            const result = renderFallbackCodeHtml("code", ["my-pre-class", "another-class"], []);
            expect(result).toContain('class="shiki my-pre-class another-class"');
        });

        it("applies code classes correctly", () => {
            const result = renderFallbackCodeHtml("code", [], ["lang-python", "text-sm"]);
            expect(result).toContain('class="lang-python text-sm"');
        });

        it("escapes code content", () => {
            const result = renderFallbackCodeHtml("<script>", [], []);
            expect(result).toContain("&lt;script&gt;");
            expect(result).not.toContain("<script>");
        });

        it("handles empty code gracefully", () => {
            const result = renderFallbackCodeHtml("", [], []);
            expect(result).toContain('<pre class="shiki">');
            expect(result).toContain("<code");
            expect(result).toContain("</code>");
        });

        it("handles undefined class arrays as empty", () => {
            const result = renderFallbackCodeHtml("code");
            expect(result).toContain('class="shiki"');
        });

        it("preserves trailing newlines in escaped code", () => {
            const result = renderFallbackCodeHtml("line1\n", [], []);
            expect(result).toContain("line1\n");
        });
    });

    describe("buildPlainHtml (backwards compatibility)", () => {
        it("produces same output as renderFallbackCodeHtml", () => {
            const code = "<div>test</div>";
            const preClasses = ["p-4"];
            const codeClasses = ["text-mono"];

            const fallback = renderFallbackCodeHtml(code, preClasses, codeClasses);
            const plain = buildPlainHtml(code, preClasses, codeClasses);

            expect(plain).toBe(fallback);
        });

        it("is callable without optional parameters", () => {
            const result = buildPlainHtml("code", [], []);
            expect(result).toContain('<pre class="shiki">');
        });
    });
});
