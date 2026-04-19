import {
    classifyRenderedReferenceContent,
    isMeaningfulSlotContent,
    resolveInlineField as resolveDomainInlineField,
    resolveLinkedInlineField as resolveDomainLinkedInlineField,
    resolveRequiredInlineField,
    type ResolvedInlineField,
    type ResolvedLinkedInlineField,
    type ResolvedSlotContent,
} from "../../../domain";
import { MissingReferenceTitleError } from "./ReferenceContractError";

type SlotLike = {
    has(name: string): boolean;
    render(name: string): Promise<string>;
};

export type { ResolvedInlineField, ResolvedLinkedInlineField, ResolvedSlotContent };

export const SPANISH_REFERENCE_META_LABELS = {
    in: "en",
    by: "por",
} as const;

export function hasMeaningfulTextContent(html: string): boolean {
    return isMeaningfulSlotContent(classifyRenderedReferenceContent(html));
}

export function resolveInlineField(
    slotContent: ResolvedSlotContent,
    fallbackText?: string,
): ResolvedInlineField {
    return resolveDomainInlineField(slotContent, fallbackText);
}

export function resolveRequiredTitleField(
    slotContent: ResolvedSlotContent,
    fallbackText?: string,
): Extract<ResolvedInlineField, { kind: "slot" | "text" }> {
    const resolvedTitle = resolveRequiredInlineField(slotContent, fallbackText);

    if (resolvedTitle.kind === "invalid") {
        throw new MissingReferenceTitleError();
    }

    return resolvedTitle;
}

export function resolveLinkedInlineField(
    slotContent: ResolvedSlotContent,
    fallbackText?: string,
    fallbackUrl?: string,
): ResolvedLinkedInlineField {
    return resolveDomainLinkedInlineField(slotContent, fallbackText, fallbackUrl);
}

export async function resolveOptionalSlot(
    slots: SlotLike,
    name: string,
): Promise<ResolvedSlotContent> {
    if (!slots.has(name)) {
        return { kind: "empty", html: "" };
    }

    return classifyRenderedReferenceContent(await slots.render(name));
}

export async function resolveOptionalSlots<TName extends string>(
    slots: SlotLike,
    names: readonly TName[],
): Promise<Record<TName, ResolvedSlotContent>> {
    const entries = await Promise.all(
        names.map(async (name) => [name, await resolveOptionalSlot(slots, name)] as const),
    );

    return Object.fromEntries(entries) as Record<TName, ResolvedSlotContent>;
}

export type PreparedReferenceSlots = {
    [K in ReferenceSlotKey]?: string;
};

const REFERENCE_SLOT_KEYS = [
    "title",
    "description",
    "publication",
    "institution",
] as const;

type ReferenceSlotKey = (typeof REFERENCE_SLOT_KEYS)[number];

export type PreparedReferenceSlotsById = Record<string, PreparedReferenceSlots>;

async function prepareSlotsForReference(
    slots: SlotLike,
    id: string,
): Promise<PreparedReferenceSlots> {
    const resolvedEntries = await Promise.all(
        REFERENCE_SLOT_KEYS.map(async (key) => {
            const resolvedSlot = await resolveOptionalSlot(slots, `${key}-${id}`);
            return [key, resolvedSlot] as const;
        }),
    );

    const prepared: PreparedReferenceSlots = {};

    for (const [key, resolvedSlot] of resolvedEntries) {
        if (isMeaningfulSlotContent(resolvedSlot)) {
            prepared[key] = resolvedSlot.html;
        }
    }

    return prepared;
}

export async function prepareSlotsForReferences<TId extends string>(
    slots: SlotLike,
    referencedIds: readonly TId[],
): Promise<Record<TId, PreparedReferenceSlots>> {
    if (referencedIds.length === 0) {
        return {} as Record<TId, PreparedReferenceSlots>;
    }

    const uniqueReferencedIds = Array.from(new Set(referencedIds));
    const slotsByRef = {} as Record<TId, PreparedReferenceSlots>;

    for (const id of uniqueReferencedIds) {
        slotsByRef[id] = await prepareSlotsForReference(slots, id);
    }

    return slotsByRef;
}
