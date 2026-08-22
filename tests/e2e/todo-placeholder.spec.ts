import { expect, type Page, test } from "@playwright/test";

/**
 * Real-browser regression for the native `<ToDo />` custom element. `ToDo.render.test.ts` locks the
 * server-rendered markup in jsdom; this suite exercises the client-only behavior jsdom cannot:
 * `connectedCallback` running independently per instance, the console warning, and `window` event
 * dispatch for default/custom/disabled `reportEventName` values. Runs against `/dev-fixtures/todo/`,
 * which is the only place the real placeholder image pool is exercised with more than one
 * `reportEventName` configuration (no real content page varies it).
 */

const FIXTURE_PATH = "/dev-fixtures/todo/";

type ReportedEvent = { message: string; imageSrc: string | null; metadata?: unknown; timestamp: string };
type FixtureEvents = Record<string, ReportedEvent[]>;

const WATCHED_EVENTS = ["dibs:placeholder", "dibs:placeholder-fixture-custom"] as const;

// Listeners must be installed via `addInitScript` (not `page.evaluate` before `goto`) because
// navigation tears down the page's window/listeners; `addInitScript` re-runs on every new document.
// Each occurrence is appended (not overwritten), so an accidental double dispatch is still visible.
async function collectReportedEvents(page: Page): Promise<void> {
    await page.addInitScript((eventNames) => {
        const collected: FixtureEvents = Object.fromEntries(eventNames.map((name) => [name, []]));
        (window as unknown as { __todoFixtureEvents: FixtureEvents }).__todoFixtureEvents = collected;
        for (const name of eventNames) {
            window.addEventListener(name, (event) => {
                collected[name]!.push((event as CustomEvent<ReportedEvent>).detail);
            });
        }
    }, WATCHED_EVENTS);
}

async function getReportedEvents(page: Page, eventName: string): Promise<ReportedEvent[]> {
    await expect
        .poll(() =>
            page.evaluate(
                (name) =>
                    (window as unknown as { __todoFixtureEvents?: FixtureEvents }).__todoFixtureEvents?.[name]
                        ?.length ?? 0,
                eventName,
            )
        )
        .toBeGreaterThan(0);

    return page.evaluate(
        (name) => (window as unknown as { __todoFixtureEvents: FixtureEvents }).__todoFixtureEvents[name]!,
        eventName,
    );
}

test.describe("native ToDo custom element", () => {
    test("each instance initializes independently and reports exactly once on its own event", async ({ page }) => {
        await collectReportedEvents(page);

        const consoleWarnings: string[] = [];
        page.on("console", (message) => {
            if (message.type() === "warning") consoleWarnings.push(message.text());
        });

        await page.goto(FIXTURE_PATH);

        const [defaultEvents, customEvents] = await Promise.all([
            getReportedEvents(page, "dibs:placeholder"),
            getReportedEvents(page, "dibs:placeholder-fixture-custom"),
        ]);

        // Exactly one report per instance: no double-init, no cross-instance leakage.
        expect(defaultEvents).toHaveLength(1);
        expect(customEvents).toHaveLength(1);
        const [defaultPayload] = defaultEvents;
        const [customPayload] = customEvents;

        expect(defaultPayload.message).toBe("TODO: Estamos (estoy) trabajando para ustedes c:");
        expect(defaultPayload.imageSrc).toBeTruthy();
        expect(() => new Date(defaultPayload.timestamp).toISOString()).not.toThrow();

        expect(customPayload.message).toBe("Mensaje personalizado");
        expect(customPayload.imageSrc).toBeTruthy();
        expect(customPayload.metadata).toEqual({ instance: "custom-event" });

        // Metadata stays instance-local: the default instance's payload carries none.
        expect(defaultPayload.metadata).toBeUndefined();

        expect(consoleWarnings.some((text) => text.includes("[ToDo]"))).toBe(true);
    });

    test("each instance's payload image matches the image it actually displays", async ({ page }) => {
        await page.goto(FIXTURE_PATH);

        for (const instance of ["default", "custom-event"] as const) {
            const image = page.locator(`[data-fixture-instance="${instance}"] dibs-todo img`);
            await expect(image).toBeVisible();
            const src = await image.getAttribute("src");
            expect(src).toBeTruthy();
        }
    });

    test("reportEventName: null disables event dispatch for that instance", async ({ page }) => {
        await collectReportedEvents(page);
        await page.goto(FIXTURE_PATH);

        // The disabled instance still initializes (image swapped in)...
        const disabledImage = page.locator("[data-fixture-instance=\"disabled-report\"] dibs-todo img");
        await expect(disabledImage).toBeVisible();

        // ...but waiting for the sibling instances' reports gives the disabled instance's
        // `connectedCallback` (which runs synchronously, in document order) time to have already
        // skipped dispatch entirely. Neither watched event carries its metadata.
        const [defaultEvents, customEvents] = await Promise.all([
            getReportedEvents(page, "dibs:placeholder"),
            getReportedEvents(page, "dibs:placeholder-fixture-custom"),
        ]);
        const allDetails = [...defaultEvents, ...customEvents];
        expect(
            allDetails.some((detail) =>
                (detail.metadata as { instance?: string } | undefined)?.instance === "disabled-report"
            ),
        )
            .toBe(false);
    });

    test("no React hydration marker is present for any instance", async ({ page }) => {
        await page.goto(FIXTURE_PATH);

        await expect(page.locator("astro-island")).toHaveCount(0);
        for (const instance of ["default", "custom-event", "disabled-report"] as const) {
            await expect(page.locator(`[data-fixture-instance="${instance}"] dibs-todo`)).toBeVisible();
        }
    });
});

test.describe("native ToDo accessibility", () => {
    test("figure/figcaption stay associated and the fallback image conveys its state textually", async ({ page }) => {
        await page.goto(FIXTURE_PATH);

        for (const instance of ["default", "custom-event", "disabled-report"] as const) {
            const figure = page.locator(`[data-fixture-instance="${instance}"] figure`);
            const figcaption = page.locator(`[data-fixture-instance="${instance}"] figcaption`);

            const describedBy = await figure.getAttribute("aria-describedby");
            expect(describedBy).toBeTruthy();
            await expect(figcaption).toHaveAttribute("id", describedBy!);
            await expect(figcaption).not.toHaveText("");

            const image = page.locator(`[data-fixture-instance="${instance}"] img`);
            await expect(image).toHaveAttribute("alt", /.+/);
        }
    });
});
