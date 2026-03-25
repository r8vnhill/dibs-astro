/**
 * Minimal slot interface required by the resolution helpers.
 *
 * This mirrors the subset of Astro's slot API that these utilities depend on, allowing the helpers
 * to remain framework-light and easy to test with simple stubs.
 */
type SlotLike = {
    /**
     * Returns whether a slot with the given name exists.
     *
     * Existence alone does not imply meaningful content. Callers should still render and classify
     * the slot before deciding whether to use it.
     */
    has(name: string): boolean;

    /**
     * Renders the named slot to HTML.
     *
     * The returned HTML is later analyzed as trusted component-authored content to determine
     * whether it should count as meaningful textual metadata.
     */
    render(name: string): Promise<string>;
};

/**
 * Classified result produced by slot-resolution helpers.
 *
 * The `kind` field is a discriminant so consumers can branch on slot state without carrying a
 * separate boolean flag. Empty results always normalize `html` to the empty string, which keeps the
 * fallback path predictable and avoids preserving markup that was classified as empty.
 */
export type ResolvedSlotContent =
    | {
        /**
         * Indicates that the slot was missing or rendered without meaningful textual content.
         */
        kind: "empty";

        /**
         * Normalized empty payload.
         */
        html: "";
    }
    | {
        /**
         * Indicates that the slot rendered meaningful textual content.
         */
        kind: "meaningful";

        /**
         * Original rendered HTML for the slot.
         *
         * Consumers may use this to inspect or render the resolved content, but any direct HTML
         * rendering should make the trust boundary explicit at the call site.
         */
        html: string;
    };

/**
 * Fixed inline labels used by the Spanish bibliography presentation layer.
 *
 * These labels are kept here because several reference components share the same small vocabulary
 * when rendering container publications and authors inline.
 */
export const SPANISH_REFERENCE_META_LABELS = {
    in: "en",
    by: "por",
} as const;

/**
 * Removes HTML comments from a rendered slot fragment.
 *
 * Comments are ignored for content classification because they do not contribute visible text and
 * should not prevent prop fallbacks from being used.
 */
export const stripHtmlComments = (html: string): string => html.replace(/<!--[\s\S]*?-->/g, "");

/**
 * Removes HTML tags from a rendered fragment.
 *
 * This helper intentionally performs a lightweight textual approximation rather than full HTML
 * parsing. It is sufficient for bibliography metadata, where the goal is to determine whether a
 * fragment contains visible text rather than to preserve document structure.
 */
export const stripHtmlTags = (html: string): string => html.replace(/<[^>]+>/g, "");

/**
 * Decodes common non-breaking-space entities into regular spaces.
 *
 * This normalization helps treat visually empty content such as `&nbsp;` the same way as other
 * whitespace during later trimming and collapse steps.
 */
export const decodeHtmlWhitespaceEntities = (text: string): string =>
    text.replace(/&(nbsp|#160|#xA0);/gi, " ");

/**
 * Collapses inline whitespace runs and trims the result.
 *
 * After this normalization, text that is visually empty or whitespace-only becomes the empty
 * string, making emptiness checks more predictable.
 */
export const normalizeInlineWhitespace = (text: string): string => text.replace(/\s+/g, " ").trim();

/**
 * Returns whether rendered HTML contains meaningful visible text.
 *
 * The classification pipeline:
 *
 * - removes HTML comments;
 * - strips markup tags;
 * - decodes common non-breaking-space entities;
 * - normalizes and trims inline whitespace.
 *
 * This helper is deliberately text-based. Markup that has no textual payload, such as empty
 * wrappers or decorative media-only fragments, is treated as empty. That behavior matches the
 * needs of bibliography metadata, where callers usually want to fall back to simple string props
 * when no real text was provided through a slot.
 */
export function hasMeaningfulTextContent(html: string): boolean {
    const withoutComments = stripHtmlComments(html);
    const plainText = stripHtmlTags(withoutComments);
    const decodedText = decodeHtmlWhitespaceEntities(plainText);
    const normalizedText = normalizeInlineWhitespace(decodedText);

    return normalizedText.length > 0;
}

/**
 * Type guard that narrows a resolved slot result to its meaningful variant.
 *
 * This is useful at call sites that prefer explicit refinement over checking the `kind` field
 * inline.
 */
export const isMeaningfulSlotContent = (
    content: ResolvedSlotContent,
): content is Extract<ResolvedSlotContent, { kind: "meaningful" }> => content.kind === "meaningful";

/**
 * Resolves one named slot and classifies it as meaningful or empty.
 *
 * ## Behavior:
 *
 * - If the slot does not exist, the result is `{ kind: "empty", html: "" }`.
 *   - If the slot exists but renders without meaningful textual content, the result is also empty.
 * - If the slot renders meaningful text, the original HTML is preserved in the result.
 *
 * Slot HTML is treated as trusted, in-repository component content. This helper only classifies the
 * fragment; any direct HTML rendering remains the responsibility of the caller.
 *
 * @param slots Slot source implementing the minimal Astro-like contract required by this helper.
 * @param name Name of the slot to resolve.
 * @returns A discriminated slot-resolution result suitable for prop-fallback logic.
 */
export async function resolveOptionalSlot(
    slots: SlotLike,
    name: string,
): Promise<ResolvedSlotContent> {
    if (!slots.has(name)) return { kind: "empty", html: "" };

    const html = await slots.render(name);
    return hasMeaningfulTextContent(html)
        ? { kind: "meaningful", html }
        : { kind: "empty", html: "" };
}

/**
 * Resolves multiple optional slots and returns a record keyed by the requested names.
 *
 * This helper is useful in Astro frontmatter when a component needs to resolve several independent
 * metadata fragments, such as `title`, `publication`, `author`, and `description`, without
 * repeating the same setup code for each one.
 *
 * The returned record preserves the input slot-name union through `TName`, which keeps
 * destructuring ergonomic and type-safe at call sites.
 *
 * @param slots Slot source implementing the minimal Astro-like contract required by this helper.
 * @param names Slot names to resolve.
 * @returns A record mapping each requested slot name to its classified resolution result.
 */
export async function resolveOptionalSlots<TName extends string>(
    slots: SlotLike,
    names: readonly TName[],
): Promise<Record<TName, ResolvedSlotContent>> {
    const entries = await Promise.all(
        names.map(async (name) => [name, await resolveOptionalSlot(slots, name)] as const),
    );

    return Object.fromEntries(entries) as Record<TName, ResolvedSlotContent>;
}
