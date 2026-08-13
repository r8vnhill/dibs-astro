/**
 * Presentation metadata for each supported UI locale.
 *
 * Route selection, document language, regional formatting and Open Graph values intentionally
 * remain separate: adding a UI locale must define every presentation concern explicitly.
 */
export const UI_LOCALE = "es" as const;

export type UiLocale = typeof UI_LOCALE;

export type LocaleProfile = Readonly<{
    htmlLanguage: string;
    formatLocale: string;
    openGraphLocale: string;
}>;

const localeProfiles = {
    es: {
        htmlLanguage: "es",
        formatLocale: "es-CL",
        openGraphLocale: "es_CL",
    },
} as const satisfies Record<UiLocale, LocaleProfile>;

export const DEFAULT_LOCALE_PROFILE = localeProfiles[UI_LOCALE];

export function getLocaleProfile(locale: string = UI_LOCALE): LocaleProfile {
    const normalized = locale.trim().toLowerCase();

    if (normalized === "es" || normalized.startsWith("es-")) return localeProfiles.es;

    // Citation metadata may legitimately describe English source material even while English is
    // not a selectable UI locale. Preserve that existing metadata contract without enabling UI
    // routing or switching.
    if (normalized === "en" || normalized.startsWith("en-")) {
        return {
            htmlLanguage: "en",
            formatLocale: "en-GB",
            openGraphLocale: "en_GB",
        };
    }

    return DEFAULT_LOCALE_PROFILE;
}
