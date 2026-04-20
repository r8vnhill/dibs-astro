/**
 * Entity representing a breadcrumb trail of lessons from root to current.
 *
 * Models the ancestry path for a lesson within the course structure.
 */

/**
 * A node in a lesson trail (breadcrumb).
 *
 * Either a clickable link (with href) or a text-only label (without href).
 */
export type TrailNode = {
    /** Human-readable label for the trail node. */
    readonly title: string;
    /** Optional route path; if undefined, this is a text-only node. */
    readonly href?: string;
};

/**
 * Immutable entity representing the ancestry path to a lesson.
 *
 * Encapsulates a sequence of nodes from the root structure down to the current lesson,
 * forming a navigation breadcrumb. Guarantees immutability via Object.freeze().
 */
export class LessonTrail {
    /** The ordered sequence of nodes from ancestor to current. */
    readonly nodes: readonly TrailNode[];

    /**
     * Private constructor to enforce factory method usage.
     *
     * @param nodes - The ordered trail nodes.
     */
    private constructor(nodes: readonly TrailNode[]) {
        this.nodes = Object.freeze([...nodes]);
        Object.freeze(this);
    }

    /**
     * Factory method to create a LessonTrail from an array of nodes.
     *
     * @param nodes - The ordered trail nodes.
     * @returns A frozen LessonTrail instance.
     *
     * @example
     * const trail = LessonTrail.create([
     *   { title: "Unit 1", href: "/notes/unit-1/" },
     *   { title: "Lesson 2", href: "/notes/unit-1/lesson-2/" },
     * ]);
     */
    static create(nodes: readonly TrailNode[]): LessonTrail {
        return new LessonTrail(nodes);
    }

    /**
     * Factory method to build a trail from an ancestry chain and current lesson.
     *
     * Constructs a LessonTrail by following ancestor IDs through a map.
     * Skips ancestors that are not found in the map.
     *
     * @param ancestorIds - An ordered list of ancestor IDs (from root to immediate parent).
     * @param lessonIdToNode - A map from lesson IDs to their TrailNode representations.
     * @param current - The current lesson node (leaf of the trail).
     *
     * @returns A LessonTrail starting from the highest ancestor and ending with current.
     *
     * @example
     * const idToNode = new Map([
     *   ["unit-1", { title: "Unit 1", href: "/notes/unit-1/" }],
     *   ["lesson-2", { title: "Lesson 2", href: "/notes/unit-1/lesson-2/" }],
     * ]);
     * const trail = LessonTrail.buildFromAncestry(
     *   ["unit-1"],
     *   idToNode,
     *   { title: "Section A", href: "/notes/unit-1/section-a/" }
     * );
     */
    static buildFromAncestry(
        ancestorIds: readonly string[],
        lessonIdToNode: ReadonlyMap<string, TrailNode>,
        current: TrailNode,
    ): LessonTrail {
        const nodes: TrailNode[] = [];

        for (const ancestorId of ancestorIds) {
            const node = lessonIdToNode.get(ancestorId);
            if (node !== undefined) {
                nodes.push(node);
            }
        }

        nodes.push(current);
        return LessonTrail.create(nodes);
    }

    /**
     * Checks whether this trail is empty (contains no nodes).
     *
     * @returns true if the trail has no nodes; false otherwise.
     */
    isEmpty(): boolean {
        return this.nodes.length === 0;
    }

    /**
     * Counts the number of navigable nodes (those with an href).
     *
     * Useful for determining how many clickable breadcrumbs exist in the trail.
     *
     * @returns The number of nodes in this trail with a defined href property.
     */
    get navigableCount(): number {
        return this.nodes.filter((node) => node.href !== undefined).length;
    }
}
