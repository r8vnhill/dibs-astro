import * as icons from "@ravenhill/astro-icons";
import { Brain, Note, Star } from "@ravenhill/astro-icons";
import type { AstroComponentFactory } from "~/types/astro-component";
import type { HeadingLevel } from "~/utils";

/**
 * Shared public API surface for "callout" / admonition-style components (e.g., Abstract, Important,
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
     * Additional classes applied to the body/content wrapper.
     */
    bodyClass?: string;

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

    /**
     * Optional id for the section wrapper; if not provided a slugified title is used.
     */
    id?: string;

    /**
     * Extra props forwarded to the icon component.
     */
    iconProps?: Record<string, any>;

    /**
     * Icon variant toggle, forwarded to FilledIcon.
     */
    iconVariant?: "outline" | "solid";

    /**
     * Whether the icon is decorative (true) or should be exposed to screen readers (false).
     */
    iconDecorative?: boolean;
}

/**
 * Tailwind Typography helpers for callout bodies; applied when the `prose` flag is enabled.
 */
export const proseClasses = "prose prose-neutral dark:prose-invert max-w-none prose-p:my-0 prose-p:leading-relaxed";

/**
 * Baseline utility classes shared by every callout wrapper.
 */
export const calloutBaseClasses = [
    "callout",
    "relative",
    "rounded-md",
    "shadow-sm",
    "my-4",
];

/**
 * Supported callout variants. Keeps authoring limited to known values instead of arbitrary strings.
 */
export type CalloutVariant =
    | "abstract"
    | "closing-reflection"
    | "danger"
    | "definition"
    | "exercise"
    | "explanation"
    | "hints"
    | "important"
    | "info"
    | "more"
    | "note"
    | "question"
    | "solution"
    | "tip"
    | "warning";

export type CalloutAccent = "blue" | "cyan" | "gray" | "green" | "orange" | "purple" | "red" | "yellow";
export type CalloutSurfaceIntensity = "normal" | "subtle" | "strong";

/**
 * Shape for per-variant defaults used when rendering a callout.
 */
export interface CalloutVariantConfig {
    title: string;
    icon: AstroComponentFactory;
    accent: CalloutAccent;
    surface: CalloutSurfaceIntensity;
}

/**
 * Default headings and icons for each callout variant. Consumers can still override per instance.
 */
export const calloutVariants: Record<CalloutVariant, CalloutVariantConfig> = {
    abstract: { title: "Resumen", icon: Brain, accent: "purple", surface: "normal" },
    "closing-reflection": {
        title: "Reflexión de cierre",
        icon: icons.FlagCheckered,
        accent: "purple",
        surface: "subtle",
    },
    danger: { title: "Peligro", icon: icons.Skull, accent: "red", surface: "normal" },
    definition: { title: "Definición", icon: icons.BookOpen, accent: "cyan", surface: "subtle" },
    exercise: { title: "Ejercicio", icon: icons.PencilLine, accent: "blue", surface: "normal" },
    explanation: { title: "Detalles clave", icon: icons.ChatCircleText, accent: "cyan", surface: "normal" },
    hints: { title: "Hints", icon: icons.Compass, accent: "purple", surface: "normal" },
    important: { title: "Importante", icon: Star, accent: "orange", surface: "normal" },
    info: { title: "Información", icon: icons.Info, accent: "blue", surface: "subtle" },
    more: { title: "Más información", icon: icons.DotsThreeOutline, accent: "gray", surface: "subtle" },
    note: { title: "Nota", icon: Note, accent: "cyan", surface: "subtle" },
    question: { title: "Piensa rápido", icon: icons.Question, accent: "purple", surface: "subtle" },
    solution: { title: "Solución", icon: icons.CheckCircle, accent: "green", surface: "normal" },
    tip: { title: "Tip", icon: icons.Lightbulb, accent: "green", surface: "normal" },
    warning: { title: "Cuidado", icon: icons.Warning, accent: "yellow", surface: "normal" },
};

/**
 * Narrow the attributes that are safe to spread onto the outer <section> wrapper. Prevents leaking
 * unrelated props onto DOM nodes.
 */
export const filterSectionAttrs = (rest: Record<string, any>) =>
    Object.fromEntries(
        Object.entries(rest)
            .filter(
                ([k]) =>
                    k === "id"
                    || k.startsWith("data-")
                    || k.startsWith("aria-"),
            ),
    );

/**
 * Produce a stable, URL-safe id for a callout heading/section.
 * - Uses provided `forcedId` when present.
 * - Falls back to a slugified version of the title or a required `fallback`.
 */
export const slugifyTitle = (value: string | undefined, fallback: string, forcedId?: string) => {
    if (forcedId) return forcedId;
    const base = (value ?? fallback).trim();
    return (
        base
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") || fallback
    );
};
