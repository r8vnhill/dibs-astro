export const fail = (sourceLabel, message) => {
    throw new Error(`[${sourceLabel}] ${message}`);
};

export const ensureNodeCategory = (
    recordsById,
    getNodeTypes,
    id,
    allowedTypes,
    sourceLabel,
    relationLabel,
) => {
    const record = recordsById.get(id);
    if (!record) fail(sourceLabel, `${relationLabel} points to missing node "${id}".`);
    const types = getNodeTypes(record, sourceLabel);
    if (!types.some((type) => allowedTypes.has(type))) {
        fail(
            sourceLabel,
            `${relationLabel} points to "${id}" with invalid type "${types.join(", ")}".`,
        );
    }
};
