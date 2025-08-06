/**
 * Prefix used for custom tab synchronization events and storage keys.
 *
 * This value is used to namespace events and localStorage keys to prevent collisions between
 * unrelated tab groups.
 */
export const TAB_SYNC_EVENT_PREFIX = "starwind-tabs-sync";

/**
 * Type alias representing a valid tab identifier.
 *
 * Typically corresponds to the value of a tab's `data-value` attribute.
 */
export type TabValue = string;

/**
 * Structure of the detail payload for a tab sync event.
 *
 * Contains the tab `value` that should be activated across synced tab groups.
 */
export interface TabsSyncEventDetail {
  value: TabValue;
}

/**
 * Custom event type used to broadcast tab synchronization across components.
 *
 * The `type` must follow the pattern `starwind-tabs-sync:<syncKey>`, which allows grouping of
 * related tab sets using a shared `syncKey`.
 */
export interface TabsSyncEvent extends CustomEvent<TabsSyncEventDetail> {
  type: `${typeof TAB_SYNC_EVENT_PREFIX}:${string}`;
}

/**
 * Generates a namespaced key for localStorage based on the tab group ID and sync key.
 *
 * This is used to persist the selected tab across page reloads or to retrieve the last active tab
 * for synchronized groups.
 *
 * @param tabsId - Unique DOM identifier for the tab group (e.g. `starwind-tabs0`)
 * @param syncKey - Optional synchronization key used to link multiple tab groups
 * @returns A storage key string, namespaced with the sync event prefix
 */
export function getStorageKey(tabsId: string, syncKey?: string): string {
  return syncKey
    ? `${TAB_SYNC_EVENT_PREFIX}-${tabsId}-${syncKey}`
    : `${TAB_SYNC_EVENT_PREFIX}-${tabsId}`;
}
