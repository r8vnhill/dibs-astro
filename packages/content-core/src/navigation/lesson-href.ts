export class LessonHref {
    readonly value: string;

    private constructor(value: string) {
        this.value = value;
    }

    static create(value: string): LessonHref {
        const normalized = LessonHref.normalize(value);
        if (normalized.length === 0) {
            throw new Error("LessonHref cannot be empty");
        }

        return new LessonHref(normalized);
    }

    private static normalize(value: string): string {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
            return "";
        }

        const withoutQueryOrHash = trimmed.split(/[?#]/)[0] ?? "";
        const withLeadingSlash = withoutQueryOrHash.startsWith("/")
            ? withoutQueryOrHash
            : `/${withoutQueryOrHash}`;
        const collapsedSlashes = withLeadingSlash.replace(/\/{2,}/g, "/");

        if (collapsedSlashes === "/") {
            return "/";
        }

        const withoutTrailingWhitespace = collapsedSlashes.replace(/\/+$/g, "");
        return withoutTrailingWhitespace.length === 0 ? "" : `${withoutTrailingWhitespace}/`;
    }
}
