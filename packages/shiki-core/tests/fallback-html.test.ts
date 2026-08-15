import fc from "fast-check";
import { expect, suite, test } from "vitest";
import { escapeHtmlAttribute, escapeHtmlText, renderFallbackCodeHtml } from "../src/fallback/html";

function extractRenderedCodeText(html: string): string {
    const match = html.match(/<code(?: class="[^"]*")?>([\s\S]*)<\/code>/u);
    return match?.[1] ?? "";
}

function extractPreClass(html: string): string {
    const match = html.match(/<pre class="([^"]*)">/u);
    return match?.[1] ?? "";
}

function extractCodeClass(html: string): string | undefined {
    const match = html.match(/<code(?: class="([^"]*)")?>/u);
    return match?.[1];
}

/**
 * Contract tests for fallback HTML rendering.
 */
suite("given fallback HTML rendering", () => {
    test.each([
        ["ampersand", "Kaiser & Alliance", "Kaiser &amp; Alliance"],
        ["less-than", "level < master", "level &lt; master"],
        ["greater-than", "master > disciple", "master &gt; disciple"],
        ["quote", "\"Black Origin\"", "\"Black Origin\""],
        ["apostrophe", "Goomoonryong's technique", "Goomoonryong's technique"],
    ])("then escapeHtmlText escapes code text in HTML text context: %s", (_, input, expected) => {
        expect(escapeHtmlText(input)).toBe(expected);
    });

    test.each([
        ["quote", "theme-\"dark\"", "theme-&quot;dark&quot;"],
        ["apostrophe", "lang-'ts'", "lang-&#39;ts&#39;"],
        ["ampersand", "a&b", "a&amp;b"],
        ["less-than", "a<b", "a&lt;b"],
        ["greater-than", "a>b", "a&gt;b"],
    ])("then escapeHtmlAttribute escapes class attributes in HTML attribute context: %s", (_, input, expected) => {
        expect(escapeHtmlAttribute(input)).toBe(expected);
    });

    test("then renderFallbackCodeHtml renders escaped code inside a Shiki-compatible fallback wrapper", () => {
        const html = renderFallbackCodeHtml("<script>const name = 'Shi-Woon';</script>");

        expect(html).toBe(
            "<pre class=\"shiki\"><code>"
                + "&lt;script&gt;const name = 'Shi-Woon';&lt;/script&gt;"
                + "</code></pre>",
        );
    });

    test("then renderFallbackCodeHtml preserves the shiki class on the pre element", () => {
        const html = renderFallbackCodeHtml("const alliance = 'Seoul Alliance';");

        expect(html).toContain("<pre class=\"shiki\">");
    });

    test("then renderFallbackCodeHtml renders provided pre and code classes", () => {
        const html = renderFallbackCodeHtml(
            "return Chun-Woo;",
            ["my-pre-class", "theme-\"dark\""],
            ["lang-python", "lang-'py'"],
        );

        expect(html).toContain("class=\"shiki my-pre-class theme-&quot;dark&quot;\"");
        expect(html).toContain("class=\"lang-python lang-&#39;py&#39;\"");
    });

    test.each([
        {
            name: "single token",
            input: ["rounded"],
            expected: "rounded",
        },
        {
            name: "multiple tokens in one string",
            input: ["rounded shadow"],
            expected: "rounded shadow",
        },
        {
            name: "extra whitespace",
            input: ["  rounded   shadow  "],
            expected: "rounded shadow",
        },
        {
            name: "empty tokens",
            input: ["", "   ", "bordered"],
            expected: "bordered",
        },
        {
            name: "attribute-sensitive token",
            input: ["theme-\"dark\""],
            expected: "theme-&quot;dark&quot;",
        },
    ])("then renderFallbackCodeHtml normalizes fallback class tokens: $name", ({ input, expected }) => {
        const html = renderFallbackCodeHtml("const style = 'defensive';", input, input);

        expect(html).toContain(`<pre class="shiki ${expected}">`);
        expect(html).toContain(`<code class="${expected}">`);
    });

    test("then renderFallbackCodeHtml omits the code class attribute when no code classes are provided", () => {
        const html = renderFallbackCodeHtml("const name = 'Shi-Woon';");

        expect(html).toContain("<code>");
        expect(html).not.toContain("<code class=\"\">");
    });

    test("then renderFallbackCodeHtml renders the code class attribute when code classes are provided", () => {
        const html = renderFallbackCodeHtml("const name = 'Shi-Woon';", [], ["language-ts"]);

        expect(html).toContain("<code class=\"language-ts\">");
    });

    test("then renderFallbackCodeHtml preserves empty code and trailing newlines", () => {
        expect(renderFallbackCodeHtml("", [], [])).toBe("<pre class=\"shiki\"><code></code></pre>");
        expect(renderFallbackCodeHtml("line1\n", [], [])).toContain("line1\n");
    });

    test("then rendered code text never contains raw angle brackets", () => {
        fc.assert(
            fc.property(fc.string(), (code) => {
                const codeText = extractRenderedCodeText(renderFallbackCodeHtml(code));

                expect(codeText).not.toContain("<");
                expect(codeText).not.toContain(">");
            }),
        );
    });

    test("then rendered code text never contains raw ampersands", () => {
        fc.assert(
            fc.property(fc.string(), (code) => {
                const codeText = extractRenderedCodeText(renderFallbackCodeHtml(code));

                expect(codeText).not.toMatch(/&(?!amp;|lt;|gt;)/u);
            }),
        );
    });

    test("then escaped attribute values never contain raw markup-sensitive characters", () => {
        fc.assert(
            fc.property(fc.string(), (value) => {
                const escaped = escapeHtmlAttribute(value);

                expect(escaped).not.toMatch(/[<>"']/u);
                expect(escaped).not.toMatch(/&(?!amp;|lt;|gt;|quot;|#39;)/u);
            }),
        );
    });

    test("then normalized class output never contains repeated whitespace", () => {
        fc.assert(
            fc.property(fc.array(fc.string(), { maxLength: 8 }), (classes) => {
                const html = renderFallbackCodeHtml("code", classes, classes);
                const classAttributes = [extractPreClass(html), extractCodeClass(html)].filter(
                    (value): value is string => value !== undefined,
                );

                for (const classAttribute of classAttributes) {
                    expect(classAttribute).toBe(classAttribute.trim());
                    expect(classAttribute).not.toMatch(/\s{2,}/u);
                }
            }),
        );
    });
});
