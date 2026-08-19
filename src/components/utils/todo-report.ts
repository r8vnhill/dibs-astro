/**
 * JSON-compatible values that can cross the server-to-browser reporting boundary.
 */
export type JsonValue =
    | string
    | number
    | boolean
    | null
    | readonly JsonValue[]
    | { readonly [key: string]: JsonValue };

/** Metadata carried by a placeholder report. */
export type ToDoMetadata = Readonly<Record<string, JsonValue>>;

/** The default browser event used to report a mounted placeholder. */
export const DEFAULT_TODO_REPORT_EVENT = "dibs:placeholder";

/** Payload emitted when a placeholder reports its current state. */
export interface ToDoReportPayload {
    readonly message: string;
    readonly imageSrc: string | null;
    readonly metadata?: ToDoMetadata;
    readonly timestamp: string;
}
