import { tabInstances, TabsController } from "./controller";

/**
 * Initializes all top-level Starwind tab components on the page.
 *
 * This function:
 * - Selects all elements with the `.starwind-tabs` class.
 * - Skips nested tab instances (i.e., tabs inside tab panels).
 * - Prevents duplicate initialization by checking `tabInstances`.
 * - Creates a new `TabsController` for each uninitialized, non-nested tab container.
 *
 * Typically called on initial page load and after navigation (e.g., `astro:after-swap`).
 */
export function initStarwindTabs(): void {
  document
    .querySelectorAll<HTMLElement>(".starwind-tabs")
    .forEach((tabs, idx) => {
      // Avoid initializing nested tab groups (e.g., inside tab content).
      const isNested = !!tabs.closest("[data-tabs-content]");

      // Skip if already initialized.
      if (!isNested && !tabInstances.has(tabs)) {
        tabInstances.set(tabs, new TabsController(tabs, idx));
      }
    });
}
