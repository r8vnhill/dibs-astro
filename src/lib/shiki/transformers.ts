import type { ShikiTransformer } from "shiki";

const splitClasses = (value: string | undefined) => value?.split(/\s+/u).filter(Boolean) ?? [];

const normalizeClassList = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.map(String).flatMap(splitClasses);
    }
    if (typeof value === "string") {
        return splitClasses(value);
    }
    return [];
};

const mergeClasses = (existing: unknown, extras: string[]): string[] => {
    const classSet = new Set(normalizeClassList(existing));
    for (const extra of extras) {
        if (extra) classSet.add(extra);
    }
    return Array.from(classSet);
};

export function applyTailwindClasses({
    pre = [],
    code = [],
}: {
    pre?: string[];
    code?: string[];
}): ShikiTransformer {
    const preClasses = pre.filter(Boolean);
    const codeClasses = code.filter(Boolean);

    return {
        name: "tailwind-class-injector",
        pre(node) {
            if (!preClasses.length) return;
            node.properties.className = mergeClasses(
                node.properties.className ?? node.properties.class,
                preClasses,
            );
            delete node.properties.class;
        },
        code(node) {
            if (!codeClasses.length) return;
            node.properties.className = mergeClasses(
                node.properties.className ?? node.properties.class,
                codeClasses,
            );
            delete node.properties.class;
        },
    } satisfies ShikiTransformer;
}

const LINE_COLOR_CLASS = "line-colored";
const inlineLineColorPattern =
    /^(?<content>.*?)(?:\s+(?:#|\/\/|;|--)\s*)?\[!code\s+color:(?<color>[^\]]+)\]\s*$/u;
const safeCssColorPattern = /^[a-zA-Z0-9#(),.%/\s+-]{1,64}$/u;

const sanitizeCssColor = (value: string): string | null => {
    const normalized = value.trim();
    if (!normalized) return null;
    if (!safeCssColorPattern.test(normalized)) return null;
    if (normalized.includes(";")) return null;
    return normalized;
};

const appendInlineStyle = (existing: unknown, declaration: string): string => {
    const style = typeof existing === "string" ? existing.trim() : "";
    if (!style) return `${declaration};`;
    const suffix = style.endsWith(";") ? "" : ";";
    return `${style}${suffix}${declaration};`;
};

export function transformerNotationLineTextColor(): ShikiTransformer {
    const lineColorsByMeta = new WeakMap<object, Map<number, string>>();

    return {
        name: "notation-line-text-color",
        preprocess(code) {
            const lines = code.split("\n");
            const lineColors = new Map<number, string>();

            for (const [index, line] of lines.entries()) {
                const match = line.match(inlineLineColorPattern);
                if (!match) continue;

                const color = sanitizeCssColor(match.groups?.color ?? "");
                if (!color) continue;

                lineColors.set(index + 1, color);
                lines[index] = (match.groups?.content ?? "").replace(/\s+$/u, "");
            }

            lineColorsByMeta.set(this.meta as object, lineColors);
            return lines.join("\n");
        },
        line(node, lineNumber) {
            const lineColors = lineColorsByMeta.get(this.meta as object);
            const color = lineColors?.get(lineNumber);
            if (!color) return;

            node.properties.className = mergeClasses(
                node.properties.className ?? node.properties.class,
                [LINE_COLOR_CLASS],
            );
            node.properties.style = appendInlineStyle(
                node.properties.style,
                `--code-line-text-color:${color}`,
            );
            delete node.properties.class;
        },
    } satisfies ShikiTransformer;
}
