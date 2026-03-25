export class LessonTitle {
    readonly value: string;

    private constructor(value: string) {
        this.value = value;
    }

    static create(value: string): LessonTitle {
        const trimmed = value.trim();
        if (!trimmed) {
            throw new Error("Lesson title cannot be empty");
        }

        return new LessonTitle(trimmed);
    }
}
