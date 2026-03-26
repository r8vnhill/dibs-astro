import { LessonHref } from "$domain/value-objects/LessonHref";
import type { LessonId } from "$domain/value-objects/LessonId";
import type { LessonSlug } from "$domain/value-objects/LessonSlug";
import type { LessonTitle } from "$domain/value-objects/LessonTitle";

/**
 * Validated inputs required to build a {@link Lesson}.
 *
 * This type represents the minimal state the entity needs after validation has already happened at
 * the value-object boundary. The entity does not accept raw strings for title or routing-related
 * data.
 *
 * Keeping these fields validated before construction helps the entity stay small, deterministic,
 * and focused on composition rather than primitive sanitization.
 */
export type LessonProps = {
    /**
     * Stable identity for the lesson.
     */
    id: LessonId;

    /**
     * Human-readable lesson title.
     */
    title: LessonTitle;

    /**
     * Canonical slug used to derive the lesson route.
     */
    slug: LessonSlug;
};

/**
 * Domain entity representing a lesson page in the notes section.
 *
 * A {@link Lesson} owns:
 *
 * - identity through {@link LessonId};
 * - display naming through {@link LessonTitle};
 * - canonical routing input through {@link LessonSlug}.
 *
 * The entity intentionally does not store an `href` field. Instead, the route is derived from the
 * slug every time it is requested. This avoids duplicating path state and prevents inconsistencies
 * between stored routing values.
 *
 * Instances are created through {@link Lesson.create}, which makes the construction boundary
 * explicit and keeps the constructor private.
 */
export class Lesson {
    /**
     * Stable lesson identifier.
     */
    readonly id: LessonId;

    /**
     * Validated lesson title.
     */
    readonly title: LessonTitle;

    /**
     * Validated canonical lesson slug.
     */
    readonly slug: LessonSlug;

    /**
     * Creates a lesson from already-validated props.
     *
     * The constructor is private so callers must go through {@link Lesson.create}, which keeps
     * entity creation explicit and makes the public construction API easier to evolve.
     *
     * @param props Validated lesson data.
     */
    private constructor(props: LessonProps) {
        this.id = props.id;
        this.title = props.title;
        this.slug = props.slug;
    }

    /**
     * Returns the canonical notes route for this lesson.
     *
     * The route is always derived from the slug using the `/notes/<slug>/` convention. Because it
     * is computed rather than stored, the entity keeps a single source of truth for routing state.
     *
     * @returns Canonical lesson route as a {@link LessonHref}.
     */
    get href(): LessonHref {
        return LessonHref.create(`/notes/${this.slug.value}/`);
    }

    /**
     * Builds a {@link Lesson} from validated value objects.
     *
     * This factory does not perform additional normalization or validation. Those responsibilities
     * belong to the value objects supplied in {@link LessonProps}.
     *
     * @param props Validated inputs required to create the lesson.
     * @returns A new {@link Lesson} instance.
     */
    static create(props: LessonProps): Lesson {
        return new Lesson(props);
    }
}
