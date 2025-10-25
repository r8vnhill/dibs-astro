export function normalizePropAsString(value: unknown): string | undefined {
    return Array.isArray(value) ? value.join(" ") : (value as string | undefined);
}
