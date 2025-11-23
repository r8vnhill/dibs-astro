import * as icons from "~/assets/img/icons";
import Brain from "~/assets/img/icons/brain.svg";
import NoteIcon from "~/assets/img/icons/note.svg";
import Star from "~/assets/img/icons/star.svg";
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
export const proseClasses =
    "prose prose-neutral dark:prose-invert max-w-none prose-p:my-0 prose-p:leading-relaxed";

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

/**
 * Shape for per-variant defaults used when rendering a callout.
 */
export interface CalloutVariantConfig {
    title: string;
    icon: AstroComponentFactory;
}

/**
 * Default headings and icons for each callout variant. Consumers can still override per instance.
 */
export const calloutVariants: Record<CalloutVariant, CalloutVariantConfig> = {
    abstract: { title: "Abstract", icon: Brain },
    danger: { title: "Peligro", icon: icons.Skull },
    definition: { title: "Definición", icon: icons.BookOpen },
    exercise: { title: "Ejercicio", icon: icons.PencilLine },
    explanation: { title: "Detalles clave", icon: icons.ChatCircleText },
    hints: { title: "Hints", icon: icons.Compass },
    important: { title: "Importante", icon: Star },
    info: { title: "Información", icon: icons.Info },
    more: { title: "Más información", icon: icons.DotsThreeOutline },
    note: { title: "Nota", icon: NoteIcon },
    question: { title: "Piensa rápido", icon: icons.Question },
    solution: { title: "Solución", icon: icons.CheckCircle },
    tip: { title: "Tip", icon: icons.Lightbulb },
    warning: { title: "Precaución", icon: icons.Warning },
};

/**
 * Theme colors for light/dark modes, used to style the callout container and heading text.
 */
export const calloutColors: Record<
    CalloutVariant,
    {
        bg: string;
        border: string;
        title: string;
        bgDark?: string;
        borderDark?: string;
        titleDark?: string;
    }
> = {
    abstract: {
        bg: "#fdf6ec",
        border: "#f6ad55",
        title: "#c05621",
        bgDark: "#2b1a11",
        borderDark: "#f6ad55",
        titleDark: "#fbd38d",
    },
    danger: {
        bg: "#fff5f5",
        border: "#e53e3e",
        title: "#c53030",
        bgDark: "#3b0d0c",
        borderDark: "#f87171",
        titleDark: "#fca5a5",
    },
    definition: {
        bg: "#f8fafc",
        border: "#0ea5e9",
        title: "#0369a1",
        bgDark: "#0f172a",
        borderDark: "#38bdf8",
        titleDark: "#7dd3fc",
    },
    exercise: {
        bg: "#e8f0fe",
        border: "#4285f4",
        title: "#1a73e8",
        bgDark: "#1a2a3f",
        borderDark: "#5a9bff",
        titleDark: "#aecbfa",
    },
    explanation: {
        bg: "#e3f2fd",
        border: "#2196f3",
        title: "#0d47a1",
        bgDark: "#102a43",
        borderDark: "#2ec4b6",
        titleDark: "#aefeff",
    },
    hints: {
        bg: "#f3e8ff",
        border: "#a855f7",
        title: "#6b21a8",
        bgDark: "#2a0e36",
        borderDark: "#c084fc",
        titleDark: "#e9d5ff",
    },
    important: {
        bg: "#fff7f3",
        border: "#f97316",
        title: "#7c2d12",
        bgDark: "#431407",
        borderDark: "#fb923c",
        titleDark: "#ffedd5",
    },
    info: {
        bg: "#eef6fc",
        border: "#3b82f6",
        title: "#1e3a8a",
        bgDark: "#0f172a",
        borderDark: "#60a5fa",
        titleDark: "#bfdbfe",
    },
    more: {
        bg: "#f5f5f5",
        border: "#cccccc",
        title: "#333333",
        bgDark: "#1e1e1e",
        borderDark: "#444444",
        titleDark: "#e0e0e0",
    },
    note: {
        bg: "#f1f5f9",
        border: "#0ea5e9",
        title: "#0f172a",
        bgDark: "#1e293b",
        borderDark: "#38bdf8",
        titleDark: "#f1f5f9",
    },
    question: {
        bg: "#f5f3ff",
        border: "#8b5cf6",
        title: "#5b21b6",
        bgDark: "#2e1065",
        borderDark: "#c084fc",
        titleDark: "#ede9fe",
    },
    solution: {
        bg: "#e0f2f1",
        border: "#26a69a",
        title: "#004d40",
        bgDark: "#004d40",
        borderDark: "#26a69a",
        titleDark: "#b2dfdb",
    },
    tip: {
        bg: "#e6f4ea",
        border: "#66bb6a",
        title: "#2e7d32",
        bgDark: "#1b3527",
        borderDark: "#81c784",
        titleDark: "#c8e6c9",
    },
    warning: {
        bg: "#fff8e1",
        border: "#fbc02d",
        title: "#e65100",
        bgDark: "#3a2e1f",
        borderDark: "#ffb300",
        titleDark: "#ffe57f",
    },
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
