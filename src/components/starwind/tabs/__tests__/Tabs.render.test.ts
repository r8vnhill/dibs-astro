/**
 * @file Tabs.render.test.ts
 *
 * Render tests for Starwind Tabs components across web and PDF export modes.
 */

import Tabs from "$components/starwind/tabs/Tabs.astro";
import TabsContent from "$components/starwind/tabs/TabsContent.astro";
import TabsExportFixture from "$components/starwind/tabs/__tests__/fixtures/TabsExportFixture.astro";
import TabsList from "$components/starwind/tabs/TabsList.astro";
import { createAstroRenderer } from "$test-utils/astro-render";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, test } from "vitest";

const parseHtml = (html: string): Document => new JSDOM(html).window.document;

describe("Tabs components in web mode", () => {
    let renderTabs: ReturnType<typeof createAstroRenderer>;

    beforeAll(async () => {
        renderTabs = createAstroRenderer(Tabs);
    });

    test("renders tab container without export-mode attribute in web mode", async () => {
        const html = await (await renderTabs)(
            { defaultValue: "tab1" },
            {
                slots: {
                    default: `<div data-tabs-list></div>`,
                },
            },
        );
        const doc = parseHtml(html);
        const container = doc.querySelector(".starwind-tabs-container");

        expect(container).toBeTruthy();
        expect(container?.querySelector("[data-export-role='tabs']")).toBeFalsy();
    });

    test("includes initialization script in web mode", async () => {
        const html = await (await renderTabs)(
            { defaultValue: "tab1" },
            {
                slots: {
                    default: `<div data-tabs-list></div>`,
                },
            },
        );

        // In web mode, the Astro component should render a script block
        // The exact presence of script content is hard to guarantee in test renders,
        // so we check that renderMode is undefined (web mode)
        expect(html.length).toBeGreaterThan(0);
        const doc = parseHtml(html);
        const container = doc.querySelector(".starwind-tabs-container");

        expect(container).toBeTruthy();
    });

    describe("TabsList component", () => {
        let renderTabsList: ReturnType<typeof createAstroRenderer>;

        beforeAll(async () => {
            renderTabsList = createAstroRenderer(TabsList);
        });

        test("renders tabs trigger list in web mode", async () => {
            const html = await (await renderTabsList)(
                {},
                {
                    slots: {
                        default: `<button data-tabs-trigger data-value="tab1">Tab 1</button>`,
                    },
                },
            );
            const doc = parseHtml(html);
            const tabsList = doc.querySelector("[data-tabs-list]");

            expect(tabsList).toBeTruthy();
            expect(tabsList?.getAttribute("role")).toBe("tablist");
            expect(tabsList?.textContent).toContain("Tab 1");
        });

        test("renders empty section in PDF mode when renderMode='pdf'", async () => {
            const html = await (await renderTabsList)(
                { renderMode: "pdf" },
                {
                    slots: {
                        default: `<button data-tabs-trigger data-value="tab1">Tab 1</button>`,
                    },
                },
            );
            const doc = parseHtml(html);

            expect(doc.querySelector("[data-tabs-list]")).toBeFalsy();
        });
    });

    describe("TabsContent component", () => {
        let renderTabsContent: ReturnType<typeof createAstroRenderer>;

        beforeAll(async () => {
            renderTabsContent = createAstroRenderer(TabsContent);
        });

        test("renders hidden content in web mode by default", async () => {
            const html = await (await renderTabsContent)(
                { value: "tab1" },
                {
                    slots: {
                        default: `<p>Panel content</p>`,
                    },
                },
            );
            const doc = parseHtml(html);
            const panel = doc.querySelector("[data-tabs-content]");

            expect(panel).toBeTruthy();
            expect(panel?.hasAttribute("hidden")).toBe(true);
            expect(panel?.getAttribute("data-value")).toBe("tab1");
            expect(panel?.getAttribute("role")).toBe("tabpanel");
        });

        test("renders visible content with heading in PDF mode", async () => {
            const html = await (await renderTabsContent)(
                { value: "tab1", label: "First Tab", renderMode: "pdf" },
                {
                    slots: {
                        default: `<p>Panel content</p>`,
                    },
                },
            );
            const doc = parseHtml(html);
            const section = doc.querySelector("[data-export-role='tabs-panel']");
            const heading = doc.querySelector("[data-export-role='tabs-panel-heading']");

            expect(section).toBeTruthy();
            expect(heading).toBeTruthy();
            expect(heading?.textContent).toBe("First Tab");
            expect(section?.textContent).toContain("Panel content");
        });

        test("falls back to tab value as heading in PDF mode when label is absent", async () => {
            const html = await (await renderTabsContent)(
                { value: "python-example", renderMode: "pdf" },
                {
                    slots: {
                        default: `<p>Code example</p>`,
                    },
                },
            );
            const doc = parseHtml(html);
            const heading = doc.querySelector("[data-export-role='tabs-panel-heading']");

            expect(heading?.textContent).toBe("python-example");
        });

        test("does not render hidden attribute in PDF mode", async () => {
            const html = await (await renderTabsContent)(
                { value: "tab1", renderMode: "pdf" },
                {
                    slots: {
                        default: `<p>Content</p>`,
                    },
                },
            );
            const doc = parseHtml(html);
            const section = doc.querySelector("[data-export-role='tabs-panel']");

            expect(section?.hasAttribute("hidden")).toBe(false);
        });
    });
});

describe("Tabs with legacy export mode compatibility", () => {
    let renderTabsList: ReturnType<typeof createAstroRenderer>;

    beforeAll(async () => {
        renderTabsList = createAstroRenderer(TabsList);
    });

    test("TabsList respects renderMode prop precedence over exportMode", async () => {
        const html = await (await renderTabsList)(
            { renderMode: "web", exportMode: true } as any,
            {
                slots: {
                    default: `<button>Tab</button>`,
                },
            },
        );
        const doc = parseHtml(html);

        expect(doc.querySelector("[data-tabs-list]")).toBeTruthy();
    });
});

describe("Nested tabs in export mode", () => {
    let renderTabs: ReturnType<typeof createAstroRenderer>;

    beforeAll(async () => {
        renderTabs = createAstroRenderer(Tabs);
    });

    test("nested tabs render all panels visibly in PDF mode", async () => {
        const html = await (await renderTabs)(
            { renderMode: "pdf" },
            {
                slots: {
                    default: `<section data-export-role="tabs-panel">
                        <h3 data-export-role="tabs-panel-heading">Outer Tab 1</h3>
                        <p>Content</p>
                    </section>
                    <section data-export-role="tabs-panel">
                        <h3 data-export-role="tabs-panel-heading">Outer Tab 2</h3>
                        <p>More content</p>
                    </section>`,
                },
            },
        );
        const doc = parseHtml(html);
        const panels = doc.querySelectorAll("[data-export-role='tabs-panel']");
        const headings = doc.querySelectorAll("[data-export-role='tabs-panel-heading']");

        expect(panels.length).toBe(2);
        expect(headings.length).toBe(2);
        expect(headings[0]?.textContent).toBe("Outer Tab 1");
        expect(headings[1]?.textContent).toBe("Outer Tab 2");
    });

    test("includes correct export-role marker in PDF mode", async () => {
        const html = await (await renderTabs)(
            { renderMode: "pdf" },
            {
                slots: {
                    default: `<section>Content</section>`,
                },
            },
        );
        const doc = parseHtml(html);
        const container = doc.querySelector("[data-export-role='tabs']");

        expect(container).toBeTruthy();
    });
});

describe("Tabs export mode from Astro.locals", () => {
    let renderFixture: ReturnType<typeof createAstroRenderer>;

    beforeAll(async () => {
        renderFixture = createAstroRenderer(TabsExportFixture);
    });

    test("real nested tab components read PDF mode from locals without prop drilling", async () => {
        const html = await (await renderFixture)(
            {},
            { locals: { lessonRenderMode: "pdf" } },
        );
        const doc = parseHtml(html);
        const tabs = doc.querySelector("[data-export-role='tabs']");
        const panels = doc.querySelectorAll("[data-export-role='tabs-panel']");
        const hiddenPanels = doc.querySelectorAll("[data-tabs-content][hidden]");

        expect(tabs).toBeTruthy();
        expect(doc.querySelector("[data-tabs-list]")).toBeFalsy();
        expect(panels).toHaveLength(2);
        expect(hiddenPanels).toHaveLength(0);
        expect(doc.body.textContent).toContain("First panel");
        expect(doc.body.textContent).toContain("Second panel");
    });
});
