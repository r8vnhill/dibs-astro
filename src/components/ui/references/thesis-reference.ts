import {
    type ResolvedInlineField,
    type ResolvedLinkedInlineField,
    type ResolvedSlotContent,
    resolveInlineField,
    resolveLinkedInlineField,
} from "$domain/reference-content";
import { type ResolvedSlotContent as UiResolvedSlotContent, resolveRequiredTitleField } from "./reference-content";
import { resolveRequiredHref } from "./reference-links";
import { ReferenceContractError } from "./ReferenceContractError";

export const THESIS_REFERENCE_SLOTS = [
    "title",
    "institution",
    "author",
    "description",
] as const;

export type ThesisReferenceProps = {
    title?: string;
    url: string;
    institution?: string;
    institutionUrl?: string;
    author?: string;
};

export type ThesisReferenceSlots = Record<
    (typeof THESIS_REFERENCE_SLOTS)[number],
    UiResolvedSlotContent
>;

export type ThesisReferenceViewModel = {
    title: Extract<ResolvedInlineField, { kind: "slot" | "text" }>;
    url: string;
    institution: ResolvedLinkedInlineField;
    author: ResolvedInlineField;
    description: ResolvedSlotContent;
};

export function assertLinkedFallbackHasLabel(input: {
    componentName: string;
    fieldName: string;
    fallbackHref?: string | undefined;
    resolvedField: ResolvedLinkedInlineField;
}): void {
    if (!input.fallbackHref) {
        return;
    }

    if (input.resolvedField.kind !== "missing") {
        return;
    }

    throw new ReferenceContractError(
        `${input.componentName} \`${input.fieldName}Url\` requires a meaningful \`${input.fieldName}\`.`,
    );
}

export function resolveThesisReference(
    props: ThesisReferenceProps,
    slots: ThesisReferenceSlots,
): ThesisReferenceViewModel {
    const institution = resolveLinkedInlineField(
        slots.institution,
        props.institution,
        props.institutionUrl,
    );

    assertLinkedFallbackHasLabel({
        componentName: "Thesis",
        fieldName: "institution",
        fallbackHref: props.institutionUrl,
        resolvedField: institution,
    });

    return {
        title: resolveRequiredTitleField(slots.title, props.title),
        url: resolveRequiredHref("Thesis `url`", props.url),
        institution,
        author: resolveInlineField(slots.author, props.author),
        description: slots.description,
    };
}
