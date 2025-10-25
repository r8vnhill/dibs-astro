import type { ShikiTransformer } from "shiki";

const splitClasses = (value: string | undefined) =>
  value?.split(/\s+/u).filter(Boolean) ?? [];

const normalizeClassList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String).flatMap(splitClasses);
  }
  if (typeof value === "string") {
    return splitClasses(value);
  }
  return [];
};

const mergeClasses = (existing: unknown, extras: string[]): string[] => {
  const classSet = new Set(normalizeClassList(existing));
  for (const extra of extras) {
    if (extra) classSet.add(extra);
  }
  return Array.from(classSet);
};

export function applyTailwindClasses({
  pre = [],
  code = [],
}: {
  pre?: string[];
  code?: string[];
}): ShikiTransformer {
  const preClasses = pre.filter(Boolean);
  const codeClasses = code.filter(Boolean);

  return {
    name: "tailwind-class-injector",
    pre(node) {
      if (!preClasses.length) return;
      node.properties.className = mergeClasses(node.properties.className ?? node.properties.class, preClasses);
      delete node.properties.class;
    },
    code(node) {
      if (!codeClasses.length) return;
      node.properties.className = mergeClasses(node.properties.className ?? node.properties.class, codeClasses);
      delete node.properties.class;
    },
  } satisfies ShikiTransformer;
}
