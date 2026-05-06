import type { TrailNode } from "./types";

export class LessonTrail {
    readonly nodes: readonly TrailNode[];

    private constructor(nodes: readonly TrailNode[]) {
        this.nodes = Object.freeze([...nodes]);
        Object.freeze(this);
    }

    static create(nodes: readonly TrailNode[]): LessonTrail {
        return new LessonTrail(nodes);
    }

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

    isEmpty(): boolean {
        return this.nodes.length === 0;
    }

    get navigableCount(): number {
        return this.nodes.filter((node) => node.href !== undefined).length;
    }
}
