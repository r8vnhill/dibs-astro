import { beforeEach, describe, expect, test } from "vitest";
import { type AstroRender, createAstroRenderer } from "../../../../test-utils/astro-render";
import Video from "../Video.astro";

type VideoProps = {
    title?: string;
    url: string;
    platform?: string;
    platformUrl?: string;
    author?: string;
    date?: string;
};

let renderVideo: AstroRender<VideoProps>;

describe.concurrent("Video.astro render", () => {
    beforeEach(async () => {
        renderVideo = await createAstroRenderer<VideoProps>(Video);
    });

    test("renders props only", async () => {
        const html = await renderVideo({
            title: "Nushell: A new type of shell!",
            url: "https://www.youtube.com/watch?v=GPqV6rLfKR4",
            platform: "Dispatch",
            platformUrl: "https://www.youtube.com/",
            author: "Quien presenta",
            date: "2024-11-29",
        });

        expect(html).toContain("Nushell: A new type of shell!");
        expect(html).toContain("Dispatch");
        expect(html).toContain("Quien presenta");
        expect(html).toContain("2024-11-29");
        expect(html).toContain('href="https://www.youtube.com/"');
        expect(html).toContain(">en<");
        expect(html).toContain(">por<");
    });

    test("prefers meaningful slot content over props", async () => {
        const html = await renderVideo(
            {
                title: "Título base",
                url: "https://example.com/video",
                platform: "Plataforma base",
                author: "Autor base",
            },
            {
                slots: {
                    title: "Título desde slot",
                    platform: "Plataforma desde slot",
                    author: "Autoría desde slot",
                },
            },
        );

        expect(html).toContain("Título desde slot");
        expect(html).toContain("Plataforma desde slot");
        expect(html).toContain("Autoría desde slot");
        expect(html).not.toContain("Título base");
        expect(html).not.toContain("Plataforma base");
        expect(html).not.toContain("Autor base");
    });

    test("renders description when present", async () => {
        const html = await renderVideo(
            {
                title: "Video",
                url: "https://example.com/video",
            },
            {
                slots: {
                    description: "Descripción de video",
                },
            },
        );

        expect(html).toContain("Descripción de video");
    });
});
