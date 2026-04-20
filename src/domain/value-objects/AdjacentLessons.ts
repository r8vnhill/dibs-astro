/**
 * Value object representing adjacent lessons (previous and/or next).
 *
 * Provides navigation context for a lesson within a sequence.
 */

/**
 * Represents a minimal node in the lesson navigation tree.
 */
export type NavigationNode = {
    /** Human-readable title of the lesson. */
    readonly title: string;
    /** URL-friendly identifier for the lesson. */
    readonly slug: string;
    /** Absolute route path (e.g., `/notes/foo/`). */
    readonly href: string;
};

/**
 * Immutable value object for lesson adjacency.
 *
 * Encapsulates the previous and/or next lessons relative to a given lesson.
 * Guarantees immutability via Object.freeze().
 */
export class AdjacentLessons {
    /** The previous lesson, if it exists. */
    readonly previous: NavigationNode | undefined;

    /** The next lesson, if it exists. */
    readonly next: NavigationNode | undefined;

    /**
     * Private constructor to enforce factory method usage.
     *
     * @param previous - The previous lesson node, or undefined.
     * @param next - The next lesson node, or undefined.
     */
    private constructor(previous?: NavigationNode, next?: NavigationNode) {
        this.previous = previous;
        this.next = next;
        Object.freeze(this);
    }

    /**
     * Factory method to create an AdjacentLessons instance.
     *
     * @param previous - The previous lesson node (optional).
     * @param next - The next lesson node (optional).
     * @returns A frozen AdjacentLessons instance.
     *
     * @example
     * const adjacent = AdjacentLessons.create(previousNode, nextNode);
     * const onlyNext = AdjacentLessons.create(undefined, nextNode);
     */
    static create(previous?: NavigationNode, next?: NavigationNode): AdjacentLessons {
        return new AdjacentLessons(previous, next);
    }

    /**
     * Checks whether this value object represents an empty adjacency (no previous or next).
     *
     * @returns true if both previous and next are undefined; false otherwise.
     */
    isEmpty(): boolean {
        return this.previous === undefined && this.next === undefined;
    }
}
