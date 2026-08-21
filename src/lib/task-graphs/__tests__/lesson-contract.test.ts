import { expect, suite, test } from "vitest";
import { taskGraphLessonOwnership, taskGraphLessonSeam, taskGraphSharedExample } from "../lesson-contract";

suite("given the two-lesson task-graphs contract", () => {
    test.each(taskGraphLessonOwnership)(
        "then $concept has exactly one primary lesson owner",
        ({ concept, lesson }) => {
            const owners = taskGraphLessonOwnership.filter((entry) => entry.concept === concept);

            expect(owners).toEqual([{ concept, lesson }]);
        },
    );

    test("then the ownership matrix covers every declared lesson", () => {
        expect(new Set(taskGraphLessonOwnership.map(({ lesson }) => lesson))).toEqual(new Set([1, 2]));
    });

    test("then the lesson boundary is frozen at topological orders and selected graph", () => {
        expect(taskGraphLessonSeam).toEqual({
            lessonOneEndsWith: "topological orders",
            lessonTwoStartsWith: "selected graph",
        });
    });

    test("then both lessons retain the same running example and arrow convention", () => {
        expect(taskGraphSharedExample).toEqual({
            tasks: ["prepareCatalog", "generateReport", "packageReport", "verifyReport"],
            arrowConvention: "A -> B",
        });
    });
});
