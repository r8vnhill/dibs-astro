/** Stable identity and routing helpers for catalog-backed lesson citations. */

const REFERENCE_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export const referenceAnchor = (referenceId: string): string => {
    const normalizedId = referenceId.startsWith("ref:") ? referenceId.slice(4) : referenceId;
    if (!REFERENCE_ID_PATTERN.test(normalizedId)) {
        throw new Error(`Invalid bibliography reference ID: ${referenceId}`);
    }

    return `ref-${normalizedId}`;
};

export const referenceCitationHref = (readingsPath: string, referenceId: string): string => {
    const normalizedPath = readingsPath.endsWith("/") ? readingsPath : `${readingsPath}/`;
    return `${normalizedPath}#${referenceAnchor(referenceId)}`;
};
