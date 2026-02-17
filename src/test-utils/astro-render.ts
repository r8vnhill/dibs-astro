import { experimental_AstroContainer as AstroContainer } from "astro/container";

type AstroRenderComponent = Parameters<
    Awaited<ReturnType<typeof AstroContainer.create>>["renderToString"]
>[0];

export type AstroRender<Props extends object> = (
    props: Props,
) => Promise<string>;

export async function createAstroRenderer<Props extends object>(
    component: AstroRenderComponent,
): Promise<AstroRender<Props>> {
    const container = await AstroContainer.create();
    return (props: Props) => container.renderToString(component, { props: props as any });
}
