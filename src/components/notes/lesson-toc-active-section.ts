/**
 * Decides when the active lesson-TOC entry should be auto-scrolled into view.
 *
 * The active entry only needs to be revealed when it changes. Re-revealing it on every scroll
 * tick while the same section remains active would fight a reader who has manually scrolled the
 * TOC panel to preview other entries.
 */
export function shouldRevealActiveEntry(previousActiveId: string | null, activeId: string | null): boolean {
    return activeId !== null && activeId !== previousActiveId;
}
