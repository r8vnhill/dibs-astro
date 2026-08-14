import ReadingTime from "$components/reading-time/ReadingTime.astro";
import { createAstroRenderer } from "$test-utils/astro-render";
import { beforeAll, expect, suite, test } from "vitest";

suite("given a static reading-time estimate", () => {
    let renderReadingTime: Awaited<ReturnType<typeof createAstroRenderer<{ minutes: number }>>>;

    beforeAll(async () => {
        renderReadingTime = await createAstroRenderer<{ minutes: number }>(ReadingTime);
    });

    test("then it renders the estimate without live-region semantics", async () => {
        const html = await renderReadingTime({ minutes: 11 });

        expect(html).toContain("11");
        expect(html).not.toContain("aria-live");
        expect(html).not.toContain("client:");
    });
});
