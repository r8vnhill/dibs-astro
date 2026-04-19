import { LessonHref } from "./value-objects/LessonHref";

export type LessonDateDisplayResult =
    | {
        kind: "missing";
    }
    | {
        kind: "passthrough";
        value: string;
    }
    | {
        kind: "formatted";
        value: string;
    };

export const DEFAULT_LESSON_METADATA_LOCALE = "es-CL";

export const UNKNOWN_LESSON_DATE_LABEL = "sin fecha registrada";

export const normalizeLessonMetadataPathname = (pathname: string): string => {
    const trimmed = pathname.trim();
    if (trimmed.length === 0) {
        return "/";
    }

    const withoutOrigin = trimmed.replace(/^https?:\/\/[^/]+/i, "");
    return LessonHref.create(withoutOrigin).value;
};

export const parseIsoShortDate = (date?: string): Date | undefined => {
    if (!date) {
        return undefined;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return undefined;
    }

    const parsed = new Date(`${date}T00:00:00.000Z`);
    return Number.isNaN(parsed.valueOf()) ? undefined : parsed;
};

export const formatDate = (
    date: Date,
    locale = DEFAULT_LESSON_METADATA_LOCALE,
    options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
    },
): string => {
    return date.toLocaleDateString(locale, options);
};

export const resolveLessonDateDisplay = (
    date?: string,
    locale = DEFAULT_LESSON_METADATA_LOCALE,
    options?: Intl.DateTimeFormatOptions,
): LessonDateDisplayResult => {
    if (!date) {
        return { kind: "missing" };
    }

    const parsed = parseIsoShortDate(date);
    if (!parsed) {
        return { kind: "passthrough", value: date };
    }

    return {
        kind: "formatted",
        value: formatDate(parsed, locale, options),
    };
};

export const formatLessonDate = (
    date?: string,
    locale = DEFAULT_LESSON_METADATA_LOCALE,
    options?: Intl.DateTimeFormatOptions,
): string => {
    const display = resolveLessonDateDisplay(date, locale, options);

    switch (display.kind) {
        case "missing":
            return UNKNOWN_LESSON_DATE_LABEL;
        case "passthrough":
        case "formatted":
            return display.value;
    }
};
