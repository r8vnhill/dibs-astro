import type { ShikiTransformer } from "shiki";
import { assignMergedClassName } from "./class-tokens";
import {
    appendInlineStyle,
    getMetaKey,
    parseInlineLineColorDirective,
} from "./line-text-color-helpers";

const LINE_COLOR_CLASS = "line-colored";

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
