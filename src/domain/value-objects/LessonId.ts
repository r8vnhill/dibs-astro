export class LessonId {
    readonly value: string;

    private constructor(value: string) {
        this.value = value;
    }

    static create(value: string): LessonId {
        const normalized = value.trim();
        if (!normalized) {
            throw new Error("LessonId cannot be empty");
        }

        return new LessonId(normalized);
    }
}
