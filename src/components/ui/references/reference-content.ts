type SlotLike = {
    has(name: string): boolean;
    render(name: string): Promise<string>;
};

export type ResolvedSlotContent = {
    hasContent: boolean;
    html: string;
};

export const SPANISH_REFERENCE_META_LABELS = {
    in: "en",
    by: "por",
} as const;

export const hasMeaningfulContent = (html: string): boolean => {
    const withoutComments = html.replace(/<!--[\s\S]*?-->/g, "");
    const plainText = withoutComments.replace(/<[^>]+>/g, "").trim();
    return plainText.length > 0;
};

// Slots resolved to HTML are authored in-repo and treated as trusted component content.
export const resolveOptionalSlot = async (
    slots: SlotLike,
    name: string,
): Promise<ResolvedSlotContent> => {
    if (!slots.has(name)) return { hasContent: false, html: "" };

    const html = await slots.render(name);
    return {
        hasContent: hasMeaningfulContent(html),
        html,
    };
};
