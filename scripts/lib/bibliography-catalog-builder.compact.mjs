import { DIBS, ID_PREFIXES, SCHEMA, SITE_ORIGIN } from "./bibliography-catalog-builder.constants.mjs";

export const compactId = (iri) => {
    if (iri.startsWith(`${SITE_ORIGIN}/notes/`)) {
        return iri.slice(SITE_ORIGIN.length);
    }

    for (const [base, prefix] of ID_PREFIXES) {
        if (iri.startsWith(base)) {
            return `${prefix}${iri.slice(base.length)}`;
        }
    }

    return iri;
};

export const compactUrl = (value) => {
    if (value.startsWith(`${SITE_ORIGIN}/notes/`)) {
        return value.slice(SITE_ORIGIN.length);
    }
    return value;
};

export const compactType = (iri) => {
    if (iri.startsWith(SCHEMA)) return iri.slice(SCHEMA.length);
    if (iri.startsWith(DIBS)) return `dibs:${iri.slice(DIBS.length)}`;
    return iri;
};
