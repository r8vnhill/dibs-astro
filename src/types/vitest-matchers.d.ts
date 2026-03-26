import "vitest";

declare module "vitest" {
    interface Describe {
        concurrent: Describe;
    }

    interface Assertion<T = any> {
        toBeUndefined(): T;
    }

    interface AsymmetricMatchersContaining {
        toBeUndefined(): void;
    }
}
