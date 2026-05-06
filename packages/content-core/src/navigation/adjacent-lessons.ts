import type { NavigationNode } from "./types";

export class AdjacentLessons {
    readonly previous: NavigationNode | undefined;
    readonly next: NavigationNode | undefined;

    private constructor(previous?: NavigationNode, next?: NavigationNode) {
        this.previous = previous;
        this.next = next;
        Object.freeze(this);
    }

    static create(previous?: NavigationNode, next?: NavigationNode): AdjacentLessons {
        return new AdjacentLessons(previous, next);
    }

    isEmpty(): boolean {
        return this.previous === undefined && this.next === undefined;
    }
}
