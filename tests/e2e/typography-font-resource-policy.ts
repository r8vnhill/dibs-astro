/** Allow only the production Fira Code font files among external web-font resources. */
export const isProductionFiraCodeFontResource = (resourceUrl: string): boolean => {
  const url = new URL(resourceUrl);
  return url.origin === "https://fonts.gstatic.com" && url.pathname.startsWith("/s/firacode/");
};
