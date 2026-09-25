import type { LocalizedString } from "~/generated/i18n/messages";

/**
 * Localized text needed by the theme switcher UI.
 *
 * This is the framework-neutral vocabulary shared by the Astro component and its callers
 * (the header adapter) so neither side re-declares the shape.
 *
 * - `current`: screen-reader prefix announcing the active selection (e.g. "Tema actual:").
 * - `change`: accessible name / tooltip for the disclosure trigger.
 * - `light` / `dark` / `auto`: visible labels for each selectable option.
 */
export type ThemeLabels = Readonly<{
    current: LocalizedString;
    change: LocalizedString;
    light: LocalizedString;
    dark: LocalizedString;
    auto: LocalizedString;
}>;
