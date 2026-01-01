let current = 0;

export function reset() {
    current = 0;
}

export function next(): number {
    current += 1;
    return current;
}
