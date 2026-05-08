import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, test } from "vitest";
import type { RepoRef } from "@ravenhill/site-core";
import { type AstroRender, createAstroRenderer } from "../../../test-utils/astro-render";
import LessonRepoPanel from "../LessonRepoPanel.astro";

interface LessonRepoPanelProps {
    git: RepoRef | readonly RepoRef[];
    platforms?: unknown;
}

const parseHtml = (html: string): Document => new JSDOM(html).window.document;

let renderPanel: AstroRender<LessonRepoPanelProps>;

describe.concurrent("LessonRepoPanel.astro render", () => {
    beforeEach(async () => {
        renderPanel = await createAstroRenderer<LessonRepoPanelProps>(LessonRepoPanel);
    });

    test("renders default platforms for a single repository", async () => {
        const html = await renderPanel({
            git: { user: "r8vnhill", repo: "dibs-scripts" },
        });
        const doc = parseHtml(html);

        const links = [...doc.querySelectorAll("a")];

        expect(links.length).toBe(2);
        expect(
            links.some((link) =>
                link.getAttribute("href")?.includes("gitlab.com/r8vnhill/dibs-scripts")
            ),
        ).toBe(true);
        expect(
            links.some((link) =>
                link.getAttribute("href")?.includes("github.com/r8vnhill/dibs-scripts")
            ),
        ).toBe(true);
    });

    test("renders links for multiple repositories", async () => {
        const html = await renderPanel({
            git: [
                { user: "r8vnhill", repo: "dibs-index" },
                { user: "r8vnhill", repo: "dibs-scripts" },
            ],
            platforms: ["gitlab"],
        });
        const doc = parseHtml(html);

        const links = [...doc.querySelectorAll("a")];
        const hrefs = links.map((link) => link.getAttribute("href") ?? "");

        expect(links.length).toBe(2);
        expect(hrefs).toContain("https://gitlab.com/r8vnhill/dibs-index");
        expect(hrefs).toContain("https://gitlab.com/r8vnhill/dibs-scripts");
    });
});
