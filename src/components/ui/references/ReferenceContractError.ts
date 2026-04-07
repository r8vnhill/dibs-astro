/**
 * Base error for invalid reference component contracts.
 *
 * These errors represent caller-side violations of rendering invariants inside the references UI
 * family, where producing markup would otherwise hide invalid bibliography data.
 */
export class ReferenceContractError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ReferenceContractError";
    }
}

/**
 * Raised when a reference entry is rendered without any meaningful title source.
 */
export class MissingReferenceTitleError extends ReferenceContractError {
    constructor() {
        super(
            "Reference component requires a title via the `title` prop or a meaningful `title` slot.",
        );
        this.name = "MissingReferenceTitleError";
    }
}
