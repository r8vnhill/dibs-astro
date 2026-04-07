import { describe, expect, test } from "vitest";
import {
    appendInlineStyle,
    getMetaKey,
    parseInlineLineColorDirective,
    sanitizeCssColor,
} from "../line-text-color-helpers";
import { transformerNotationLineTextColor } from "../line-text-color-transformer";

/**
 * Contract tests for the inline line-text-color transformer and its helper utilities.
 *
 * ## The suite protects two layers:
 *
 * - the pure helpers that sanitize color values, parse inline directives, merge inline styles, and
 *   derive metadata cache keys; and
 * - the transformer handshake between `preprocess()` and `line()`, where inline annotations are
 *   removed from rendered code while line-based metadata still resolves to the correct output line.
 *
 * ## The main behavioral invariants covered here are:
 *
 * - accepted color formats are conservative and predictable;
 * - malformed or unsafe inline directives are ignored or rejected safely;
 * - style and class mutations preserve existing node information;
 * - line-number mapping remains stable after preprocessing; and
 * - the transformer tolerates missing or non-object metadata without failing.
 */

/**
 * Concrete transformer type returned by the production factory.
 *
 * Keeping the alias local to the test file makes the small helper wrappers below easier to read.
 */
type TransformerType = ReturnType<typeof transformerNotationLineTextColor>;

/**
 * Builds the minimal transformer context shape required by the Shiki hooks.
 *
 * Production code receives richer `this` bindings from Shiki. Tests only need the `meta` field
 * because that is the part consumed by the transformer under test.
 */
const contextWithMeta = (meta: unknown) => ({ meta });

/**
 * Creates a minimal line node fixture.
 *
 * Tests intentionally model only the `properties` bag because that is the only part the
 * transformer reads and mutates.
 */
const lineNode = (properties: Record<string, unknown> = {}) => ({
    properties,
});

/**
 * Runs the transformer's `preprocess()` hook with a lightweight test context.
 *
 * This helper keeps the call ceremony out of the tests so each case can focus on the input code,
 * metadata shape, and resulting transformed content.
 */
const preprocess = (
    transformer: TransformerType,
    meta: unknown,
    code: string,
) => transformer.preprocess?.call(contextWithMeta(meta) as never, code, {} as never);

/**
 * Runs the transformer's `line()` hook against a single rendered line node.
 *
 * The helper mirrors the hook invocation used by the renderer while keeping the tests small and
 * explicit about the line number being targeted.
 */
const applyLine = (
    transformer: TransformerType,
    meta: unknown,
    node: { properties: Record<string, unknown> },
    lineNumber: number,
) => transformer.line?.call(contextWithMeta(meta) as never, node as never, lineNumber);

/**
 * Creates a fresh transformer instance for each test.
 *
 * Using a tiny factory keeps the tests easy to extend if the production transformer later grows
 * configuration options.
 */
const createTransformer = () => transformerNotationLineTextColor();

describe("sanitizeCssColor", () => {
    /**
     * These examples define the conservative acceptance policy used by the helper. The goal is not
     * to support every CSS color expression, but to allow a practical subset that is safe to embed
     * into inline styles.
     */
    describe("given supported and unsupported color values", () => {
        describe("when the value is sanitized", () => {
            test.each([
                ["red", "red"],
                ["blue", "blue"],
                [" rgb(10, 20, 30) ", "rgb(10, 20, 30)"],
                ["rgb(255,255,255)", "rgb(255,255,255)"],
                ["rgba(0, 0, 0, 0.5)", "rgba(0, 0, 0, 0.5)"],
                ["hsl(0, 100%, 50%)", "hsl(0, 100%, 50%)"],
                ["#fff", "#fff"],
                ["#ffffff", "#ffffff"],
                ["var(--accent)", "var(--accent)"],
                ["var(--color-primary)", "var(--color-primary)"],
                ["var(--accent, red)", "var(--accent, red)"],
                ["", null],
                [" ", null],
                ["red;display:block", null],
                ["red;background:black", null],
            ])("then %j becomes %j", (input, expected) => {
                expect(sanitizeCssColor(input)).toBe(expected);
            });
        });
    });

    describe("given a value longer than the allowed limit", () => {
        describe("when it is sanitized", () => {
            test("then it returns null", () => {
                // Pattern is /^[a-zA-Z0-9#(),.%/\s+-]{1,64}$/
                expect(sanitizeCssColor("a".repeat(65))).toBeNull();
            });
        });
    });
});

describe("parseInlineLineColorDirective", () => {
    /**
     * The parser contract is intentionally narrow:
     *
     * - well-formed inline annotations should produce `{ color, content }`;
     * - the directive itself must be stripped from the returned content; and
     * - malformed or absent directives should yield `null` instead of throwing.
     */
    describe("given inline content with and without directives", () => {
        describe("when the directive is parsed", () => {
            test.each([
                [
                    "Write-Host 'hola' # [!code color: rgb(10, 20, 30)]",
                    { color: "rgb(10, 20, 30)", content: "Write-Host 'hola'" },
                ],
                [
                    "echo hello  # [!code color:red]",
                    { color: "red", content: "echo hello" },
                ],
                [
                    "git commit -m 'fix'    [!code color: var(--accent)]",
                    { color: "var(--accent)", content: "git commit -m 'fix'" },
                ],
                [
                    "code  [!code color:#fff]",
                    { color: "#fff", content: "code" },
                ],
                ["Write-Host 'hola'", null],
                ["normal line", null],
                ["", null],
                ["line [!code invalid]", null],
                ["line [!code color:]", null],
            ])("then %j becomes %j", (input, expected) => {
                expect(parseInlineLineColorDirective(input)).toEqual(expected);
            });
        });
    });
});

describe("appendInlineStyle", () => {
    /**
     * Style merging should be forgiving about existing formatting and always normalize the result
     * into a semicolon-terminated inline style string.
     */
    describe("given an existing style and a new declaration", () => {
        describe("when the style is appended", () => {
            test.each([
                [undefined, "--x:red", "--x:red;"],
                [null, "--x:red", "--x:red;"],
                ["color:blue", "--x:red", "color:blue;--x:red;"],
                ["color:blue;", "--x:red", "color:blue;--x:red;"],
                ["", "--x:red", "--x:red;"],
                [" ", "--x:red", "--x:red;"],
                [
                    "color:blue;border:1px solid",
                    "--x:green",
                    "color:blue;border:1px solid;--x:green;",
                ],
            ])("then %j and %j become %j", (existing, toAppend, expected) => {
                expect(appendInlineStyle(existing, toAppend)).toBe(expected);
            });

            test("then the result ends with a semicolon", () => {
                const result = appendInlineStyle("color:blue", "--x:red");
                expect(result).toMatch(/;$/);
            });

            test("then all declarations are preserved", () => {
                const result = appendInlineStyle("color:blue;border:1px", "--x:green");
                expect(result).toContain("color:blue");
                expect(result).toContain("border:1px");
                expect(result).toContain("--x:green");
            });
        });
    });
});

describe("getMetaKey", () => {
    /**
     * The metadata-key helper buckets primitive metadata into one stable fallback key, while
     * object metadata is keyed by identity.
     *
     * This distinction matters because the transformer stores annotations in a metadata side table
     * keyed by the `meta` value passed through the render pipeline.
     */
    describe("given primitive metadata values", () => {
        describe("when the key is derived", () => {
            test("then they collapse to the same fallback bucket", () => {
                expect(getMetaKey(undefined)).toBe(getMetaKey(null));
                expect(getMetaKey("meta")).toBe(getMetaKey(1));
                expect(getMetaKey(true)).toBe(getMetaKey(false));
            });
        });
    });

    describe("given different object references", () => {
        describe("when the key is derived", () => {
            test("then they produce different keys", () => {
                expect(getMetaKey({})).not.toBe(getMetaKey({}));
            });
        });
    });

    describe("given the same object reference", () => {
        describe("when the key is derived multiple times", () => {
            test("then it stays stable", () => {
                const meta = {};
                expect(getMetaKey(meta)).toBe(getMetaKey(meta));
            });
        });
    });

    describe("given a mutated metadata object", () => {
        describe("when the key is derived again", () => {
            test("then object identity is preserved", () => {
                const meta = { x: 1 };
                const key1 = getMetaKey(meta);
                meta.x = 2;
                const key2 = getMetaKey(meta);
                expect(key1).toBe(key2);
            });
        });
    });
});

describe("transformerNotationLineTextColor", () => {
    describe("given an annotated line", () => {
        /**
         * The core transformer flow is:
         *
         * 1. `preprocess()` strips the inline directive from the source code.
         * 2. Metadata about the colored line is stored out-of-band.
         * 3. `line()` later reads that metadata and mutates the rendered node.
         */
        describe("when preprocess and line are applied", () => {
            test("then it adds the color class and inline style", () => {
                const transformer = createTransformer();
                const meta = {};
                const code = "a\nb // [!code color:red]";
                const preprocessed = preprocess(transformer, meta, code);
                const node = lineNode({ class: "line existing" });

                expect(preprocessed).toBe("a\nb");

                applyLine(transformer, meta, node, 2);

                expect(node.properties.className).toEqual(["line", "existing", "line-colored"]);
                expect(node.properties.style).toBe("--code-line-text-color:red;");
                expect(node.properties).not.toHaveProperty("class");
            });
        });

        describe("when the first line carries the directive", () => {
            test("then the first rendered line receives the color", () => {
                const transformer = createTransformer();
                const meta = {};
                const code = "first // [!code color:blue]\nsecond";
                const preprocessed = preprocess(transformer, meta, code);
                const node = lineNode({ class: "line" });

                expect(preprocessed).toBe("first\nsecond");

                applyLine(transformer, meta, node, 1);

                expect(node.properties.className).toEqual(["line", "line-colored"]);
                expect(node.properties.style).toBe("--code-line-text-color:blue;");
            });
        });
    });

    describe("given multiple lines with mixed annotations", () => {
        describe("when preprocess stores line metadata", () => {
            test("then line numbers still map to the correct rendered lines", () => {
                const transformer = createTransformer();
                const meta = {};
                const code = `line1 // [!code color:red]
line2
line3 // [!code color:blue]`;
                const preprocessed = preprocess(transformer, meta, code);

                // Directives are stripped without collapsing lines, so stored metadata still
                // targets the same 1-based line numbers during the later `line()` pass.
                expect(preprocessed).toBe("line1\nline2\nline3");

                const node1 = lineNode({ class: "line" });
                const node2 = lineNode({ class: "line" });
                const node3 = lineNode({ class: "line" });

                applyLine(transformer, meta, node1, 1);
                applyLine(transformer, meta, node2, 2);
                applyLine(transformer, meta, node3, 3);

                expect(node1.properties.className).toContain("line-colored");
                expect(node1.properties.style).toBe("--code-line-text-color:red;");

                expect(node2.properties.className || []).not.toContain("line-colored");
                expect(node2.properties).not.toHaveProperty("style");

                expect(node3.properties.className).toContain("line-colored");
                expect(node3.properties.style).toBe("--code-line-text-color:blue;");
            });
        });
    });

    describe("given the same rendered line is visited more than once", () => {
        /**
         * Repeated line visits should not duplicate CSS classes.
         *
         * This protects against renderer integrations that might accidentally invoke `line()` more
         * than once for the same line node.
         */
        describe("when line is applied repeatedly", () => {
            test("then it does not duplicate the line-colored class", () => {
                const transformer = createTransformer();
                const meta = {};
                const code = "a\nb // [!code color:red]";
                preprocess(transformer, meta, code);

                const node = lineNode({ class: "line existing" });

                applyLine(transformer, meta, node, 2);
                const afterFirstCall = [...(node.properties.className as string[])];

                applyLine(transformer, meta, node, 2);
                const afterSecondCall = node.properties.className as string[];

                expect(afterSecondCall).toEqual(afterFirstCall);
                expect(afterSecondCall.filter((c) => c === "line-colored")).toHaveLength(1);
            });

            test("then it appends the inline style again as a known limitation", () => {
                // This documents current production behavior. Classes are merged idempotently, but
                // repeated `line()` calls still append the CSS custom property again.
                const transformer = createTransformer();
                const meta = {};
                const code = "a\nb // [!code color:red]";
                preprocess(transformer, meta, code);

                const node = lineNode({ class: "line" });

                applyLine(transformer, meta, node, 2);
                const styleAfterFirstCall = node.properties.style as string;

                applyLine(transformer, meta, node, 2);
                const styleAfterSecondCall = node.properties.style as string;

                expect(styleAfterSecondCall).toBe(
                    styleAfterFirstCall + "--code-line-text-color:red;",
                );
            });
        });
    });

    describe("given missing metadata or no matching directives", () => {
        /**
         * The transformer should degrade safely when no usable metadata bucket exists. In those
         * cases it should behave like a no-op, not an error.
         */
        describe("when metadata is not an object", () => {
            test("then it degrades safely without throwing", () => {
                const transformer = createTransformer();
                const code = "echo hi ; [!code color:#fff]";
                const preprocessed = preprocess(transformer, undefined, code);
                const node = lineNode();

                expect(preprocessed).toBe("echo hi");
                expect(() => applyLine(transformer, undefined, node, 1)).not.toThrow();
                expect(() => applyLine(transformer, null, node, 1)).not.toThrow();
                expect(() => applyLine(transformer, 1, node, 1)).not.toThrow();
                expect(() => applyLine(transformer, "string", node, 1)).not.toThrow();
            });
        });

        describe("when no directive matches during preprocess", () => {
            test("then later line visits leave nodes untouched", () => {
                const transformer = createTransformer();
                const meta = {};
                const code = "echo hi";
                const node = lineNode({ class: "line" });

                expect(preprocess(transformer, meta, code)).toBe(code);

                applyLine(transformer, meta, node, 1);

                expect(node.properties).toEqual({ class: "line" });
            });
        });
    });

    describe("given line nodes with different class and style shapes", () => {
        /**
         * These cases protect integration boundaries with upstream AST producers, which may supply
         * classes and styles in slightly different shapes.
         */
        describe("when className already exists as an array", () => {
            test("then it keeps working", () => {
                const transformer = createTransformer();
                const meta = {};
                const code = "a\nb // [!code color:red]";
                preprocess(transformer, meta, code);

                const node = lineNode({ className: ["line", "existing"] });
                applyLine(transformer, meta, node, 2);

                expect(node.properties.className).toBeDefined();
            });
        });

        describe("when class is missing entirely", () => {
            test("then it still applies safely", () => {
                const transformer = createTransformer();
                const meta = {};
                const code = "a\nb // [!code color:red]";
                preprocess(transformer, meta, code);

                const node = lineNode({});
                applyLine(transformer, meta, node, 2);

                expect(node.properties).toBeDefined();
            });
        });

        describe("when style has trailing spaces", () => {
            test("then it preserves the existing declaration and appends the color", () => {
                const transformer = createTransformer();
                const meta = {};
                const code = "a\nb // [!code color:red]";
                preprocess(transformer, meta, code);

                const node = lineNode({ style: "color:blue;  " });
                applyLine(transformer, meta, node, 2);

                const style = node.properties.style as string;
                expect(style).toContain("color:blue");
                expect(style).toContain("--code-line-text-color:red");
            });
        });

        describe("when style already has multiple declarations", () => {
            test("then it preserves them and appends the color", () => {
                const transformer = createTransformer();
                const meta = {};
                const code = "a\nb // [!code color:red]";
                preprocess(transformer, meta, code);

                const node = lineNode({ style: "color:blue;border:1px solid black" });
                applyLine(transformer, meta, node, 2);

                const style = node.properties.style as string | undefined;
                expect(style).toBeDefined();
                expect(style).toContain("color:blue");
                expect(style).toContain("border:1px solid black");
                expect(style).toContain("--code-line-text-color:red");
            });
        });

        describe("when style is an empty string", () => {
            test("then it initializes the color declaration", () => {
                const transformer = createTransformer();
                const meta = {};
                const code = "a\nb // [!code color:red]";
                preprocess(transformer, meta, code);

                const node = lineNode({ style: "" });
                applyLine(transformer, meta, node, 2);

                expect(node.properties.style).toBeDefined();
                expect((node.properties.style as string).length).toBeGreaterThan(0);
            });
        });

        describe("when the node properties object starts empty", () => {
            test("then it does not throw", () => {
                const transformer = createTransformer();
                const meta = {};
                const code = "a\nb // [!code color:red]";
                preprocess(transformer, meta, code);

                const node = lineNode({});
                expect(() => applyLine(transformer, meta, node, 2)).not.toThrow();
            });
        });
    });

    describe("given accepted color formats", () => {
        /**
         * This integration-level matrix confirms that values accepted by the sanitization layer
         * are also applied correctly by the transformer.
         */
        describe("when the directive is applied", () => {
            test.each([
                ["red", "red"],
                ["#fff", "#fff"],
                ["#ffffff", "#ffffff"],
                ["rgb(255, 0, 0)", "rgb(255, 0, 0)"],
                ["rgba(255, 0, 0, 0.5)", "rgba(255, 0, 0, 0.5)"],
                ["hsl(0, 100%, 50%)", "hsl(0, 100%, 50%)"],
                ["var(--custom-color)", "var(--custom-color)"],
            ])("then color %j is applied as %j to the rendered line", (color, expectedColor) => {
                const transformer = createTransformer();
                const meta = {};
                const code = `a\nb // [!code color:${color}]`;
                preprocess(transformer, meta, code);

                const node = lineNode({ class: "line" });
                applyLine(transformer, meta, node, 2);

                expect(node.properties.style).toContain(`--code-line-text-color:${expectedColor}`);
            });
        });
    });
});
