/**
 * Application-layer port barrel.
 *
 * This module defines the stable import surface for application-facing ports and DTOs. It groups the contracts that 
 * presentation code depends on, while hiding the internal file layout of the application layer.
 *
 * It currently re-exports two kinds of application boundary types:
 *
 * - service contracts such as {@link ILessonMetadataService} and {@link INavigationService}
 * - DTOs and result shapes exchanged across the application boundary
 *
 * Centralizing these exports provides a few practical benefits:
 *
 * - it gives presentation code one predictable import path
 * - it reduces coupling to internal file organization
 * - it makes refactors less disruptive
 * - it clarifies which application-layer types are part of the intended public surface
 */
export type {
    ILessonMetadataService,
    LessonMetadataAuthorDto,
    LessonMetadataChangeDto,
    LessonMetadataDto,
} from "./LessonMetadataService";
export type { INavigationService, NavigationNode, NavigationResult } from "./NavigationService";
