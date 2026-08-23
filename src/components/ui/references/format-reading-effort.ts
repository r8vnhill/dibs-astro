import type { ResolvedReadingEffort } from "~/lib/readings/reading-effort";

/**
 * Formats whole minutes as a compact duration: `~ 5m` below an hour, `~ 1h` on an exact hour, `~ 1h15m` for an
 * hour-plus-minutes. `durationMinutes` is already a whole-minute editorial value, so it is never rounded again
 * here, and seconds never appear.
 */
function formatDuration(minutes: number): string {
    if (minutes < 60) return `~ ${minutes}m`;

    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder === 0 ? `~ ${hours}h` : `~ ${hours}h${remainder}m`;
}

/** Applies Spanish singular/plural agreement: `1 página` vs. `12 páginas`. */
function formatPages(pages: number): string {
    return pages === 1 ? "1 página" : `${pages} páginas`;
}

/**
 * Translates a resolved reading effort into the compact student-facing Spanish representation shown next to
 * each lesson reading, e.g. `~ 1h15m`, `12 páginas`, `≈ 8 min`, or `No disponible`.
 *
 * This is the only place in the codebase that owns the Spanish wording for reading effort — keep localized
 * strings out of `~/lib/readings/reading-effort`, which resolves the semantic value this function formats.
 */
export function formatReadingEffort(effort: ResolvedReadingEffort): string {
    switch (effort.kind) {
        case "duration":
            return formatDuration(effort.minutes);
        case "pages":
            return formatPages(effort.pages);
        case "estimated-reading-time":
            return `≈ ${effort.minutes} min`;
        case "unavailable":
            return "No disponible";
    }
}
