import { describe, expect, test } from "vitest";
import { DEFAULT_LOCALE_PROFILE, getLocaleProfile } from "../locale-profile";

describe("given the Spanish UI locale", () => {
    test("then its profile preserves document, formatting, and Open Graph metadata", () => {
        expect(DEFAULT_LOCALE_PROFILE).toEqual({
            htmlLanguage: "es",
            formatLocale: "es-CL",
            openGraphLocale: "es_CL",
        });
    });
});

describe("given a non-UI citation language", () => {
    test.each([
        ["en", "en_GB"],
        ["en-GB", "en_GB"],
        ["unknown", "es_CL"],
    ])("then %s resolves its established Open Graph profile", (language, openGraphLocale) => {
        expect(getLocaleProfile(language).openGraphLocale).toBe(openGraphLocale);
    });
});
