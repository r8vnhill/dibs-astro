import { HtmlValidate } from "html-validate";
import { expect, suite, test } from "vitest";

const validator = new HtmlValidate({
    extends: ["html-validate:recommended"],
});

suite("given the paragraph content model", () => {
    test("then a paragraph with phrasing content is valid", async () => {
        const report = await validator.validateString(
            "<p id=\"powerslave-summary\">Project <strong>status</strong>.</p>",
        );

        expect(report.valid).toBe(true);
    });

    test("then a paragraph containing a list is rejected", async () => {
        const report = await validator.validateString(
            "<p>Hoy aprenderemos a:<ul><li>listar proyectos</li></ul></p>",
        );

        expect(report.valid).toBe(false);
        expect(report.results.flatMap((result) => result.messages).map((message) => message.ruleId)).toEqual(
            expect.arrayContaining(["no-implicit-close"]),
        );
    });
});
