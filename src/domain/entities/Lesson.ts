import type { LessonHref } from "$domain/value-objects/LessonHref";
import type { LessonId } from "$domain/value-objects/LessonId";
import type { LessonSlug } from "$domain/value-objects/LessonSlug";

export type LessonProps = {
    id: LessonId;
    title: string;
    slug: LessonSlug;
    href?: LessonHref;
};

export class Lesson {
    readonly id: LessonId;
    readonly title: string;
    readonly slug: LessonSlug;
    readonly href: LessonHref | undefined;

    private constructor(props: LessonProps) {
        this.id = props.id;
        this.title = props.title;
        this.slug = props.slug;
        this.href = props.href;
    }

    static create(props: LessonProps): Lesson {
        const title = props.title.trim();
        if (!title) {
            throw new Error("Lesson title cannot be empty");
        }

        return new Lesson({ ...props, title });
    }
}
