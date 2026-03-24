export type PageReference = {
    start: number;
    end?: number;
};

export const isValidPageNumber = (value: number): boolean => Number.isInteger(value) && value > 0;

export const pageReferenceFromBounds = (
    start?: number,
    end?: number,
): PageReference | undefined => {
    if (start === undefined) return undefined;

    return {
        start,
        ...(end !== undefined ? { end } : {}),
    };
};

export const normalizePageReference = (
    pages?: PageReference,
): PageReference | null => {
    if (!pages || !isValidPageNumber(pages.start)) return null;
    if (pages.end === undefined) return { start: pages.start };
    if (!isValidPageNumber(pages.end)) return null;

    return pages.start <= pages.end
        ? { start: pages.start, end: pages.end }
        : { start: pages.end, end: pages.start };
};

export const formatPageReference = (pages?: PageReference): string | null => {
    const normalized = normalizePageReference(pages);
    if (!normalized) return null;

    return normalized.end === undefined || normalized.start === normalized.end
        ? `p. ${normalized.start}`
        : `pp. ${normalized.start}-${normalized.end}`;
};
