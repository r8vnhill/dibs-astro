export interface Lesson {
  title: string;
  href: string;
  children?: Lesson[];
}

export const courseStructure: Lesson[] = [
  { title: "How To", href: "/notes/" },
  { title: "Installation", href: "/installation/" },
  {
    title: "Unidad 1",
    href: "/unidad-1/",
    children: [
      {
        title: "Contenido 1",
        href: "/unidad-1/contenido-1/",
        children: [
          { title: "Subcontenido 1", href: "/unidad-1/contenido-1/sub1/" },
        ],
      },
      { title: "Contenido 2", href: "/unidad-1/contenido-2/" },
    ],
  },
];
