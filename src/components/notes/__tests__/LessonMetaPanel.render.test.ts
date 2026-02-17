/**
 * @file LessonMetaPanel.render.test.ts
 *
 * Integration-style render tests for the {@link LessonMetaPanel} Astro component.
 *
 * This suite renders the component to HTML (via {@link createAstroRenderer}), parses the output
 * with JSDOM, and asserts on the resulting DOM.
 *
 * ## What this test covers
 *
 * - Baseline UI structure and labels (panel title, section headings).
 * - Conditional rendering based on lesson metadata:
 *   - Missing last-modified date -> shows “sin fecha registrada”.
 *   - Present last-modified date -> shows a human-readable Spanish date.
 *   - Empty `changes` -> shows the empty state and hides the changes list.
 *   - Non-empty `changes` -> shows a changes list and hides the empty state.
 * - Author formatting:
 *   - Multiple authors are joined with “, ”.
 * - Optional link generation:
 *   - When `platforms` and `websiteRepoRefs` are provided, commit links are rendered for supported
 *     platforms.
 *
 * ## Why DOM-based assertions?
 *
 * String `toContain(...)` checks are brittle (they break on whitespace or markup changes).
 * Instead, this suite relies on `data-testid` attributes for stable, intention-revealing
 * assertions.
 *
 * This makes the tests resilient to:
 * - layout refactors
 * - formatting changes
 * - additional markup wrappers
 *
 * ## Test philosophy
 *
 * - Keep tests focused on observable behavior (rendered output).
 * - Keep setup minimal via helpers (`createMetadata`, `parseHtml`, `textByTestId`).
 * - Use DDT (`test.each`) for coverage without repetition.
 */

import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, test } from "vitest";
import type { PartialRecord } from "~/types/records";
import type { RepoPlatform, RepoRef } from "~/utils/git";
import type { LessonMetadataEntry } from "~/utils/lesson-metadata";
import { type AstroRender, createAstroRenderer } from "../../../test-utils/astro-render";
import LessonMetaPanel from "../LessonMetaPanel.astro";

/**
 * Local view of the props consumed by {@link LessonMetaPanel}.
 *
 * Keeping this type explicit makes the test self-documenting and ensures refactors fail fast at
 * compile time.
 */
interface LessonMetaPanelProps {
    /**
     * The metadata entry for the current lesson.
     */
    metadata: LessonMetadataEntry;

    /**
     * Optional repository references for the website.
     *
     * When provided alongside `platforms`, the component can generate commit links for the
     * configured platform(s).
     */
    websiteRepoRefs?: PartialRecord<RepoPlatform, RepoRef>;

    /**
     * Optional platform configuration.
     *
     * The component supports a flexible shape here, so this test keeps the type intentionally
     * loose and asserts only on observable behavior.
     */
    platforms?: unknown;
}

/**
 * Stable source file path used across test cases.
 *
 * This avoids repeating path literals and keeps tests focused on behavior.
 */
const SOURCE_FILE = "src/pages/notes/example/index.astro";

/**
 * Factory for producing a valid {@link LessonMetadataEntry} with minimal defaults.
 *
 * @param overrides Partial overrides to customize a scenario.
 * @returns A fully-formed metadata entry suitable for rendering.
 */
const createMetadata = (
    overrides: Partial<LessonMetadataEntry> = {},
): LessonMetadataEntry => ({
    sourceFile: SOURCE_FILE,
    authors: [{ name: "Proyecto DIBS" }],
    changes: [],
    ...overrides,
});

/**
 * Parses an HTML string into a {@link Document} using JSDOM.
 *
 * @param html Rendered HTML string.
 * @returns DOM document for querying.
 */
const parseHtml = (html: string): Document => new JSDOM(html).window.document;

/**
 * Reads and trims text content from an element selected by `data-testid`.
 *
 * This centralizes how we interpret DOM text to:
 * - avoid repeated null checks,
 * - keep assertions concise,
 * - ensure consistent trimming.
 *
 * @param doc DOM document.
 * @param testId `data-testid` value to query for.
 * @returns Trimmed text content, or empty string when missing.
 */
const textByTestId = (doc: Document, testId: string): string =>
    doc.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim() ?? "";

/**
 * Render function created fresh for each test.
 *
 * The renderer encapsulates Astro container creation and `renderToString`.
 */
let renderPanel: AstroRender<LessonMetaPanelProps>;

describe.concurrent("LessonMetaPanel.astro render", () => {
    /**
     * Creates a fresh renderer per test to avoid cross-test leakage.
     */
    beforeEach(async () => {
        renderPanel = await createAstroRenderer<LessonMetaPanelProps>(LessonMetaPanel);
    });

    test("renders base panel labels", async () => {
        const html = await renderPanel({ metadata: createMetadata() });
        const doc = parseHtml(html);

        expect(textByTestId(doc, "panel-title")).toBe("Metadatos de la lección");

        // These labels are asserted via body text because they may not have dedicated test ids
        // (but remain stable user-facing copy).
        expect(doc.body.textContent).toContain("Última actualización:");
        expect(doc.body.textContent).toContain("Cambios recientes:");
    });

    /**
     * Data-driven coverage for the main conditional branches:
     * - last updated formatting
     * - changes list vs empty state
     * - multiple authors formatting
     */
    test.each([
        {
            name: "missing date and no changes",
            metadata: createMetadata(),
            lastUpdated: "sin fecha registrada",
            emptyChanges: true,
        },
        {
            name: "has date and no changes",
            metadata: createMetadata({ lastModified: "2026-02-17" }),
            lastUpdated: "17 de febrero de 2026",
            emptyChanges: true,
        },
        {
            name: "shows changes list when changes exist",
            metadata: createMetadata({
                lastModified: "2026-02-17",
                changes: [
                    {
                        hash: "abc1234fff000",
                        date: "2026-02-16",
                        author: "A",
                        subject: "Update lesson panel",
                    },
                ],
            }),
            lastUpdated: "17 de febrero de 2026",
            emptyChanges: false,
        },
        {
            name: "renders multiple authors joined by comma",
            metadata: createMetadata({
                authors: [{ name: "Autora Uno" }, { name: "Autor Dos" }],
            }),
            lastUpdated: "sin fecha registrada",
            emptyChanges: true,
            authorsText: "Autora Uno, Autor Dos",
        },
    ])("$name", async ({ metadata, lastUpdated, emptyChanges, authorsText }) => {
        const html = await renderPanel({ metadata });
        const doc = parseHtml(html);

        // Last updated text is exposed via a stable test id.
        expect(textByTestId(doc, "last-updated-value")).toBe(lastUpdated);

        // Optional assertion: only check author formatting when the scenario declares it.
        if (authorsText) {
            expect(textByTestId(doc, "authors-value")).toBe(authorsText);
        }

        // Conditional changes section.
        if (emptyChanges) {
            expect(textByTestId(doc, "changes-empty")).toBe("No hay cambios registrados.");
            expect(doc.querySelector("[data-testid=\"changes-list\"]")).toBeNull();
            return;
        }

        expect(doc.querySelector("[data-testid=\"changes-empty\"]")).toBeNull();
        expect(doc.querySelector("[data-testid=\"changes-list\"]")).not.toBeNull();
        expect(doc.body.textContent).toContain("Update lesson panel");
    });

    test("supports optional platforms and website repo refs", async () => {
        const html = await renderPanel({
            metadata: createMetadata({
                changes: [
                    {
                        hash: "abc1234fff000",
                        date: "2026-02-16",
                        author: "A",
                        subject: "Add metadata links",
                    },
                ],
            }),
            platforms: ["github"],
            websiteRepoRefs: {
                github: { user: "org", repo: "web" },
            },
        });

        const doc = parseHtml(html);

        // When platform config is present, the component should render a commit link.
        const links = [...doc.querySelectorAll("a")];
        expect(links.length).toBe(1);

        expect(links[0]?.textContent?.trim()).toBe("GitHub");
        expect(links[0]?.getAttribute("href")).toContain("/org/web/commit/abc1234fff000");
    });
});
