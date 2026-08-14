import { load } from "cheerio";
import fc from "fast-check";
import { describe, expect, suite, test } from "vitest";
import { estimateReadingTime, extractReadableText } from "../reading-time";

const extractReadableTextBeforeBoundaryTaxonomy = (html: string): string => {
    const $ = load(html);

    $(".exclude-from-reading-time").remove();
    $("script, style").remove();
    $("details:not([open])").each((_, element) => {
        const summary = $(element).children("summary").first();
        $(element).replaceWith(summary.length ? summary.clone() : "");
    });
    $("br").replaceWith(" ");
    $("p, li, h1, h2, h3, h4, h5, h6, pre, blockquote, summary, section, article, div").each((_, element) => {
        $(element).prepend(" ").append(" ");
    });

    return $.root().text().replace(/\s+/g, " ").trim();
};

suite("given rendered lesson HTML", () => {
    describe("when readable text is extracted", () => {
        test("then closed details contribute only their summary", () => {
            const text = extractReadableText(
                "<details><summary>Optional context</summary><p>Hidden body</p></details>",
            );

            expect(text).toBe("Optional context");
        });

        test("then open details contribute summary and body once", () => {
            const text = extractReadableText(
                "<details open><summary>Visible context</summary><p>Visible body</p></details>",
            );

            expect(text).toBe("Visible context Visible body");
        });

        test("then excluded, script, and style content is omitted", () => {
            const text = extractReadableText(
                "<p>Keep this</p><div class=\"exclude-from-reading-time\">Ignore this</div><script>Ignore script</script><style>Ignore style</style>",
            );

            expect(text).toBe("Keep this");
        });

        test("then entities and inline markup remain readable", () => {
            const text = extractReadableText("<p>API &amp; contrato</p><p>software <strong>reutilizable</strong></p>");

            expect(text).toBe("API & contrato software reutilizable");
        });

        test.each([
            ["<p>API contrato</p><p>software reusable</p>", "<p>API contrato</p>\n<p>software reusable</p>"],
            ["<p>software reusable</p>", "<p>software <strong>reusable</strong></p>"],
        ])("then equivalent markup preserves text (%s)", (compact, formatted) => {
            expect(extractReadableText(compact)).toBe(extractReadableText(formatted));
        });

        test.each([
            ["paragraphs", "<p>alpha</p><p>beta</p>"],
            ["list items", "<li>alpha</li><li>beta</li>"],
            ["headings", "<h2>alpha</h2><h3>beta</h3>"],
            ["block quotes", "<blockquote>alpha</blockquote><blockquote>beta</blockquote>"],
            ["definition terms and descriptions", "<dt>alpha</dt><dd>beta</dd>"],
            ["table captions", "<table><caption>alpha</caption></table><table><caption>beta</caption></table>"],
            ["table headers", "<table><tr><th>alpha</th><th>beta</th></tr></table>"],
            ["table cells", "<table><tr><td>alpha</td><td>beta</td></tr></table>"],
            ["figures and captions", "<figure>alpha</figure><figcaption>beta</figcaption>"],
            ["preformatted code", "<pre>alpha</pre><code>beta</code>"],
            ["sections", "<section>alpha</section><section>beta</section>"],
            ["articles", "<article>alpha</article><article>beta</article>"],
            ["line breaks", "alpha<br>beta"],
            ["main and aside regions", "<main>alpha</main><aside>beta</aside>"],
        ])("then $0 preserve lexical separation", (_name, html) => {
            expect(extractReadableText(html)).toBe("alpha beta");
        });

        test("then closed details exclude changes outside their summary", () => {
            const original = "<details><summary>alpha</summary><p>beta</p></details>";
            const changed = "<details><summary>alpha</summary><p>gamma delta epsilon</p></details>";

            expect(extractReadableText(changed)).toBe(extractReadableText(original));
        });

        test("then existing semantic fragments retain their prior readable text", () => {
            const preservationCorpus = [
                "<p>Una biblioteca reutilizable</p><p>mantiene una API.</p>",
                "<p>API <strong>estable</strong> &amp; explícita</p>",
                '<pre>public fun greet() = "hola"</pre>',
                "<details><summary>Contexto</summary><p>Oculto</p></details>",
                "<details open><summary>Contexto</summary><p>Visible</p></details>",
                "<p>Visible</p><aside class=\"exclude-from-reading-time\">No contar</aside>",
            ];

            for (const html of preservationCorpus) {
                expect(extractReadableText(html)).toBe(extractReadableTextBeforeBoundaryTaxonomy(html));
            }
        });

        test("then formatting whitespace does not change extracted text", () => {
            const formattingWhitespace = fc.array(fc.constantFrom(" ", "\t", "\n", "\r", "\u00a0"), {
                maxLength: 12,
            }).map((parts) => parts.join(""));

            fc.assert(
                fc.property(formattingWhitespace, formattingWhitespace, (before, after) => {
                    expect(extractReadableText(`<p>${before}alpha beta${after}</p>`)).toBe("alpha beta");
                }),
                { numRuns: 50 },
            );
        });

        test("then neutral inline wrappers preserve readable text", () => {
            fc.assert(
                fc.property(fc.constantFrom("em", "strong", "span", "a"), (tag) => {
                    expect(extractReadableText(`<${tag}>alpha</${tag}> <${tag}>beta</${tag}>`)).toBe("alpha beta");
                }),
                { numRuns: 50 },
            );
        });

        test("then duplicating excluded content does not change readable text", () => {
            fc.assert(
                fc.property(fc.constantFrom("alpha", "beta", "gamma"), (hidden) => {
                    const once = `<p>Visible text</p><aside class=\"exclude-from-reading-time\">${hidden}</aside>`;
                    const twice = `${once}<aside class=\"exclude-from-reading-time\">${hidden}</aside>`;

                    expect(extractReadableText(twice)).toBe(extractReadableText(once));
                }),
                { numRuns: 50 },
            );
        });
    });

    describe("when reading time is estimated", () => {
        test.each([
            ["", 1, 0],
            ["one", 1, 1],
            [Array.from({ length: 250 }, () => "word").join(" "), 1, 250],
        ])("then it preserves the default minute model", (text, minutes, words) => {
            expect(estimateReadingTime(text)).toEqual({ words, minutes });
        });

        test("then it applies the multiplier after rounding the raw estimate", () => {
            const text = Array.from({ length: 251 }, () => "word").join(" ");

            expect(estimateReadingTime(text, { timeMultiplier: 1.5 })).toEqual({ words: 251, minutes: 3 });
        });

        test("then it supports a custom words-per-minute value", () => {
            const text = Array.from({ length: 101 }, () => "word").join(" ");

            expect(estimateReadingTime(text, { wordsPerMinute: 100 })).toEqual({ words: 101, minutes: 2 });
        });
    });
});
