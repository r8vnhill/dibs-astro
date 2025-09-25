import { tabInstances, TabsController } from "./controller";

let tabsIdCounter = 0; // global counter

export function initStarwindTabs(): void {
  document.querySelectorAll<HTMLElement>(".starwind-tabs").forEach((tabs) => {
    const isNested = !!tabs.closest("[data-tabs-content]");
    if (!isNested && !tabInstances.has(tabs)) {
      // uses global counter
      const id = tabsIdCounter++;
      tabInstances.set(tabs, new TabsController(tabs, id));
    }
  });
}

export function nextTabsId(): number {
  return tabsIdCounter++;
}
