import { z } from "zod";

const digestPattern = /^sha256:[0-9a-f]{64}$/;
const revisionPattern = /^[0-9a-f]{40,64}$/;
const semverPattern = /^(?:0|[1-9]\d*)\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const sourcePattern = /^https:\/\/[^\s/]+(?:\/[^\s]*)?$/;

export const candidateMetadataSchema = z.object({
    schemaVersion: z.literal(1),
    image: z.string().min(1).refine(isTaggedImageReference, "image must include a tag"),
    digest: z.string().regex(digestPattern, "digest must be a lowercase sha256 digest"),
    revision: z.string().regex(revisionPattern, "revision must be a full Git revision"),
    version: z.string().regex(semverPattern, "version must be a valid project version"),
    source: z.string().regex(sourcePattern, "source must be an HTTPS repository URL"),
    platform: z.string().regex(
        /^[a-z0-9][a-z0-9.-]*\/[a-z0-9][a-z0-9.-]*$/,
        "platform must use os/architecture syntax",
    ),
}).strict();

export function parseCandidateMetadata(value) {
    return candidateMetadataSchema.parse(value);
}

export function isTaggedImageReference(value) {
    return /^(?:[^/]+\/)?[^:@/]+(?:\/[^:@]+)*:[^:@]+$/.test(value);
}

export function parseImageReference(value) {
    if (!isTaggedImageReference(value)) throw new Error(`Unsupported OCI image reference: ${value}`);
    const match = /^(?<registry>[^/]+)\/(?<repository>.+):(?<tag>[^:@]+)$/.exec(value);
    if (!match?.groups) throw new Error(`Unsupported OCI image reference: ${value}`);
    return match.groups;
}
