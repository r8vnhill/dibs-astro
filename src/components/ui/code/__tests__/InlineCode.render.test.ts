import { beforeEach, describe, expect, test } from "vitest";
import { createAstroRenderer, type AstroRender } from "../../../../test-utils/astro-render";
import InlineCode from "../InlineCode.astro";

interface InlineCodeProps {
    code?: string;
    lang?: string;
    class?: string;
    ariaLabel?: string;
    elevate?: boolean;
}

let renderInlineCode: AstroRender<InlineCodeProps>;

describe.concurrent("InlineCode.astro render", () => {
    beforeEach(async () => {
        renderInlineCode = await createAstroRenderer<InlineCodeProps>(InlineCode);
    });

    test("applies wrapping-friendly classes in the root code element", { timeout: 20000 }, async () => {
        const html = await renderInlineCode({
            code: "$allErrs | Where-Object { ($_.FullyQualifiedErrorId -split ',')[0] -eq 'InvokeBatchFingerprint.BatchFailed' }",
            lang: "text",
        });

        const classMatch = html.match(/<code[^>]*class="([^"]+)"/);
        const className = classMatch?.[1] ?? "";

        expect(className).toContain("whitespace-normal");
        expect(className).toContain("break-words");
        expect(className).toContain("[overflow-wrap:anywhere]");
        expect(className).not.toContain("whitespace-nowrap");
    });
});
