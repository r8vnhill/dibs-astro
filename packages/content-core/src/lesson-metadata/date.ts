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

const ISO_SHORT_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DEFAULT_DATE_FORMAT_OPTIONS = {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
} as const satisfies Intl.DateTimeFormatOptions;

function normalizeOptionalText(value?: string): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
}

function assertNever(value: never): never {
    throw new Error(`Unexpected lesson date display result: ${JSON.stringify(value)}`);
}

export function parseIsoShortDate(date?: string): Date | undefined {
    const normalized = normalizeOptionalText(date);
    if (!normalized) {
        return undefined;
    }

    const match = ISO_SHORT_DATE_PATTERN.exec(normalized);
    if (!match) {
        return undefined;
    }

    const [, yearText, monthText, dayText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    const isSameDate = parsed.getUTCFullYear() === year
        && parsed.getUTCMonth() === month - 1
        && parsed.getUTCDate() === day;

    return isSameDate ? parsed : undefined;
}

export const formatDate = (
    date: Date,
    locale = DEFAULT_LESSON_METADATA_LOCALE,
    options: Intl.DateTimeFormatOptions = {},
): string =>
    new Intl.DateTimeFormat(locale, {
        ...DEFAULT_DATE_FORMAT_OPTIONS,
        ...options,
    }).format(date);

export function resolveLessonDateDisplay(
    date?: string,
    locale = DEFAULT_LESSON_METADATA_LOCALE,
    options?: Intl.DateTimeFormatOptions,
): LessonDateDisplayResult {
    const normalized = normalizeOptionalText(date);
    if (!normalized) {
        return { kind: "missing" };
    }

    const parsed = parseIsoShortDate(normalized);
    if (!parsed) {
        return { kind: "passthrough", value: normalized };
    }

    return {
        kind: "formatted",
        value: formatDate(parsed, locale, options),
    };
}

export function formatLessonDate(
    date?: string,
    locale = DEFAULT_LESSON_METADATA_LOCALE,
    options?: Intl.DateTimeFormatOptions,
): string {
    const display = resolveLessonDateDisplay(date, locale, options);

    switch (display.kind) {
        case "missing":
            return UNKNOWN_LESSON_DATE_LABEL;
        case "passthrough":
        case "formatted":
            return display.value;
        default:
            return assertNever(display);
    }
}
