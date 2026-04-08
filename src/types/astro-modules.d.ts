declare module "*.astro" {
    const AstroComponent: (props: Record<string, any>) => any;
    export default AstroComponent;
}
