/**
 * Domain repository contracts (data access interfaces).
 *
 * These interfaces define what data queries the application layer needs, expressed in domain terms (canonical hrefs, 
 * lesson identity) rather than implementation details (JSON shapes, data sources).
 *
 * Application services depend on these contracts; Infrastructure adapters implement them. This inversion of dependency 
 * isolates domain logic from data source concerns.
 */
export type { LessonMetadataRepository } from "./LessonMetadataRepository";
export type { LessonNavigationRepository } from "./LessonNavigationRepository";
