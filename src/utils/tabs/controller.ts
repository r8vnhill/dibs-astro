import { resolveKeyDirection } from "./dom-utils";
import {
  TAB_SYNC_EVENT_PREFIX,
  type TabsSyncEvent,
  type TabValue,
} from "./events";
import { TabState } from "./state";

/**
 * A map to track all initialized tab groups and their controllers.
 * Uses a WeakMap to allow garbage collection of unmounted tab groups.
 */
export const tabInstances = new WeakMap<HTMLElement, TabsController>();

/**
 * Controls a single tab group instance.
 * Handles initialization, ARIA attributes, keyboard navigation, syncing, and nested tabs.
 */
export class TabsController {
  private tabs: HTMLElement;
  private triggers: HTMLButtonElement[];
  private contents: HTMLElement[];
  private currentTabIndex: number = 0;
  private tabsId: string;
  private syncKey: string | undefined;
  private storageKey: string;
  private valueToTriggerMap = new Map<string, HTMLButtonElement>();
  private valueToContentMap = new Map<string, HTMLElement>();

  /**
   * Creates a new controller for a group of tabs.
   *
   * @param tabs - The root element containing the tab group.
   * @param idx - A unique number used to assign IDs for accessibility.
   */
  constructor(tabs: HTMLElement, idx: number) {
    this.tabs = tabs;
    this.triggers = Array.from(
      tabs.querySelectorAll("[data-tabs-list] > [data-tabs-trigger]")
    );
    this.contents = Array.from(tabs.querySelectorAll("[data-tabs-content]"));
    this.tabsId = `starwind-tabs${idx}`;
    this.syncKey = tabs.dataset.syncKey;

    this.storageKey = this.syncKey
      ? `${TAB_SYNC_EVENT_PREFIX}-${this.tabsId}-${this.syncKey}`
      : `${TAB_SYNC_EVENT_PREFIX}-${this.tabsId}`;

    // Map values to their corresponding elements
    this.triggers.forEach((trigger) => {
      const value = trigger.getAttribute("data-value") ?? "";
      this.valueToTriggerMap.set(value, trigger);
    });

    this.contents.forEach((content) => {
      const value = content.getAttribute("data-value") ?? "";
      this.valueToContentMap.set(value, content);
    });

    this.assignAriaAttributes();
    this.initializeActiveTab();
    this.addEventListeners();
    this.setupSyncListener();
  }

  /**
   * Public method to programmatically activate a tab by value.
   */
  public activate(value: string): void {
    this.activateTab(value);
    this.setTabIndex();
    this.dispatchSyncEvent(value);
  }

  /**
   * Disposes the controller and removes all event listeners.
   */
  public dispose(): void {
    this.triggers.forEach((trigger) => {
      trigger.removeEventListener("click", this.handleClick);
      trigger.removeEventListener("keydown", this.handleKeyNavigation);
    });
    tabInstances.delete(this.tabs);
  }

  /**
   * Assigns unique ARIA IDs and attributes to triggers and contents for accessibility.
   */
  private assignAriaAttributes(): void {
    this.triggers.forEach((trigger, idx) => {
      const value = trigger.getAttribute("data-value");
      if (!value) return;

      const triggerId = `${this.tabsId}-t${idx}`;
      const contentId = `${this.tabsId}-c${idx}`;
      const content = this.valueToContentMap.get(value);

      trigger.id = triggerId;
      trigger.setAttribute("role", "tab");
      trigger.setAttribute("aria-controls", contentId);

      if (content) {
        content.id = contentId;
        content.setAttribute("role", "tabpanel");
        content.setAttribute("aria-labelledby", triggerId);
      }
    });
  }

  /**
   * Initializes the tab group with a default or persisted active tab.
   */
  private initializeActiveTab(): void {
    const initial =
      (this.syncKey && localStorage.getItem(this.storageKey)) ||
      this.tabs.dataset.defaultValue;

    const trigger = this.valueToTriggerMap.get(initial ?? "");
    const index = trigger ? this.triggers.indexOf(trigger) : 0;
    const fallback = this.triggers[index]?.getAttribute("data-value");

    if (fallback) {
      this.activateTab(fallback);
      this.currentTabIndex = index;
      this.setTabIndex();
    }
  }

  /**
   * Listens for synchronization events from other tab groups.
   */
  private setupSyncListener(): void {
    if (!this.syncKey) return;

    document.addEventListener(
      `${TAB_SYNC_EVENT_PREFIX}:${this.syncKey}`,
      (e) => {
        const value = (e as TabsSyncEvent).detail.value;
        const trigger = this.valueToTriggerMap.get(value);
        const index = trigger ? this.triggers.indexOf(trigger) : -1;
        if (index !== -1) {
          this.activateTab(value);
          this.currentTabIndex = index;
          this.setTabIndex();
        }
      }
    );
  }

  /**
   * Updates the `tabindex` attributes for keyboard navigation.
   */
  private setTabIndex(): void {
    this.triggers.forEach((trigger, index) => {
      trigger.setAttribute(
        "tabindex",
        index === this.currentTabIndex ? "0" : "-1"
      );
    });
  }

  /**
   * Dispatches a synchronization event to other tab groups with the same sync key.
   */
  private dispatchSyncEvent(value: TabValue): void {
    if (!this.syncKey) return;

    localStorage.setItem(this.storageKey, value);
    document.dispatchEvent(
      new CustomEvent(`${TAB_SYNC_EVENT_PREFIX}:${this.syncKey}`, {
        detail: { value },
      })
    );
  }

  /**
   * Handles arrow key, Home, and End navigation between tabs.
   */
  private handleKeyNavigation = (e: KeyboardEvent): void => {
    const dir = resolveKeyDirection(e.key);
    if (dir === undefined) return;

    e.preventDefault();
    let newIndex = this.currentTabIndex;

    if (dir === "start") {
      newIndex = 0;
    } else if (dir === "end") {
      newIndex = this.triggers.length - 1;
    } else {
      // Skip disabled buttons
      for (let i = 1; i < this.triggers.length; i++) {
        const next =
          (this.currentTabIndex + i * dir + this.triggers.length) %
          this.triggers.length;
        if (!this.triggers[next]?.disabled) {
          newIndex = next;
          break;
        }
      }
    }

    const newTrigger = this.triggers[newIndex];
    if (!newTrigger) return;

    const value = newTrigger.getAttribute("data-value");
    if (!value) return;

    this.activateTab(value);
    this.currentTabIndex = newIndex;
    this.setTabIndex();
    newTrigger.focus();
    this.dispatchSyncEvent(value);
  };

  /**
   * Handles click events on tab triggers.
   */
  private handleClick = (e: MouseEvent): void => {
    const trigger = e.currentTarget as HTMLButtonElement;
    const index = this.triggers.indexOf(trigger);
    const value = trigger.getAttribute("data-value");
    if (!value) return;

    this.activate(value);
    this.currentTabIndex = index;
  };

  /**
   * Applies the visual and ARIA changes to activate the selected tab and panel.
   */
  private activateTab(value: TabValue): void {
    const trigger = this.valueToTriggerMap.get(value);
    const content = this.valueToContentMap.get(value);

    if (!trigger || !content) {
      console.warn(`TabController: invalid value "${value}"`);
      return;
    }

    // Update trigger state
    this.triggers.forEach((t) => {
      const active = t === trigger;
      t.setAttribute(
        "data-state",
        active ? TabState.Active : TabState.Inactive
      );
      t.setAttribute("aria-selected", String(active));
    });

    // Update content state
    this.contents.forEach((c) => {
      const active = c === content;
      c.setAttribute(
        "data-state",
        active ? TabState.Active : TabState.Inactive
      );
      c.hidden = !active;
    });

    // Initialize any nested tab groups inside the activated content
    content.querySelectorAll(".starwind-tabs").forEach((nested, idx) => {
      if (nested instanceof HTMLElement && !tabInstances.has(nested)) {
        tabInstances.set(nested, new TabsController(nested, 1000 + idx));
      }
    });
  }

  /**
   * Adds listeners to handle tab activation via click or keyboard input.
   */
  private addEventListeners(): void {
    this.triggers.forEach((trigger) => {
      trigger.addEventListener("click", this.handleClick);
      trigger.addEventListener("keydown", this.handleKeyNavigation);
    });
  }
}
