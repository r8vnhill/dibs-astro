const imageMap = import.meta.glob(
  "/src/assets/img/why/todo/*.{jpg,jpeg,png,webp}",
  { query: "?url", import: "default", eager: true }
);

export const todoImages = Object.values(imageMap) as string[];
