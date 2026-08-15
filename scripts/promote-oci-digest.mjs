import { readFile } from "node:fs/promises";

const metadataPath = process.argv[2] ?? "tmp/oci-candidate.json";
const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
const registry = process.env.CI_REGISTRY;
const username = process.env.CI_REGISTRY_USER;
const password = process.env.CI_REGISTRY_PASSWORD;
const sourceImage = metadata.image;

if (!registry || !username || !password) {
    throw new Error("OCI promotion requires CI_REGISTRY, CI_REGISTRY_USER, and CI_REGISTRY_PASSWORD.");
}

const source = parseImage(sourceImage);
if (source.registry !== registry) {
    throw new Error(`Candidate registry ${source.registry} does not match CI_REGISTRY.`);
}

const manifest = await getManifest(source, metadata.digest);
const actualDigest = digestHeader(manifest.response.headers);
if (actualDigest && actualDigest !== metadata.digest) {
    throw new Error(`Candidate digest changed: expected ${metadata.digest}, received ${actualDigest}.`);
}

const tags = new Set([metadata.revision]);
if (process.env.CI_COMMIT_TAG) tags.add(process.env.CI_COMMIT_TAG);
if (process.env.CI_COMMIT_BRANCH === "main" || process.env.CI_COMMIT_TAG) tags.add(await packageVersion());

for (const tag of tags) {
    if (!tag) continue;
    await putManifest(source, tag, manifest.body, manifest.contentType);
    console.log(`Published ${source.repository}:${tag} at ${metadata.digest}.`);
}

async function getManifest(image, reference) {
    const response = await registryRequest(image, `/v2/${image.repository}/manifests/${reference}`, "GET", {
        Accept: [
            "application/vnd.oci.image.index.v1+json",
            "application/vnd.docker.distribution.manifest.list.v2+json",
            "application/vnd.oci.image.manifest.v1+json",
            "application/vnd.docker.distribution.manifest.v2+json",
        ].join(", "),
    });
    if (!response.ok) throw new Error(`Could not read candidate manifest (${response.status}).`);
    return { body: await response.text(), contentType: response.headers.get("content-type") ?? "application/vnd.oci.image.manifest.v1+json", response };
}

async function putManifest(image, tag, body, contentType) {
    const response = await registryRequest(image, `/v2/${image.repository}/manifests/${encodeURIComponent(tag)}`, "PUT", {
        "Content-Type": contentType,
    }, body);
    if (!response.ok) throw new Error(`Could not publish ${tag} (${response.status}).`);
}

async function registryRequest(image, path, method, headers = {}, body) {
    const initial = await fetch(`https://${image.registry}${path}`, {
        method,
        headers: { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`, ...headers },
        body,
    });
    if (initial.status !== 401) return initial;

    const challenge = initial.headers.get("www-authenticate");
    if (!challenge) return initial;
    const params = Object.fromEntries([...challenge.matchAll(/(realm|service|scope)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
    const tokenResponse = await fetch(`${params.realm}?service=${encodeURIComponent(params.service)}&scope=${encodeURIComponent(params.scope ?? `repository:${image.repository}:pull,push`)}`, {
        headers: { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}` },
    });
    if (!tokenResponse.ok) throw new Error(`Could not obtain registry authorization (${tokenResponse.status}).`);
    const token = (await tokenResponse.json()).token;
    return fetch(`https://${image.registry}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...headers },
        body,
    });
}

function parseImage(value) {
    const match = value.match(/^(?<registry>[^/]+)\/(?<repository>.+):[^:@]+$/);
    if (!match?.groups) throw new Error(`Unsupported OCI image reference: ${value}`);
    return match.groups;
}

function digestHeader(headers) {
    return headers.get("docker-content-digest") ?? headers.get("oci-content-digest");
}

async function packageVersion() {
    const packageJson = JSON.parse(await readFile("package.json", "utf8"));
    return packageJson.version;
}
