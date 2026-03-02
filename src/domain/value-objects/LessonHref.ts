export class LessonHref {
    readonly value: string;

    private constructor(value: string) {
        this.value = value;
    }

    static create(value: string): LessonHref {
        const trimmed = value.trim();
        if (!trimmed.startsWith("/")) {
            throw new Error("LessonHref must start with '/'");
        }

        const normalized = trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
        return new LessonHref(normalized);
    }
}
