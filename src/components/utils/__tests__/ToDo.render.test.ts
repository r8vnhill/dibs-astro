/**
 * @file Locks the Phase 3 server-rendered structure of the native `ToDo.astro` component (see
 * `traceability-log` migration plan for moving `ToDo` from React to Astro): a `<dibs-todo>` wrapper
 * around a `<figure>`/`<figcaption>` pair, rendered without hydration and with no `astro-island`.
 * Client-side image selection and reporting are introduced separately in Phase 4.
 */

import { createAstroRenderer } from "$test-utils/astro-render";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, suite, test } from "vitest";
import ToDo from "../ToDo.astro";

type ToDoProps = {
    metadata?: Record<string, unknown>;
    message?: string;
    altText?: string;
    reportEventName?: string | null;
};

function parseHtml(html: string): Document {
    return new JSDOM(html).window.document;
}

suite("given the native ToDo component", () => {
    let render: Awaited<ReturnType<typeof createAstroRenderer<ToDoProps>>>;

    beforeAll(async () => {
        render = await createAstroRenderer<ToDoProps>(ToDo);
    });

    describe("when rendered with no props", () => {
        test("then it renders a dibs-todo wrapper without any hydration island", async () => {
            const html = await render({});
            const doc = parseHtml(html);

            expect(doc.querySelector("dibs-todo")).not.toBeNull();
            expect(doc.querySelector("astro-island")).toBeNull();
        });

        test("then it renders the default message in a figure caption", async () => {
            const html = await render({});
            const doc = parseHtml(html);

            const figure = doc.querySelector("figure");
            expect(figure).not.toBeNull();
            expect(figure?.getAttribute("aria-describedby")).toBeTruthy();
            expect(figure?.querySelector("figcaption")?.textContent).toContain(
                "TODO: Estamos (estoy) trabajando para ustedes c:",
            );
        });

        test("then the figcaption id matches the figure's aria-describedby", async () => {
            const html = await render({});
            const doc = parseHtml(html);

            const figure = doc.querySelector("figure");
            const figcaption = doc.querySelector("figcaption");
            expect(figcaption?.id).toBe(figure?.getAttribute("aria-describedby"));
        });

        test("then it defaults to the dibs:placeholder report event", async () => {
            const html = await render({});
            const doc = parseHtml(html);

            expect(doc.querySelector("dibs-todo")?.getAttribute("data-report-event-name")).toBe(
                "dibs:placeholder",
            );
        });
    });

    describe("when a custom message and altText are provided", () => {
        test("then the message is reflected in the figcaption and altText in a data attribute", async () => {
            const html = await render({ message: "Contenido pendiente", altText: "Meme de ejemplo" });
            const doc = parseHtml(html);

            expect(doc.querySelector("figcaption")?.textContent).toContain("Contenido pendiente");
            expect(doc.querySelector("dibs-todo")?.getAttribute("data-alt-text")).toBe("Meme de ejemplo");
        });
    });

    describe("when metadata is provided", () => {
        test("then it is serialized onto the wrapper as JSON", async () => {
            const metadata = { tasks: ["write tests"] };
            const html = await render({ metadata });
            const doc = parseHtml(html);

            expect(doc.querySelector("dibs-todo")?.getAttribute("data-metadata")).toBe(
                JSON.stringify(metadata),
            );
        });
    });

    describe("when a custom reportEventName is provided", () => {
        test("then it overrides the default event name", async () => {
            const html = await render({ reportEventName: "todo:custom" });
            const doc = parseHtml(html);

            expect(doc.querySelector("dibs-todo")?.getAttribute("data-report-event-name")).toBe(
                "todo:custom",
            );
        });
    });

    describe("when reportEventName is null", () => {
        test("then no report-event-name attribute is rendered", async () => {
            const html = await render({ reportEventName: null });
            const doc = parseHtml(html);

            expect(doc.querySelector("dibs-todo")?.hasAttribute("data-report-event-name")).toBe(false);
        });
    });
});
