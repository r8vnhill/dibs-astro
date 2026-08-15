import { createHash } from "node:crypto";

export function digestBytes(bytes) {
    return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function createRegistryClient({ registry, username, password }) {
    if (!registry || !username || !password) throw new Error("Registry credentials are required.");

    return {
        getManifest: (image, reference) => requestManifest(image, reference),
        putManifest: (image, reference, body, contentType) => putManifest(image, reference, body, contentType),
        getBlob: (image, digest) => request(image, `/v2/${image.repository}/blobs/${digest}`, "GET"),
    };

    async function requestManifest(image, reference) {
        const response = await request(
            image,
            `/v2/${image.repository}/manifests/${encodeURIComponent(reference)}`,
            "GET",
            {
                Accept: [
                    "application/vnd.oci.image.index.v1+json",
                    "application/vnd.docker.distribution.manifest.list.v2+json",
                    "application/vnd.oci.image.manifest.v1+json",
                    "application/vnd.docker.distribution.manifest.v2+json",
                ].join(", "),
            },
        );
        if (!response.ok) throw new Error(`Could not read OCI manifest (${response.status}).`);
        return {
            body: Buffer.from(await response.arrayBuffer()),
            contentType: response.headers.get("content-type") ?? "application/vnd.oci.image.manifest.v1+json",
            response,
        };
    }

    async function putManifest(image, reference, body, contentType) {
        const response = await request(
            image,
            `/v2/${image.repository}/manifests/${encodeURIComponent(reference)}`,
            "PUT",
            {
                "Content-Type": contentType,
            },
            body,
        );
        if (!response.ok) throw new Error(`Could not publish ${reference} (${response.status}).`);
        return response;
    }

    async function request(image, path, method, headers = {}, body) {
        const basic = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
        const initial = await fetch(`https://${image.registry}${path}`, {
            method,
            headers: { Authorization: basic, ...headers },
            body,
        });
        if (initial.status !== 401) return initial;

        const challenge = initial.headers.get("www-authenticate");
        if (!challenge) return initial;
        const params = Object.fromEntries(
            [...challenge.matchAll(/(realm|service|scope)="([^"]*)"/g)].map((match) => [match[1], match[2]]),
        );
        const tokenResponse = await fetch(
            `${params.realm}?service=${encodeURIComponent(params.service)}&scope=${
                encodeURIComponent(params.scope ?? `repository:${image.repository}:pull,push`)
            }`,
            {
                headers: { Authorization: basic },
            },
        );
        if (!tokenResponse.ok) throw new Error(`Could not obtain registry authorization (${tokenResponse.status}).`);
        const token = (await tokenResponse.json()).token;
        return fetch(`https://${image.registry}${path}`, {
            method,
            headers: { Authorization: `Bearer ${token}`, ...headers },
            body,
        });
    }
}
