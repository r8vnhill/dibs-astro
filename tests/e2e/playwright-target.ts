export type PlaywrightTarget = Readonly<{
    baseURL: string;
    webServer:
        | Readonly<{
            command: string;
            url: string;
            reuseExistingServer: boolean;
            timeout: number;
        }>
        | undefined;
}>;

const localTarget = {
    baseURL: "http://127.0.0.1:4321",
    webServer: {
        command: "node ./node_modules/astro/bin/astro.mjs dev --host 127.0.0.1 --port 4321",
        url: "http://127.0.0.1:4321",
        reuseExistingServer: true,
        timeout: 120_000,
    },
} as const;

export function resolvePlaywrightTarget(externalBaseUrl: string | undefined, isCi: boolean): PlaywrightTarget {
    if (!externalBaseUrl) {
        return { ...localTarget, webServer: { ...localTarget.webServer, reuseExistingServer: !isCi } };
    }

    return { baseURL: externalBaseUrl, webServer: undefined };
}
