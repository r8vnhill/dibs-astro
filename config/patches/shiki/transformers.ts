import { normalizePropAsString } from "./utils";

/**
 * Default transformer used by the site. Mirrors the previous single-file
 * implementation: normalize wrapper element, merge attributes, rename class
 * names, attach data-language and support diff/inline behavior.
 */
export function createDefaultTransformer({
    inline,
    lang,
    options,
    resolvedLang,
}: {
    inline: boolean;
    lang: string;
    options?: Record<string, any>;
    resolvedLang: string;
}) {
    return {
        pre(node: any) {
            if (inline) {
                node.tagName = "code";
            }

            const {
                class: attrClass,
                style: attrStyle,
                ...rest
            } = options?.attributes ?? {};
            Object.assign(node.properties, rest);

            const classValue = `${normalizePropAsString(node.properties.class) ?? ""}${
                attrClass ? ` ${attrClass}` : ""
            }`;
            const styleValue = `${normalizePropAsString(node.properties.style) ?? ""}${
                attrStyle ? `; ${attrStyle}` : ""
            }`;

            node.properties.class = classValue.replace(/shiki/gu, "astro-code");
            node.properties.dataLanguage = lang;

            if (options?.wrap === false || options?.wrap === undefined) {
                node.properties.style = `${styleValue}; overflow-x: auto;`;
            } else if (options.wrap === true) {
                node.properties.style =
                    `${styleValue}; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;`;
            }
        },
        line(node: any) {
            if (resolvedLang === "diff") {
                const innerSpanNode = node.children[0];
                const innerSpanTextNode = innerSpanNode?.type === "element"
                    && innerSpanNode.children?.[0];

                if (innerSpanTextNode && innerSpanTextNode.type === "text") {
                    const start = innerSpanTextNode.value[0];
                    if (start === "+" || start === "-") {
                        innerSpanTextNode.value = innerSpanTextNode.value.slice(1);
                        innerSpanNode.children.unshift({
                            type: "element",
                            tagName: "span",
                            properties: { style: "user-select: none;" },
                            children: [{ type: "text", value: start }],
                        });
                    }
                }
            }
        },
        code(node: any) {
            if (inline) {
                return node.children[0];
            }
            return undefined;
        },
    };
}
