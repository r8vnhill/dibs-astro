declare const brand: unique symbol;

type Brand<T, Name extends string> = T & {
    readonly [brand]: Name;
};

export type AbsoluteUrl = Brand<string, "AbsoluteUrl">;
export type GitCommitHash = Brand<string, "GitCommitHash">;
export type IsoShortDate = Brand<string, "IsoShortDate">;
export type LessonSourceFile = Brand<string, "LessonSourceFile">;
export type NonEmptyText = Brand<string, "NonEmptyText">;

const GIT_COMMIT_HASH_PATTERN = /^[\da-f]{7,64}$/iu;
const ISO_SHORT_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;
const ABSOLUTE_HTTP_URL_PATTERN = /^https?:\/\//iu;

const trimToUndefined = (value: string): string | undefined => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

const isRealIsoShortDate = (value: string): boolean => {
    const match = ISO_SHORT_DATE_PATTERN.exec(value);
    if (!match) {
        return false;
    }

    const [, yearText, monthText, dayText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    return parsed.getUTCFullYear() === year
        && parsed.getUTCMonth() === month - 1
        && parsed.getUTCDate() === day;
};

export const parseNonEmptyText = (value: string): NonEmptyText | undefined => {
    const trimmed = trimToUndefined(value);
    return trimmed ? trimmed as NonEmptyText : undefined;
};

export function parseAbsoluteUrl(value: string): AbsoluteUrl | undefined {
    const trimmed = trimToUndefined(value);
    if (!trimmed) {
        return undefined;
    }

    try {
        const url = new URL(trimmed);
        return url.protocol === "http:" || url.protocol === "https:"
            ? trimmed as AbsoluteUrl
            : undefined;
    } catch {
        return undefined;
    }
}

export const parseGitCommitHash = (value: string): GitCommitHash | undefined => {
    const trimmed = trimToUndefined(value);
    return trimmed && GIT_COMMIT_HASH_PATTERN.test(trimmed) ? trimmed as GitCommitHash : undefined;
};

export const parseIsoShortDateValue = (value: string): IsoShortDate | undefined => {
    const trimmed = trimToUndefined(value);
    return trimmed && isRealIsoShortDate(trimmed) ? trimmed as IsoShortDate : undefined;
};

export const parseLessonSourceFile = (value: string): LessonSourceFile | undefined => {
    const trimmed = trimToUndefined(value);
    return trimmed && !ABSOLUTE_HTTP_URL_PATTERN.test(trimmed) ? trimmed as LessonSourceFile : undefined;
};
