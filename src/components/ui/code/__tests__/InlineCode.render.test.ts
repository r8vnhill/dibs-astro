/**
 * @file InlineCode.render.test.ts
 *
 * Render-level tests for {@link InlineCode.astro}.
 *
 * These tests verify the HTML output of the component when rendered through the Astro test
 * renderer. Unlike pure unit tests (which would target extracted helpers), this suite exercises
 * the full render path:
 *
 *     props -> Astro component -> HTML string -> DOM -> assertions
 *
 * ## What is being validated?
 *
 * 1. **Structural guarantees**
 *    - A `<code>` element is rendered.
 * 2. **Styling invariants**
 *    - Wrapping-friendly Tailwind classes are always present.
 *    - Conflicting classes (e.g., `whitespace-nowrap`) are not introduced.
 *    - User-provided classes are preserved.
 * 3. **Content rendering**
 *    - The provided `code` string is rendered into the `<code>` element.
 *
 * The goal is to protect layout and readability behavior against regressions, especially long
 * inline snippets that must wrap safely.
 *
 * ## Testing Strategy
 *
 * - **Data-driven testing (DDT)**:
 *   Multiple prop combinations are tested via `test.each(...)` to ensure class invariants hold
 *   across:
 *   - `elevate` on/off
 *   - different `lang` values
 *   - empty / undefined `code`
 *   - presence / absence of custom `class`
 * - **DOM-based assertions**:
 *   The rendered HTML is parsed with JSDOM to avoid brittle string/regex matching.
 *
 * This keeps the test resilient to attribute ordering and formatting changes.
 */

import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { createAstroRenderer } from "../../../../test-utils/astro-render";
import InlineCode from "../InlineCode.astro";

/**
 * Props supported by {@link InlineCode.astro} for testing.
 *
 * This type mirrors the public component API so that:
 *
 * - Render tests remain aligned with the real component surface area.
 * - Refactors that change the public contract surface type errors in tests.
 * - Prop combinations can be exercised safely in DDT / PBT scenarios.
 *
 * All properties are optional to allow testing:
 *
 * - Default behavior (no props provided),
 * - Partial configurations,
 * - Edge cases such as empty strings or `undefined` values.
 */
type InlineCodeProps = {
    /**
     * The raw inline code string to render inside the `<code>` element.
     *
     * - When defined, its content should appear as the text content of `<code>`.
     * - When `undefined`, the component should still render safely (depending on internal defaults
     *   or slot behavior).
     */
    code?: string | undefined;

    /**
     * Language identifier used for syntax highlighting or semantic tagging.
     *
     * Examples: `"ts"`, `"sh"`, `"text"`.
     *
     * This may influence:
     *
     * - Syntax highlighting behavior,
     * - Language-specific class names,
     * - ARIA semantics (if implemented).
     *
     * Optional to allow testing fallback behavior.
     */
    lang?: string | undefined;

    /**
     * Additional CSS classes applied to the root `<code>` element.
     *
     * Used to verify:
     *
     * - Class merging behavior,
     * - Preservation of consumer-supplied classes,
     * - Non-interference with required wrapping/layout classes.
     */
    class?: string | undefined;

    /**
     * Accessible label applied to the `<code>` element when needed.
     *
     * Useful when:
     *
     * - The inline code conveys meaning beyond visible text,
     * - Screen reader clarification is required.
     *
     * Optional to allow testing both labeled and unlabeled scenarios.
     */
    ariaLabel?: string | undefined;

    /**
     * Controls elevated styling (e.g., background emphasis, borders, or visual prominence).
     *
     * Tests exercise both `true` and `false` to ensure:
     *
     * - Base layout invariants remain intact,
     * - Elevation does not break wrapping or content rendering.
     */
    elevate?: boolean | undefined;
    brackets?: boolean | undefined;
};

let render: Awaited<ReturnType<typeof createAstroRenderer<InlineCodeProps>>>;

/**
 * Renders {@link InlineCode.astro} with the given props and returns a parsed {@link Document}.
 *
 * @param props - Component props to pass to the renderer.
 * @returns A JSDOM Document representing the rendered output.
 *
 * @remarks
 * This helper:
 * 1. Creates an isolated Astro renderer instance.
 * 2. Produces the component's HTML string.
 * 3. Parses it into a DOM using JSDOM.
 *
 * Returning a `Document` instead of raw HTML:
 * - Avoids brittle regex/string assertions.
 * - Enables semantic querying (e.g., `querySelector`).
 */
async function renderInlineCode(
    props: InlineCodeProps,
    slots?: Record<string, string>,
): Promise<Document> {
    const html = await render(props, slots ? { slots } : undefined);
    return new JSDOM(html).window.document;
}

async function renderInlineCodeHtml(
    props: InlineCodeProps,
    slots?: Record<string, string>,
): Promise<string> {
    return render(props, slots ? { slots } : undefined);
}

describe("InlineCode.astro render", () => {
    beforeAll(async () => {
        render = await createAstroRenderer<InlineCodeProps>(InlineCode);
    });

    /**
     * Ensures that the root `<code>` element always includes
     * wrapping-safe classes, regardless of prop combinations.
     *
     * This protects against regressions where:
     * - long inline code overflows horizontally,
     * - `whitespace-nowrap` accidentally reappears,
     * - custom classes override essential wrapping behavior.
     */
    test.each([
        { elevate: false, lang: "text", class: undefined, code: "x" },
        { elevate: true, lang: "text", class: "", code: "x" },
        { elevate: false, lang: "sh", class: "custom-inline", code: "x" },
        { elevate: true, lang: "txt", class: undefined, code: "x" },
        { elevate: true, lang: "ts", class: "custom-inline", code: "x" },
    ])(
        "applies wrapping-friendly classes in the root code element (%o)",
        async (props) => {
            const document = await renderInlineCode(props);
            const code = document.querySelector("code");

            // Structural assertion
            expect(code).not.toBeNull();

            const className = code?.getAttribute("class") ?? "";

            // Required wrapping-safe classes
            expect(className).toContain("whitespace-normal");
            expect(className).toContain("break-words");
            expect(className).toContain("[overflow-wrap:anywhere]");

            // Ensure no conflicting nowrap behavior
            expect(className).not.toContain("whitespace-nowrap");

            // Preserve user-provided classes
            if (props.class) {
                expect(className).toContain(props.class);
            }
        },
    );

    /**
     * Verifies that provided `code` content is rendered inside the `<code>` element.
     *
     * This guards against regressions where:
     *
     * - content is not passed through,
     * - escaping/formatting changes break rendering,
     * - DOM structure shifts unexpectedly.
     */
    test("renders code content in the output", async () => {
        const document = await renderInlineCode({
            code:
                "$allErrs | Where-Object { ($_.FullyQualifiedErrorId -split ',')[0] -eq 'InvokeBatchFingerprint.BatchFailed' }",
            lang: "text",
        });

        const code = document.querySelector("code");

        expect(code).not.toBeNull();
        expect(code?.textContent ?? "").toContain(
            "InvokeBatchFingerprint.BatchFailed",
        );
    });

    test.each([
        { code: undefined, slots: undefined },
        { code: "", slots: undefined },
        { code: "   \n\t   ", slots: undefined },
    ])("does not render markup when code is empty (%o)", async ({ code, slots }) => {
        const document = await renderInlineCode({ code }, slots);
        expect(document.querySelector("code")).toBeNull();
    });

    test("does not render markup when default slot is whitespace only", async () => {
        const document = await renderInlineCode({}, { default: "  \n\t  " });
        expect(document.querySelector("code")).toBeNull();
    });

    test("prefers code prop over default slot content", async () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const document = await renderInlineCode(
            { code: "from-prop", lang: "ts" },
            { default: "from-slot" },
        );

        const code = document.querySelector("code");
        expect(code).not.toBeNull();
        expect(code?.textContent ?? "").toContain("from-prop");
        expect(code?.textContent ?? "").not.toContain("from-slot");
        expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    test("warns in DEV when both code prop and default slot are provided", async () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        await renderInlineCode(
            { code: "from-prop", lang: "ts" },
            { default: "from-slot" },
        );

        expect(warnSpy).toHaveBeenCalledTimes(1);
        const firstWarning = warnSpy.mock.calls[0]?.[0];
        expect(firstWarning).toContain("InlineCode conflict:");
        expect(firstWarning).toContain("`code` prop takes precedence");
        expect(firstWarning).toContain("lang=ts");
        expect(firstWarning).toContain("code prop preview=\"from-prop\"");
        expect(firstWarning).toContain("slot preview=\"from-slot\"");
    });

    test("does not warn when a single code source is used", async () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        await renderInlineCode({ code: "from-prop", lang: "ts" });
        await renderInlineCode({}, { default: "from-slot" });
        await renderInlineCode({ code: "from-prop", lang: "ts" }, { default: "   \n\t   " });

        expect(warnSpy).not.toHaveBeenCalled();
    });

    test("forwards aria-label when provided and omits it when undefined", async () => {
        const withLabel = await renderInlineCode({
            code: "x",
            ariaLabel: "Inline shell snippet",
        });
        const withLabelCode = withLabel.querySelector("code");
        expect(withLabelCode?.getAttribute("aria-label")).toBe("Inline shell snippet");

        const withoutLabel = await renderInlineCode({ code: "x", ariaLabel: undefined });
        const withoutLabelCode = withoutLabel.querySelector("code");
        expect(withoutLabelCode?.hasAttribute("aria-label")).toBe(false);
    });

    test("omits data-lang for txt and includes it for non-default languages", async () => {
        const txtDocument = await renderInlineCode({ code: "x", lang: "txt" });
        const txtCode = txtDocument.querySelector("code");
        expect(txtCode?.hasAttribute("data-lang")).toBe(false);

        const tsDocument = await renderInlineCode({ code: "x", lang: "ts" });
        const tsCode = tsDocument.querySelector("code");
        expect(tsCode?.getAttribute("data-lang")).toBe("ts");
    });

    test("disables colorized bracket transformer when brackets is false", async () => {
        const html = await renderInlineCodeHtml({
            code: "a[b]",
            lang: "ts",
            brackets: false,
        });

        expect(html).not.toContain("shiki-bracket-highlight");
    });

    test("changes rendered tokenization when brackets is true", async () => {
        const htmlWithBrackets = await renderInlineCodeHtml({
            code: "a[b]",
            lang: "ts",
            brackets: true,
        });

        const htmlWithoutBrackets = await renderInlineCodeHtml({
            code: "a[b]",
            lang: "ts",
            brackets: false,
        });

        const withBracketSpans = (htmlWithBrackets.match(/<span style=/g) ?? []).length;
        const withoutBracketSpans = (htmlWithoutBrackets.match(/<span style=/g) ?? []).length;

        expect(htmlWithBrackets).not.toBe(htmlWithoutBrackets);
        expect(withBracketSpans).toBeGreaterThan(withoutBracketSpans);
    });
});
