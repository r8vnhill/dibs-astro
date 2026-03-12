import type { ShikiTransformer } from "shiki";

export interface TailwindClassTransformerOptions {
    pre?: readonly string[];
    code?: readonly string[];
}

const splitClassTokens = (value: string | undefined) =>
    value?.split(/\s+/u).filter(Boolean) ?? [];

const toClassTokens = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.map(String).flatMap(splitClassTokens);
    }
    if (typeof value === "string") {
        return splitClassTokens(value);
    }
    return [];
};

const appendUniqueClasses = (existing: unknown, extras: readonly string[]): string[] => {
    const classSet = new Set(toClassTokens(existing));
    for (const extra of extras) {
        if (extra) classSet.add(extra);
    }
    return Array.from(classSet);
};

const assignMergedClassName = (
    node: { properties: Record<string, unknown> },
    extras: readonly string[],
): void => {
    node.properties.className = appendUniqueClasses(
        node.properties.className ?? node.properties.class,
        extras,
    );
    delete node.properties.class;
};

export function applyTailwindClasses({
    pre = [],
    code = [],
}: TailwindClassTransformerOptions): ShikiTransformer {
    const preClasses = pre.filter(Boolean);
    const codeClasses = code.filter(Boolean);

    return {
        name: "tailwind-class-injector",
        pre(node) {
            if (!preClasses.length) return;
            assignMergedClassName(node, preClasses);
        },
        code(node) {
            if (!codeClasses.length) return;
            assignMergedClassName(node, codeClasses);
        },
    } satisfies ShikiTransformer;
}

export const __testing = {
    appendUniqueClasses,
    assignMergedClassName,
    splitClassTokens,
    toClassTokens,
};
