/**
 * Pure geometry for keeping an active table-of-contents entry visible inside its own
 * scrollable container. Deliberately DOM-API-agnostic (no `offsetTop`/`getBoundingClientRect`
 * types) so the browser adapter that reads real geometry can change independently of this
 * contract.
 */

export interface TocScrollContainer {
    /** Current scroll offset of the container, in container content coordinates. */
    scrollTop: number;
    /** Visible height of the container. */
    clientHeight: number;
}

export interface TocScrollItem {
    /** Position of the item's top edge, in the same content coordinates as `scrollTop`. */
    offsetTop: number;
    /** Height of the item. */
    offsetHeight: number;
}

/**
 * Computes the `scrollTop` the container must move to so the item is fully visible, or `null`
 * when no adjustment is needed.
 *
 * When the item is taller than the container, it cannot be fully contained, so the item's top
 * edge is preferred over its bottom edge.
 */
export function computeTocScrollTop(container: TocScrollContainer, item: TocScrollItem): number | null {
    const { scrollTop, clientHeight } = container;
    const { offsetTop, offsetHeight } = item;
    const itemBottom = offsetTop + offsetHeight;
    const containerBottom = scrollTop + clientHeight;
    const oversized = offsetHeight >= clientHeight;

    if (oversized) {
        return offsetTop === scrollTop ? null : offsetTop;
    }

    if (offsetTop < scrollTop) {
        return offsetTop;
    }

    if (itemBottom > containerBottom) {
        return itemBottom - clientHeight;
    }

    return null;
}
