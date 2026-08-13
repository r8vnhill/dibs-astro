/** A host-independent interpretation of a stored lesson date. */
export type LessonDate =
    | {
        kind: "missing";
    }
    | {
        kind: "passthrough";
        value: string;
    }
    | {
        kind: "known";
        value: Date;
    };

const ISO_SHORT_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function normalizeOptionalText(value?: string): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
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

export function resolveLessonDate(date?: string): LessonDate {
    const normalized = normalizeOptionalText(date);
    if (!normalized) {
        return { kind: "missing" };
    }

    const parsed = parseIsoShortDate(normalized);
    if (!parsed) {
        return { kind: "passthrough", value: normalized };
    }

    return {
        kind: "known",
        value: parsed,
    };
}
