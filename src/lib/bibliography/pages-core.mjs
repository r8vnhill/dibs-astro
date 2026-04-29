const DEFAULT_PAGE_FORMAT = {
    singleLabel: "p.",
    rangeLabel: "pp.",
    separator: "–",
};

export const isValidPageNumber = (value) => Number.isSafeInteger(value) && value > 0;

const toPageNumber = (value) => value !== undefined && isValidPageNumber(value) ? value : undefined;

const toPageReference = (start, end) => ({
    start,
    ...(end !== undefined ? { end } : {}),
});

export function isPageReference(value) {
    if (!value || typeof value !== "object") {
        return false;
    }

    const candidate = value;

    if (typeof candidate.start !== "number" || !isValidPageNumber(candidate.start)) {
        return false;
    }

    if (candidate.end === undefined) {
        return true;
    }

    return typeof candidate.end === "number"
        && isValidPageNumber(candidate.end)
        && candidate.start <= candidate.end;
}

export function parsePageReference(start, end) {
    const pageStart = toPageNumber(start);
    if (pageStart === undefined) return undefined;

    if (end === undefined) return toPageReference(pageStart);

    const pageEnd = toPageNumber(end);
    if (pageEnd === undefined) return undefined;

    return pageStart <= pageEnd
        ? toPageReference(pageStart, pageEnd)
        : toPageReference(pageEnd, pageStart);
}

export const parsePageReferenceInput = (input) => parsePageReference(input?.start, input?.end);

export function formatPageReference(pages, options = DEFAULT_PAGE_FORMAT) {
    if (!pages) return undefined;

    const isSinglePage = pages.end === undefined || pages.start === pages.end;

    return isSinglePage
        ? `${options.singleLabel} ${pages.start}`
        : `${options.rangeLabel} ${pages.start}${options.separator}${pages.end}`;
}
