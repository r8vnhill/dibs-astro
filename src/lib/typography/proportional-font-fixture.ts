/**
 * Shared descriptors for the temporary proportional-font evaluation fixture and its browser tests.
 *
 * The conformance contract remains the source of truth for roles and states. This adapter only adds the fixture's
 * stable family identifiers, CSS names, diagnostic sizes, and feature-mode labels so the page and tests cannot drift.
 * It is not imported by production typography code.
 */

import { proportionalFontContract, type TypographyState } from "./proportional-font-contract";

export const proportionalFontFixtureProfiles = [
    {
        role: "body",
        familyId: "dibs-sans",
        familyName: "DIBS Sans",
        states: proportionalFontContract.roles.body.states,
        diagnosticSize: "1.5rem",
    },
    {
        role: "heading",
        familyId: "dibs-slab",
        familyName: "DIBS Slab",
        states: proportionalFontContract.roles.heading.states,
        diagnosticSize: "2.25rem",
    },
] as const;

export const proportionalFontFeatureModes = [
    { id: "disabled", label: "Features disabled" },
    { id: "enabled", label: "Features enabled" },
] as const;

export const typographyStateKey = (state: TypographyState): string =>
    `${state.weight}-${state.style}`;

export function typographySpecimenStyle(diagnosticSize: string, state: TypographyState): string {
    return `font-size:${diagnosticSize};font-weight:${state.weight};font-style:${state.style};line-height:1.3;`;
}

export function typographyLigaturePairKey(
    role: string,
    state: TypographyState,
    ligatureId: string,
): string {
    return `${role}-${state.weight}-${state.style}-${ligatureId}`;
}
