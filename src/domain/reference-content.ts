export type ResolvedSlotContent =
    | {
        kind: "empty";
        html: "";
    }
    | {
        kind: "meaningful";
        html: string;
    };

export type ResolvedInlineField =
    | {
        kind: "missing";
    }
    | {
        kind: "slot";
        html: string;
    }
    | {
        kind: "text";
        text: string;
    };

export type ResolvedLinkedInlineField =
    | {
        kind: "missing";
    }
    | {
        kind: "slot";
        html: string;
    }
    | {
        kind: "text";
        text: string;
    }
    | {
        kind: "link";
        text: string;
        href: string;
    };

export type ResolvedRequiredInlineField =
    | Extract<ResolvedInlineField, { kind: "slot" | "text" }>
    | {
        kind: "invalid";
        reason: "missing-title";
    };

const EMPTY_SLOT_CONTENT: ResolvedSlotContent = { kind: "empty", html: "" };

export const stripHtmlComments = (html: string): string => html.replace(/<!--[\s\S]*?-->/g, "");

export const stripHtmlTags = (html: string): string => html.replace(/<[^>]+>/g, "");

export const decodeHtmlWhitespaceEntities = (text: string): string =>
    text.replace(/&(nbsp|#160|#xA0);/gi, " ");

export const normalizeInlineWhitespace = (text: string): string => text.replace(/\s+/g, " ").trim();

export function normalizeFallbackText(text?: string): string | undefined {
    if (text === undefined) {
        return undefined;
    }

    const normalizedText = normalizeInlineWhitespace(decodeHtmlWhitespaceEntities(text));

    return normalizedText || undefined;
}

export function normalizeHref(href?: string): string | undefined {
    if (href === undefined) {
        return undefined;
    }

    const normalizedHref = href.trim();

    return normalizedHref || undefined;
}

export function hasMeaningfulTextContent(html: string): boolean {
    const withoutComments = stripHtmlComments(html);
    const plainText = stripHtmlTags(withoutComments);
    const decodedText = decodeHtmlWhitespaceEntities(plainText);
    const normalizedText = normalizeInlineWhitespace(decodedText);

    return normalizedText.length > 0;
}

export function classifyRenderedReferenceContent(html: string): ResolvedSlotContent {
    return hasMeaningfulTextContent(html)
        ? { kind: "meaningful", html }
        : EMPTY_SLOT_CONTENT;
}

export const isMeaningfulSlotContent = (
    content: ResolvedSlotContent,
): content is Extract<ResolvedSlotContent, { kind: "meaningful" }> => content.kind === "meaningful";

export function resolveInlineField(
    slotContent: ResolvedSlotContent,
    fallbackText?: string,
): ResolvedInlineField {
    if (isMeaningfulSlotContent(slotContent)) {
        return { kind: "slot", html: slotContent.html };
    }

    const normalizedFallbackText = normalizeFallbackText(fallbackText);

    if (normalizedFallbackText) {
        return { kind: "text", text: normalizedFallbackText };
    }

    return { kind: "missing" };
}

export function resolveRequiredInlineField(
    slotContent: ResolvedSlotContent,
    fallbackText?: string,
): ResolvedRequiredInlineField {
    const resolvedField = resolveInlineField(slotContent, fallbackText);

    if (resolvedField.kind === "missing") {
        return { kind: "invalid", reason: "missing-title" };
    }

    return resolvedField;
}

export function resolveLinkedInlineField(
    slotContent: ResolvedSlotContent,
    fallbackText?: string,
    fallbackUrl?: string,
): ResolvedLinkedInlineField {
    if (isMeaningfulSlotContent(slotContent)) {
        return { kind: "slot", html: slotContent.html };
    }

    const normalizedFallbackText = normalizeFallbackText(fallbackText);

    if (!normalizedFallbackText) {
        return { kind: "missing" };
    }

    const normalizedHref = normalizeHref(fallbackUrl);

    if (normalizedHref) {
        return { kind: "link", text: normalizedFallbackText, href: normalizedHref };
    }

    return { kind: "text", text: normalizedFallbackText };
}
