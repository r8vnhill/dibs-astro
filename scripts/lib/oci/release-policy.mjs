const releaseTagPattern = /^(?:0|[1-9]\d*)\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export function resolvePublicationAliases({ branch, tag, version }, candidate) {
    if (candidate.revision !== candidate.revision.toLowerCase()) {
        throw new Error("Candidate revision must be lowercase.");
    }

    const aliases = [candidate.revision];
    if (tag) {
        if (!releaseTagPattern.test(tag)) throw new Error(`Release tag ${tag} must use the project version format.`);
        if (tag !== version) throw new Error(`Release tag ${tag} does not match package version ${version}.`);
        aliases.push(version);
    } else if (branch === "main") {
        return aliases;
    }

    return [...new Set(aliases)];
}
