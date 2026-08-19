import { expect, expectTypeOf, test } from "vitest";
import { DEFAULT_TODO_REPORT_EVENT, type ToDoMetadata, type ToDoReportPayload } from "../todo-report";

test("defines the canonical placeholder report event", () => {
    expect(DEFAULT_TODO_REPORT_EVENT).toBe("dibs:placeholder");
});

test("accepts JSON-compatible placeholder metadata", () => {
    const metadata = {
        title: "Pending lesson",
        tasks: ["write tests", "update docs"],
        progress: 0.5,
        visible: true,
        details: null,
    } satisfies ToDoMetadata;

    expectTypeOf(metadata).toExtend<ToDoMetadata>();
});

test("keeps the report payload independent from React", () => {
    const payload = {
        message: "Contenido pendiente",
        imageSrc: null,
        timestamp: new Date(0).toISOString(),
    } satisfies ToDoReportPayload;

    expectTypeOf(payload).toExtend<ToDoReportPayload>();
});
