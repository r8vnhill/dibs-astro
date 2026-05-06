/**
 * Presentation adapter for lesson metadata resolution.
 *
 * This bridge keeps `NotesLayout` and other presentation callers independent from repository
 * contracts, generated JSON access, and caching details. Composition remains local and explicit:
 * the bridge wires the application service to the infrastructure adapter and returns only the
 * serializable values the UI needs.
 */
import {
    LessonMetadataService,
    type LessonMetadataResolutionResult,
    type LessonMetadataServiceContract,
} from "@ravenhill/content-core";
import { LessonMetadataAdapter } from "$infrastructure/adapters/LessonMetadataAdapter";

/**
 * Minimal metadata result consumed by lesson layouts and metadata panels.
 */
export type ResolvedLessonMetadata = LessonMetadataResolutionResult;

function createLessonMetadataService(): LessonMetadataServiceContract {
    return new LessonMetadataService(new LessonMetadataAdapter());
}

/**
 * Resolves lesson metadata for a raw pathname using the local metadata composition root.
 *
 * @param pathname Raw pathname or URL for the current lesson page.
 * @returns UI-safe lesson metadata, or `undefined` when the lesson has no metadata entry.
 */
export async function resolveLessonMetadata(
    pathname: string,
): Promise<ResolvedLessonMetadata> {
    return createLessonMetadataService().resolveLessonMetadata(pathname);
}
