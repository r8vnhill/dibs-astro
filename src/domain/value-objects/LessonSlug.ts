export class LessonSlug {
    readonly value: string;

    private constructor(value: string) {
        this.value = value;
    }

    static create(value: string): LessonSlug {
        const normalized = value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

        if (!normalized) {
            throw new Error("LessonSlug cannot be empty");
        }

        return new LessonSlug(normalized);
    }
}
