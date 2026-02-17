declare module "jsdom" {
    export class JSDOM {
        window: {
            document: Document;
        };

        constructor(html?: string | Buffer, options?: unknown);
    }
}
