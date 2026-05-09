/*
 * Shiki highlighter service instance for the DIBS app.
 *
 * Wraps the @ravenhill/shiki-core service with app-specific configuration,
 * particularly the runWithDevTransportRetry for handling development timeouts.
 */
import { createShikiHighlighterService } from "@ravenhill/shiki-core";
import { runWithDevTransportRetry } from "~/utils";

/**
 * App-configured Shiki service with dev-transport retry support.
 */
export const appShikiService = createShikiHighlighterService({
    retry: (operation, context) =>
        runWithDevTransportRetry(async ({ signal: _signal }) => operation(), {
            label: `shiki ${context.operation}${context.language ? ` (${context.language})` : ""}`,
        }),
});
