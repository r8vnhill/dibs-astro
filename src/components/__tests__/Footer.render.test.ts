import { load } from "cheerio";
import { expect, suite, test } from "vitest";
import { createAstroRenderer } from "~/test-utils/astro-render";
import { site } from "~/utils";
import Footer from "../Footer.astro";

async function renderFooter(locals: App.Locals = {}) {
    const render = await createAstroRenderer(Footer);
    return load(await render({}, { locals }));
}

suite("given the DIBS footer adapter", () => {
    test("then it preserves the native landmark and configured credits", async () => {
        const $ = await renderFooter();
        const paragraphs = $("footer > div > p").toArray().map((paragraph) => $(paragraph).text());

        expect($("footer")).toHaveLength(1);
        expect($("footer").attr("role")).toBe("contentinfo");
        expect(paragraphs[0]).toContain(site.COPYRIGHT_HOLDER.name);
        expect(paragraphs[1]).toContain("Hecho con Astro");
        expect(paragraphs[2]).toContain("@ravenhill/astro-icons");
        expect(paragraphs[2]).toContain("Phosphor Icons");
        expect(paragraphs[2]).toContain("Simple Icons");
    });

    test("then current external-link attributes remain observable", async () => {
        const $ = await renderFooter();

        expect($("footer a[target='_blank']")).toHaveLength(5);
        $("footer a[target='_blank']").each((_, link) => {
            expect($(link).attr("rel")).toBe("noopener noreferrer");
        });
    });

    test("then PDF rendering marks the DIBS adapter for export hiding", async () => {
        const $ = await renderFooter({ lessonRenderMode: "pdf" });

        expect($("footer").attr("data-export-hidden")).toBe("true");
    });
});
