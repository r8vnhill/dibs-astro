import fc from "fast-check";
import type { Lesson } from "../course-structure";

export type LinkInput = {
    id: string;
    href: string;
    title?: string;
    children?: readonly Lesson[];
};

export type GroupInput = {
    id: string;
    children: readonly Lesson[];
    title?: string;
    href?: string;
};

export function link({ id, href, title = id, children }: LinkInput): Lesson {
    return children
        ? { kind: "link", id, title, href, children }
        : { kind: "link", id, title, href };
}

export function group({ id, children, title = id, href }: GroupInput): Lesson {
    return href
        ? { kind: "group", id, title, href, children }
        : { kind: "group", id, title, children };
}

export function countNodes(lessons: readonly Lesson[]): number {
    return lessons.reduce(
        (total, lesson) => total + 1 + countNodes(lesson.children ?? []),
        0,
    );
}

type LessonShape = {
    kind: "link" | "group";
    title: string;
    children: readonly LessonShape[];
    groupHasHref: boolean;
};

const lessonShapeArb: (maxDepth: number) => fc.Arbitrary<LessonShape> = fc.memo(
    (maxDepth: number): fc.Arbitrary<LessonShape> => {
        if (maxDepth <= 0) {
            return fc.record({
                kind: fc.constant<"link">("link"),
                title: fc.string({ minLength: 1, maxLength: 12 }),
                children: fc.constant<readonly LessonShape[]>([]),
                groupHasHref: fc.constant(false),
            });
        }

        return fc.oneof(
            fc.record({
                kind: fc.constant<"link">("link"),
                title: fc.string({ minLength: 1, maxLength: 12 }),
                children: fc.array(lessonShapeArb(maxDepth - 1), { maxLength: 3 }),
                groupHasHref: fc.constant(false),
            }),
            fc.record({
                kind: fc.constant<"group">("group"),
                title: fc.string({ minLength: 1, maxLength: 12 }),
                children: fc.array(lessonShapeArb(maxDepth - 1), {
                    minLength: 1,
                    maxLength: 3,
                }),
                groupHasHref: fc.boolean(),
            }),
        );
    },
);

export function arbLessonTree(): fc.Arbitrary<readonly Lesson[]> {
    return fc.array(lessonShapeArb(3), { maxLength: 4 }).map(materializeTree);
}

function materializeTree(shapes: readonly LessonShape[]): readonly Lesson[] {
    let index = 0;

    const mapNode = (shape: LessonShape): Lesson => {
        index += 1;
        const id = `node-${index}`;
        const href = `/node-${index}/`;
        const children = shape.children.map(mapNode);

        if (shape.kind === "link") {
            return children.length > 0
                ? link({ id, title: shape.title, href, children })
                : link({ id, title: shape.title, href });
        }

        return group({
            id,
            title: shape.title,
            children,
            ...(shape.groupHasHref ? { href } : {}),
        });
    };

    return shapes.map(mapNode);
}
