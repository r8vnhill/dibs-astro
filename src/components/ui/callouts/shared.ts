import type { AstroComponentFactory } from "~/types/astro-component";
import type { HeadingLevel } from "~/utils";

/**
 * Shared public API surface for “callout” / admonition-style components (e.g., Abstract, Important,
 * Note, More, etc.).
 *
 * This defines the common props those components consume so you can factor out shared logic (e.g.,
 * via a BaseCallout.astro wrapper or consistent typing across siblings).
 */
export interface BaseCalloutProps {
  /**
   * Visible title of the callout. Defaults vary per consumer (e.g., "Abstract", "Importante",
   * "Nota").
   */
  title?: string;

  /**
   * Optional icon component to render alongside the title.
   * Should be an Astro component factory (typically an SVG icon like from Lucide).
   * Pass `null` to suppress the icon entirely.
   */
  icon?: AstroComponentFactory | null;

  /**
   * Semantic heading level to use for the title. Controls which HTML tag is emitted (e.g., "h2",
   * "h3", etc.). `"h1"` is excluded to avoid misuse inside page content where there should
   * generally be a single top-level heading.
   */
  headingLevel?: Exclude<HeadingLevel, "h1">;

  /**
   * Optional explicit `id` for the heading. If omitted, callers will usually generate a stable
   * fallback (used for `aria-labelledby` on the region).
   */
  headingId?: string;

  /**
   * Extra classes to apply to the outermost wrapper (typically the `<section>`).
   * Allows consumer-level customization or overrides.
   */
  class?: string;

  /**
   * Additional classes to apply specifically to the heading/title element.
   */
  headingClass?: string;

  /**
   * Additional classes to apply to the icon wrapper.
   */
  iconClass?: string;

  /**
   * Optional aria-label for the region, useful if the title is not sufficient or you want to
   * provide a more descriptive accessible name.
   */
  ariaLabel?: string;

  /**
   * If true, applies reduced inner padding for more compact layouts.
   */
  compact?: boolean;

  /**
   * If true (default), enables Tailwind Typography (`prose`) styles on the body content to improve
   * rhythm and readability.
   */
  prose?: boolean;
}
