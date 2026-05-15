import {
    getPdfLessonExportManifest,
    type LessonExportManifestEntry,
} from "~/infrastructure/adapters/lesson-export-manifest";
import { getLessonPageRegistry } from "~/infrastructure/adapters/lesson-page-registry";

export type { LessonExportManifestEntry };

type LessonPdfExportPage = {
    readonly component: unknown;
};

const lessonPageRegistry = getLessonPageRegistry();

export function getLessonPdfExportEntries(): readonly LessonExportManifestEntry[] {
    return getPdfLessonExportManifest().entries;
}

export function resolveLessonPdfExportPage(route: string): LessonPdfExportPage {
    const page = lessonPageRegistry.resolve(route);

    return {
        component: page.component,
    };
}
