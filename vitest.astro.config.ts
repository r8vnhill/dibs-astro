import { getViteConfig } from "astro/config";

export default getViteConfig({
    test: {
        environment: "node",
        globals: true,
        css: false,
        include: ["src/components/meta/__tests__/Head.render.test.ts"],
    },
});
