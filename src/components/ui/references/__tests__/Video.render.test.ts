import { describe, expect, test } from "vitest";
import { type AstroRender } from "../../../../test-utils/astro-render";
import { MissingReferenceTitleError, ReferenceContractError } from "../ReferenceContractError";
import Video from "../Video.astro";
import {
    expectDescriptionPresence,
    expectInlineMetaLink,
    expectLinkedTitle,
    expectMetaLabelAbsent,
    expectSlotOverridesProp,
    renderReference,
} from "./reference-render-contracts";

type VideoProps = {
    title?: string;
    url: string;
    platform?: string;
    platformUrl?: string;
    author?: string;
    date?: string;
};

type RenderOptions = Parameters<AstroRender<VideoProps>>[1];
type RenderOverrides = Omit<Partial<VideoProps>, "title"> & { title?: string | undefined };

const BASE_PROPS = {
    title: "Nushell: A new type of shell!",
    url: "https://www.youtube.com/watch?v=GPqV6rLfKR4",
} satisfies VideoProps;

async function renderVideo(
    overrides: RenderOverrides = {},
    options?: RenderOptions,
) {
    const merged = { ...BASE_PROPS, ...overrides };
    const props = merged.title === undefined
        ? (({ title: _title, ...rest }) => rest)(merged)
        : merged;

    return renderReference(Video, props, options);
}

describe.concurrent("Video.astro render", () => {
    test("renders prop-backed title, platform, author, and date", async () => {
        const { $ } = await renderVideo({
            title: "Nushell: A new type of shell!",
            url: "https://www.youtube.com/watch?v=GPqV6rLfKR4",
            platform: "Dispatch",
            platformUrl: "https://www.youtube.com/",
            author: "Quien presenta",
            date: "2024-11-29",
        });

        expectLinkedTitle(
            $,
            "https://www.youtube.com/watch?v=GPqV6rLfKR4",
            "Nushell: A new type of shell!",
        );
        expectInlineMetaLink($, "https://www.youtube.com/", "Dispatch");
        expect($("li").text()).toContain("Quien presenta");
        expect($("li").text()).toContain("(2024-11-29)");
        expect($("span.text-muted-foreground").filter((_, node) => $(node).text() === "en"))
            .toHaveLength(1);
        expect($("span.text-muted-foreground").filter((_, node) => $(node).text() === "por"))
            .toHaveLength(1);
    });

    test("prefers meaningful slot content over props", async () => {
        const { $ } = await renderVideo(
            {
                title: "Título base",
                url: "https://example.com/video",
                platform: "Plataforma base",
                author: "Autor base",
            },
            {
                slots: {
                    title: "<strong data-slot=\"title\">Título desde slot</strong>",
                    platform: "<em data-slot=\"platform\">Plataforma desde slot</em>",
                    author: "<span data-slot=\"author\">Autoría desde slot</span>",
                },
            },
        );

        expectLinkedTitle($, "https://example.com/video", "Título desde slot");
        expectSlotOverridesProp($, "strong[data-slot='title']", "Título desde slot", "Título base");
        expectSlotOverridesProp(
            $,
            "em[data-slot='platform']",
            "Plataforma desde slot",
            "Plataforma base",
        );
        expectSlotOverridesProp($, "span[data-slot='author']", "Autoría desde slot", "Autor base");
    });

    test("omits author and platform labels when their fields are absent", async () => {
        const { $ } = await renderVideo({
            title: "Video",
            url: "https://example.com/video",
        });

        expectMetaLabelAbsent($, "por");
        expectMetaLabelAbsent($, "en");
    });

    test("renders description when present", async () => {
        const { $ } = await renderVideo(
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

        expectDescriptionPresence($, "Descripción de video");
    });

    test("fails when platformUrl is provided without platform", async () => {
        await expect(
            renderVideo({
                title: "Video",
                url: "https://example.com/video",
                platformUrl: "https://example.com/platform",
            }),
        ).rejects.toThrow(ReferenceContractError);
    });

    test("throws when no meaningful title source exists", async () => {
        await expect(
            renderVideo({
                title: undefined,
                url: "https://example.com/video",
            }),
        ).rejects.toThrow(MissingReferenceTitleError);
    });
});
