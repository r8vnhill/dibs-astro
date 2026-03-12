import type { ShikiTransformer } from "shiki";

const LINE_COLOR_CLASS = "line-colored";
const inlineLineColorPattern =
    /^(?<content>.*?)(?:\s+(?:#|\/\/|;|--)\s*)?\[!code\s+color:(?<color>[^\]]+)\]\s*$/u;
const conservativeCssColorPattern = /^[a-zA-Z0-9#(),.%/\s+-]{1,64}$/u;
const fallbackMetaKey = {};

interface ParsedLineColorDirective {
    content: string;
    color: string;
}

const getMetaKey = (meta: unknown): object =>
    typeof meta === "object" && meta !== null ? meta : fallbackMetaKey;

const sanitizeCssColor = (value: string): string | null => {
    const normalized = value.trim();
    if (!normalized) return null;
    if (!conservativeCssColorPattern.test(normalized)) return null;
    if (normalized.includes(";")) return null;
    return normalized;
};

const parseInlineLineColorDirective = (line: string): ParsedLineColorDirective | null => {
    const match = line.match(inlineLineColorPattern);
    if (!match) return null;

    const color = sanitizeCssColor(match.groups?.color ?? "");
    if (!color) return null;

    return {
        content: (match.groups?.content ?? "").replace(/\s+$/u, ""),
        color,
    };
};

const appendInlineStyle = (existing: unknown, declaration: string): string => {
    const style = typeof existing === "string" ? existing.trim() : "";
    if (!style) return `${declaration};`;
    const suffix = style.endsWith(";") ? "" : ";";
    return `${style}${suffix}${declaration};`;
};

const assignMergedClassName = (
    node: { properties: Record<string, unknown> },
    extras: readonly string[],
): void => {
    const existing = node.properties.className ?? node.properties.class;
    const current = Array.isArray(existing)
        ? existing.map(String).flatMap(value => value.split(/\s+/u).filter(Boolean))
        : typeof existing === "string"
          ? existing.split(/\s+/u).filter(Boolean)
          : [];
    const classSet = new Set(current);
    for (const extra of extras) {
        if (extra) classSet.add(extra);
    }
    node.properties.className = Array.from(classSet);
    delete node.properties.class;
};

export function transformerNotationLineTextColor(): ShikiTransformer {
    const lineColorsByMeta = new WeakMap<object, Map<number, string>>();

    return {
        name: "notation-line-text-color",
        preprocess(code) {
            const lines = code.split("\n");
            const lineColors = new Map<number, string>();

            for (const [index, line] of lines.entries()) {
                const parsedDirective = parseInlineLineColorDirective(line);
                if (!parsedDirective) continue;

                lineColors.set(index + 1, parsedDirective.color);
                lines[index] = parsedDirective.content;
            }

            if (lineColors.size > 0) {
                lineColorsByMeta.set(getMetaKey(this.meta), lineColors);
            }

            return lines.join("\n");
        },
        line(node, lineNumber) {
            const metaKey = getMetaKey(this.meta);
            const lineColors = lineColorsByMeta.get(metaKey);
            const color = lineColors?.get(lineNumber);
            if (!color) return;

            assignMergedClassName(node, [LINE_COLOR_CLASS]);
            node.properties.style = appendInlineStyle(
                node.properties.style,
                `--code-line-text-color:${color}`,
            );
        },
    } satisfies ShikiTransformer;
}

export const __testing = {
    appendInlineStyle,
    getMetaKey,
    parseInlineLineColorDirective,
    sanitizeCssColor,
};
