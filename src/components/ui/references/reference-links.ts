import type { HTMLAttributes } from "astro/types";

import { ReferenceContractError } from "./ReferenceContractError";

export const EXTERNAL_REFERENCE_LINK_ATTRS = {
    target: "_blank",
    rel: "noopener noreferrer",
    class: "hover:underline underline-offset-2",
} satisfies HTMLAttributes<"a">;

export function resolveRequiredHref(fieldName: string, href: string): string {
    const trimmed = href.trim();

    if (trimmed.length === 0) {
        throw new ReferenceContractError(`${fieldName} must be a non-empty URL.`);
    }

    return trimmed;
}
