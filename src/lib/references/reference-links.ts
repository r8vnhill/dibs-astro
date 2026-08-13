/** Stable identity and routing helpers for catalog-backed lesson citations. */

const REFERENCE_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export const referenceAnchor = (referenceId: string): string => {
    if (!REFERENCE_ID_PATTERN.test(referenceId)) {
        throw new Error(`Invalid bibliography reference ID: ${referenceId}`);
    }

    return `ref-${referenceId}`;
};

export const referenceCitationHref = (readingsPath: string, referenceId: string): string => {
    const normalizedPath = readingsPath.endsWith("/") ? readingsPath : `${readingsPath}/`;
    return `${normalizedPath}#${referenceAnchor(referenceId)}`;
};
