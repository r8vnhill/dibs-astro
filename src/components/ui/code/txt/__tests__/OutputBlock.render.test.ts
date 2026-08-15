/**
 * @file OutputBlock.render.test.ts
 *
 * Component-level render tests for `OutputBlock`'s `variant` contract:
 * - `variant="default"` (the implicit, pre-existing behavior) must stay byte-for-byte what every
 *   other caller of `OutputBlock` across the site already relies on.
 * - `variant="error"` must add an icon, a textual category label, and a restrained semantic
 *   accent on the border/title bar only, without touching the code body, its background, or the
 *   raw diagnostic text.
 *
 * Rendered through `OutputBlockHarness.astro`, which passes slot content as literal JSX children
 * rather than through the Astro Container's top-level `slots` option — see that file for why.
 */

import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, test } from "vitest";
import { createAstroRenderer } from "../../../../../test-utils/astro-render";
import OutputBlockHarness from "./OutputBlockHarness.astro";

type HarnessProps = {
    code: string;
    title?: string;
    variant?: "default" | "error";
    label?: string;
    titleText?: string;
    footerText?: string;
};

let renderHarness: Awaited<ReturnType<typeof createAstroRenderer<HarnessProps>>>;

function parseHtml(html: string): Document {
    return new JSDOM(html).window.document;
}

const DIAGNOSTIC_TEXT = `Error: nu::parser::input_type_mismatch

  × Command does not support string input.
  ╭─[entry #1:1:1]
1 │ "Powerslave" | album-title
  ·                ─────┬─────
  ·                     ╰── command doesn't support string input
  ╰────`;

describe("OutputBlock.astro render", () => {
    beforeAll(async () => {
        renderHarness = await createAstroRenderer<HarnessProps>(OutputBlockHarness);
    });

    describe("given no variant (default output)", () => {
        test("then it renders the title, code, and copy control as before", async () => {
            const html = await renderHarness({ code: "Powerslave", titleText: "Resultado" });
            const doc = parseHtml(html);

            expect(doc.body.textContent).toContain("Resultado");
            expect(doc.querySelector("pre")).not.toBeNull();
            expect(html).toContain("CopyButton");
        });

        test("then it keeps the existing neutral background and border classes", async () => {
            const html = await renderHarness({ code: "Powerslave" });
            const doc = parseHtml(html);
            const wrapper = doc.querySelector(".border");

            expect(wrapper?.className).toContain("bg-base-200");
            expect(wrapper?.className).toContain("dark:bg-surface-700");
            expect(wrapper?.className).toContain("border-base-border/30");
        });

        test("then it renders no warning icon and no diagnostic label", async () => {
            const html = await renderHarness({ code: "Powerslave", titleText: "Resultado" });
            const doc = parseHtml(html);
            const titleBar = doc.querySelector(".border-b");

            expect(titleBar?.querySelector("svg")).toBeNull();
            expect(doc.body.textContent).not.toMatch(/error de tipo/i);
        });

        test("then it renders footer slot content as before", async () => {
            const html = await renderHarness({ code: "Powerslave", footerText: "Nota al pie" });

            expect(html).toContain("Nota al pie");
        });
    });

    describe("given variant=\"error\" (a diagnostic)", () => {
        test("then the title bar exposes the label and a warning icon", async () => {
            const html = await renderHarness({
                code: DIAGNOSTIC_TEXT,
                variant: "error",
                label: "Error de tipo",
                titleText: "Entrada de pipeline incompatible",
            });
            const doc = parseHtml(html);
            const titleBar = doc.querySelector(".border-b");

            expect(doc.body.textContent).toContain("Error de tipo");
            expect(doc.body.textContent).toContain("Entrada de pipeline incompatible");
            expect(titleBar?.querySelector("svg")).not.toBeNull();
        });

        test("then the block uses the semantic error accent on the border and title text", async () => {
            const html = await renderHarness({ code: DIAGNOSTIC_TEXT, variant: "error", label: "Error de tipo" });
            const doc = parseHtml(html);
            const wrapper = doc.querySelector(".border");
            const titleBar = doc.querySelector(".border-b");

            expect(wrapper?.className).toContain("border-[#e53e3e]/70");
            expect(wrapper?.className).toContain("dark:border-[#f87171]/70");
            expect(titleBar?.className).toContain("text-[#c53030]");
            expect(titleBar?.className).toContain("dark:text-[#fca5a5]");
        });

        test("then the diagnostic body keeps the same neutral background as default output", async () => {
            const html = await renderHarness({ code: DIAGNOSTIC_TEXT, variant: "error", label: "Error de tipo" });
            const doc = parseHtml(html);
            const wrapper = doc.querySelector(".border");

            expect(wrapper?.className).toContain("bg-base-200");
            expect(wrapper?.className).toContain("dark:bg-surface-700");
        });

        test("then it preserves the raw diagnostic text exactly, with the label kept outside the terminal content", async () => {
            const html = await renderHarness({ code: DIAGNOSTIC_TEXT, variant: "error", label: "Error de tipo" });
            const doc = parseHtml(html);
            const pre = doc.querySelector("pre");

            expect(pre?.textContent).toContain("nu::parser::input_type_mismatch");
            expect(pre?.textContent).toContain("command doesn't support string input");
            expect(pre?.textContent).not.toContain("Error de tipo");
        });

        test("then copy behavior is still available", async () => {
            const html = await renderHarness({ code: DIAGNOSTIC_TEXT, variant: "error", label: "Error de tipo" });

            expect(html).toContain("CopyButton");
        });
    });

    describe("default vs. error variant, compared", () => {
        test("then only the semantic presentation differs, not the background or code handling", async () => {
            const defaultHtml = await renderHarness({ code: "Powerslave" });
            const errorHtml = await renderHarness({ code: "Powerslave", variant: "error", label: "Error de tipo" });
            const defaultWrapper = parseHtml(defaultHtml).querySelector(".border");
            const errorWrapper = parseHtml(errorHtml).querySelector(".border");

            expect(defaultWrapper?.className).toContain("bg-base-200");
            expect(errorWrapper?.className).toContain("bg-base-200");
            expect(defaultWrapper?.className).not.toContain("border-[#e53e3e]/70");
            expect(errorWrapper?.className).toContain("border-[#e53e3e]/70");
            expect(defaultHtml).toContain("CopyButton");
            expect(errorHtml).toContain("CopyButton");
        });
    });
});
