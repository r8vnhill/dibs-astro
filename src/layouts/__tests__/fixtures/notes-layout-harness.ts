/**
 * @file notes-layout-harness.ts
 *
 * Test harness for NotesLayout render tests.
 *
 * This module centralizes render setup, HTML parsing, and default values so tests
 * focus on behavior rather than boilerplate.
 *
 * ## Design
 *
 * The harness does not close over a global renderer. Instead, it receives the renderer
 * as a parameter, making it:
 *
 * - Reusable across multiple test suites
 * - Testable by construction (no hidden dependencies)
 * - Clear about the dependency relationship
 *
 * ## Usage
 *
 * ```ts
 * const renderLayout = await createAstroRenderer<NotesLayoutProps>(NotesLayout);
 * const { renderNotes, parseHtml } = createNotesLayoutHarness(renderLayout);
 *
 * const html = await renderNotes({ title: "Test" });
 * const doc = parseHtml(html);
 * ```
 */

import { JSDOM } from "jsdom";
import type { AstroRender } from "../../../test-utils/astro-render";
import type { NotesLayoutProps } from "../../NotesLayout.props";

export interface NotesLayoutRenderOptions {
    /**
     * Pathname for the `Request` object.
     *
     * @default "/notes/example/"
     */
    pathname?: string;

    /**
     * Override for named slots.
     *
     * @default { abstract: "<p>Resumen breve</p>", default: "<p>Contenido</p>" }
     */
    slots?: Record<string, string>;
}

export interface NotesLayoutHarness {
    /**
     * Render the layout with props and optional overrides.
     *
     * @param props Layout props (title, navigation, metadata)
     * @param options Override pathname or slot content
     * @returns HTML string
     */
    renderNotes(
        props: NotesLayoutProps,
        options?: NotesLayoutRenderOptions,
    ): Promise<string>;

    /**
     * Parse HTML string into a DOM Document.
     *
     * @param html HTML string
     * @returns JSDOM Document
     */
    parseHtml(html: string): Document;
}

const BASE_URL = "https://dibs.ravenhill.cl";

const defaultSlots = (): Record<string, string> => ({
    abstract: "<p>Resumen breve</p>",
    default: "<p>Contenido</p>",
});

const requestFor = (pathname: string): Request => new Request(new URL(pathname, BASE_URL));

/**
 * Create a harness for NotesLayout render tests.
 *
 * @param renderLayout Astro renderer for NotesLayout
 * @returns Harness with `renderNotes` and `parseHtml` methods
 */
export const createNotesLayoutHarness = (
    renderLayout: AstroRender<NotesLayoutProps>,
): NotesLayoutHarness => ({
    renderNotes: (props, options = {}) =>
        renderLayout(props, {
            request: requestFor(options.pathname ?? "/notes/example/"),
            slots: options.slots ?? defaultSlots(),
        }),

    parseHtml: (html) => new JSDOM(html).window.document,
});
