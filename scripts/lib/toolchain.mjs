function readMajor(version) {
    const match = /^(\d+)\./.exec(version);
    return match ? Number(match[1]) : undefined;
}

export function parseNodeRange(range) {
    const match = /^>=(\d+) <(\d+)$/.exec(range);
    if (!match) {
        throw new Error(`Unsupported Node engines range: ${range}`);
    }

    return { minimum: Number(match[1]), exclusiveMaximum: Number(match[2]) };
}

export function assertSupportedToolchain({ packageManifest, nodeVersion, pnpmVersion }) {
    const nodeRange = parseNodeRange(packageManifest.engines?.node ?? "");
    const nodeMajor = readMajor(nodeVersion);
    const expectedPnpm = packageManifest.packageManager?.match(/^pnpm@(\d+\.\d+\.\d+)$/)?.[1];

    if (!nodeMajor || nodeMajor < nodeRange.minimum || nodeMajor >= nodeRange.exclusiveMaximum) {
        throw new Error(`Node ${nodeVersion} does not satisfy engines.node ${packageManifest.engines.node}.`);
    }

    if (!expectedPnpm) {
        throw new Error("packageManager must pin pnpm to an exact version.");
    }

    if (pnpmVersion !== expectedPnpm) {
        throw new Error(`pnpm ${pnpmVersion ?? "unknown"} does not match packageManager pnpm@${expectedPnpm}.`);
    }
}
