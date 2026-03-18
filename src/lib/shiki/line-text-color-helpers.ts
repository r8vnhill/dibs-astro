const inlineLineColorPattern =
    /^(?<content>.*?)(?:\s+(?:#|\/\/|;|--)\s*)?\[!code\s+color:(?<color>[^\]]+)\]\s*$/u;
const conservativeCssColorPattern = /^[a-zA-Z0-9#(),.%/\s+-]{1,64}$/u;
const fallbackMetaKey = {};

export interface ParsedLineColorDirective {
    content: string;
    color: string;
}

export const getMetaKey = (meta: unknown): object =>
    typeof meta === "object" && meta !== null ? meta : fallbackMetaKey;

export const sanitizeCssColor = (value: string): string | null => {
    const normalized = value.trim();
    if (!normalized) return null;
    if (!conservativeCssColorPattern.test(normalized)) return null;
    if (normalized.includes(";")) return null;
    return normalized;
};

export const parseInlineLineColorDirective = (
    line: string,
): ParsedLineColorDirective | null => {
    const match = line.match(inlineLineColorPattern);
    if (!match) return null;

    const color = sanitizeCssColor(match.groups?.color ?? "");
    if (!color) return null;

    return {
        content: (match.groups?.content ?? "").replace(/\s+$/u, ""),
        color,
    };
};

export const appendInlineStyle = (existing: unknown, declaration: string): string => {
    const style = typeof existing === "string" ? existing.trim() : "";
    if (!style) return `${declaration};`;
    const suffix = style.endsWith(";") ? "" : ";";
    return `${style}${suffix}${declaration};`;
};
