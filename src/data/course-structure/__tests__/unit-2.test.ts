import { describe, expect, test } from "vitest";
import { unit2Lessons } from "../unit-2";

describe("unit2Lessons", () => {
    test("starts Unit 2 with reusable support scripts", () => {
        expect(unit2Lessons[0]).toMatchObject({
            kind: "link",
            id: "support-scripts",
            title: "Scripts de apoyo como software reusable",
            href: "/notes/scripting/support-scripts/",
        });
    });

    test("places task abstractions immediately after support scripts", () => {
        expect(unit2Lessons[1]).toMatchObject({
            kind: "link",
            id: "tasks-as-abstractions",
            title: "Tareas como abstracciones de acciones repetibles",
            href: "/notes/scripting/tasks-as-abstractions/",
        });
    });
});
