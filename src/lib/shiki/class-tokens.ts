export type ClassValue = string | readonly string[] | null | undefined;

export interface ClassableNode {
    properties: {
        class?: ClassValue;
        className?: ClassValue;
        [key: string]: unknown;
    };
}

export const splitClassTokens = (value: string | undefined): string[] =>
    value?.split(/\s+/u).filter(Boolean) ?? [];

export const toClassTokens = (value: ClassValue): string[] => {
    if (Array.isArray(value)) {
        return value.flatMap(item => splitClassTokens(item));
    }
    if (typeof value === "string") {
        return splitClassTokens(value);
    }
    return [];
};

export const appendUniqueClasses = (
    existing: ClassValue,
    extras: ClassValue,
): string[] => {
    const classSet = new Set(toClassTokens(existing));
    for (const extra of toClassTokens(extras)) {
        classSet.add(extra);
    }
    return Array.from(classSet);
};

export const assignMergedClassName = (
    node: ClassableNode,
    extras: ClassValue,
): void => {
    node.properties.className = appendUniqueClasses(
        node.properties.className ?? node.properties.class,
        extras,
    );
    delete node.properties.class;
};
