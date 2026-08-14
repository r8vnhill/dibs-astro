import type { TocScrollItem } from "./lesson-toc-scroll";

/**
 * Converts real browser geometry into the container-content coordinates
 * {@link TocScrollItem} expects, without depending on `offsetParent` (unreliable under a
 * `position: sticky` ancestor) or `offsetTop`/`offsetHeight`.
 */
export interface TocMeasurableContainer {
    readonly scrollTop: number;
    /** Width of the container's top border, so the scrollport origin excludes it. */
    readonly clientTop: number;
    getBoundingClientRect(): { readonly top: number };
}

export interface TocMeasurableItem {
    getBoundingClientRect(): { readonly top: number; readonly height: number };
}

export function measureTocEntry(container: TocMeasurableContainer, item: TocMeasurableItem): TocScrollItem {
    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const containerInnerTop = containerRect.top + container.clientTop;

    return {
        offsetTop: itemRect.top - containerInnerTop + container.scrollTop,
        offsetHeight: itemRect.height,
    };
}
