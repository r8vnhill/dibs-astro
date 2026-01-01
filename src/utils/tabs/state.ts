/**
 * Represents the possible visual and accessibility states of a tab or tab panel.
 *
 * These values are used to toggle attributes such as `data-state`, `aria-selected`, and visibility for
 * triggers and their corresponding content panels.
 */
export const enum TabState {
    /** The tab is selected and the corresponding panel is shown. */
    Active = "active",

    /** The tab is not selected and its panel is hidden. */
    Inactive = "inactive",
}
