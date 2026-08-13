import { describe, expect, suite, test } from "vitest";
import { estimateReadingTime, extractReadableText } from "../reading-time";

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
