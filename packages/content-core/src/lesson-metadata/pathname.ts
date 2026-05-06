import { LessonHref } from "../navigation/lesson-href";

const ABSOLUTE_HTTP_URL_PATTERN = /^https?:\/\//iu;

function toMetadataPathnameCandidate(pathname: string): string {
    const trimmed = pathname.trim();
    if (trimmed.length === 0) {
        return "/";
    }

    if (ABSOLUTE_HTTP_URL_PATTERN.test(trimmed)) {
        try {
            return new URL(trimmed).pathname;
        } catch {
            return trimmed;
        }
    }

    return trimmed;
}

export const normalizeLessonMetadataPathname = (pathname: string): string =>
    LessonHref.create(toMetadataPathnameCandidate(pathname)).value;
