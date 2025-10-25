import { defineCollection } from "astro:content";

// Define content collections explicitly to avoid deprecated auto-generation.
// We currently keep an empty "installation" collection for future MD/MDX entries.
const installation = defineCollection({ type: "content" });

export const collections = {
  installation,
};
