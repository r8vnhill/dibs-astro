/**
 * @fileoverview Non-usage graph-node builders for the bibliography catalog.
 *
 * This module contains the public builders for the stable, non-usage node
 * categories:
 *
 * - `Person`
 * - `Organization` and `CollegeOrUniversity`
 * - `CreativeWork`
 * - concrete reference nodes such as `Book` and `Thesis`
 * - `LearningResource`
 *
 * Shared helper logic lives in `graph.support.mjs` so these builders remain
 * focused on per-node field extraction, relation validation, and final
 * JSON-LD shape assembly.
 */

import { SCHEMA } from "./constants.mjs";
import {
    asIdRef,
    asIdRefs,
    AUTHOR_TYPES,
    CREATIVE_WORK_TYPES,
    getRequiredScalar,
    PUBLISHER_TYPES,
    validateRelationRef,
    validateRelationRefs,
    withOptional,
} from "./graph.support.mjs";

export const buildPersonNode = (record, context) => {
    const givenName = context.scalarLiteral(
        record,
        `${SCHEMA}givenName`,
        context.sourceLabel,
    );
    const familyName = context.scalarLiteral(
        record,
        `${SCHEMA}familyName`,
        context.sourceLabel,
    );
    const url = context.scalarUrlLiteral(
        record,
        `${SCHEMA}url`,
        context.sourceLabel,
    );

    return {
        "@id": record.id,
        "@type": "Person",
        ...withOptional("givenName", givenName),
        ...withOptional("familyName", familyName),
        ...withOptional("url", url),
    };
};

export const buildOrganizationNode = (record, context) => {
    const name = getRequiredScalar(
        record,
        `${SCHEMA}name`,
        (currentRecord) => `organization "${currentRecord.id}" is missing schema:name.`,
        context,
    );
    const url = context.scalarUrlLiteral(
        record,
        `${SCHEMA}url`,
        context.sourceLabel,
    );

    return {
        "@id": record.id,
        "@type": record.primaryType,
        name,
        ...withOptional("url", url),
    };
};

export const buildCreativeWorkNode = (record, context) => {
    const name = getRequiredScalar(
        record,
        `${SCHEMA}name`,
        (currentRecord) => `work "${currentRecord.id}" is missing schema:name.`,
        context,
    );
    const authors = context.namedRefs(
        record,
        `${SCHEMA}author`,
        context.sourceLabel,
    );
    validateRelationRefs(
        authors,
        AUTHOR_TYPES,
        () => `work "${record.id}" author`,
        context,
    );

    const publisherId = context.namedRefs(
        record,
        `${SCHEMA}publisher`,
        context.sourceLabel,
    )[0];
    validateRelationRef(
        publisherId,
        PUBLISHER_TYPES,
        `work "${record.id}" publisher`,
        context,
    );

    return {
        "@id": record.id,
        "@type": "CreativeWork",
        name,
        ...(authors.length > 0 ? { author: asIdRefs(authors) } : {}),
        ...(publisherId ? { publisher: asIdRef(publisherId) } : {}),
    };
};

export const buildReferenceNode = (record, context) => {
    const name = getRequiredScalar(
        record,
        `${SCHEMA}name`,
        (currentRecord) => `reference "${currentRecord.id}" is missing schema:name.`,
        context,
    );
    const authors = context.namedRefs(
        record,
        `${SCHEMA}author`,
        context.sourceLabel,
    );
    validateRelationRefs(
        authors,
        AUTHOR_TYPES,
        () => `reference "${record.id}" author`,
        context,
    );

    const publisherId = context.namedRefs(
        record,
        `${SCHEMA}publisher`,
        context.sourceLabel,
    )[0];
    validateRelationRef(
        publisherId,
        PUBLISHER_TYPES,
        `reference "${record.id}" publisher`,
        context,
    );

    const isPartOfId = context.namedRefs(
        record,
        `${SCHEMA}isPartOf`,
        context.sourceLabel,
    )[0];
    validateRelationRef(
        isPartOfId,
        CREATIVE_WORK_TYPES,
        `reference "${record.id}" isPartOf`,
        context,
    );

    const url = context.scalarUrlLiteral(
        record,
        `${SCHEMA}url`,
        context.sourceLabel,
    );
    const datePublished = context.scalarLiteral(
        record,
        `${SCHEMA}datePublished`,
        context.sourceLabel,
    );
    const pageStart = context.scalarInteger(
        record,
        `${SCHEMA}pageStart`,
        context.sourceLabel,
    );
    const pageEnd = context.scalarInteger(
        record,
        `${SCHEMA}pageEnd`,
        context.sourceLabel,
    );

    return {
        "@id": record.id,
        "@type": record.primaryType,
        name,
        ...withOptional("url", url),
        ...withOptional("datePublished", datePublished),
        ...(pageStart != null ? { pageStart } : {}),
        ...(pageEnd != null ? { pageEnd } : {}),
        ...(authors.length > 0 ? { author: asIdRefs(authors) } : {}),
        ...(publisherId ? { publisher: asIdRef(publisherId) } : {}),
        ...(isPartOfId ? { isPartOf: asIdRef(isPartOfId) } : {}),
    };
};

export const buildLearningResourceNode = (record, context) => {
    const name = getRequiredScalar(
        record,
        `${SCHEMA}name`,
        (currentRecord) => `lesson "${currentRecord.id}" is missing schema:name.`,
        context,
    );
    const url = context.scalarUrlLiteral(
        record,
        `${SCHEMA}url`,
        context.sourceLabel,
    );

    return {
        "@id": record.id,
        "@type": "LearningResource",
        name,
        ...withOptional("url", url),
    };
};
