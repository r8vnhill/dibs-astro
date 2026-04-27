import { type AstroRenderOptions, createAstroRenderer } from "$test-utils/astro-render";
import { type CheerioAPI, load } from "cheerio";
import { expect } from "vitest";

export type ReferenceRenderResult = {
    html: string;
    $: CheerioAPI;
};

export async function renderReference<Props extends object>(
    component: Parameters<typeof createAstroRenderer<Props>>[0],
    props: Props,
    options?: AstroRenderOptions,
): Promise<ReferenceRenderResult> {
    const render = await createAstroRenderer<Props>(component);
    const html = await render(props, options);

    return {
        html,
        $: load(html),
    };
}

export function expectLinkedTitle($: CheerioAPI, href: string, text?: string): void {
    const titleLink = $(`a[href='${href}']`).first();

    expect($(`a[href='${href}']`)).toHaveLength(1);
    expect(titleLink.attr("href")).toBe(href);

    if (text !== undefined) {
        expect(titleLink.text().trim()).toBe(text);
    }
}

export function expectSlotOverridesProp(
    $: CheerioAPI,
    slotSelector: string,
    slotText: string,
    fallbackText: string,
): void {
    const slot = $(slotSelector);
    const exactFallbackMatches = $("*").filter((_, node) => $(node).text().trim() === fallbackText);

    expect(slot).toHaveLength(1);
    expect(slot.text().trim()).toBe(slotText);
    expect(exactFallbackMatches).toHaveLength(0);
}

export function expectInlineMetaLink($: CheerioAPI, href: string, text: string): void {
    const link = $(`a[href='${href}']`);

    expect(link).toHaveLength(1);
    expect(link.text().trim()).toBe(text);
}

export function expectInlineMetaPlainText($: CheerioAPI, text: string): void {
    expect($("li").text()).toContain(text);
    expect($("a").filter((_, node) => $(node).text().trim() === text)).toHaveLength(0);
}

export function expectMetaLabelAbsent($: CheerioAPI, label: string): void {
    expect($("span.text-muted-foreground").filter((_, node) => $(node).text() === label))
        .toHaveLength(0);
}

export function expectDescriptionPresence($: CheerioAPI, expectedText: string): void {
    const description = $("div.text-muted-foreground");

    expect(description).toHaveLength(1);
    expect(description.text()).toContain(expectedText);
}

export function expectDescriptionAbsent($: CheerioAPI): void {
    expect($("div.text-muted-foreground")).toHaveLength(0);
}
