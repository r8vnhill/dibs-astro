/**
 * @file Presentation-owned facade for reference content classification and field resolution.
 *
 * Reference components should import from this module instead of importing `$domain/reference-content` directly. The 
 * module keeps the domain implementation behind a presentation-layer import path, so Astro components can consume 
 * stable rendering contracts without depending on domain module layout.
 *
 * The re-exported helpers preserve the domain rules for:
 *
 * - classifying rendered slot content as meaningful or empty;
 * - resolving slot-over-fallback precedence;
 * - distinguishing missing optional fields from invalid required fields;
 * - resolving inline text and linked inline fields consistently.
 *
 * This adapter intentionally contains no rendering logic. Astro-facing rendering helpers should compose these 
 * functions in `src/components/ui/references/reference-content.ts`.
 */

export {
    classifyRenderedReferenceContent,
    isMeaningfulSlotContent,
    type ResolvedInlineField,
    type ResolvedLinkedInlineField,
    type ResolvedSlotContent,
    resolveInlineField,
    resolveLinkedInlineField,
    resolveRequiredInlineField,
} from "$domain/reference-content";
