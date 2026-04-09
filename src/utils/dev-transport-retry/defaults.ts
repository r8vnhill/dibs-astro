/**
 * Default runtime values for the internal `dev-transport-retry` feature modules.
 *
 * This file exists to keep the feature's baseline policy in one place after the split from the
 * public facade. `config.ts` consumes these constants when resolving caller options, while tests
 * and review work can inspect the default retry policy without reading the orchestration logic.
 *
 * These values are intentionally internal to the feature: external callers should still configure
 * behavior through `DevTransportRetryOptions` or the supported environment variables, not by
 * importing this module directly.
 */
export const DEFAULT_ATTEMPTS = 3;
export const DEFAULT_BASE_DELAY_MS = 75;
export const DEFAULT_MAX_DELAY_MS = 400;
export const DEFAULT_TIMEOUT_MS = 1_500;
export const DEFAULT_JITTER_RATIO = 0.15;
