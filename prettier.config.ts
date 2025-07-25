import type { Config } from 'prettier';

/**
 * Prettier configuration for Astro + Preact + Tailwind projects.
 * Includes Astro parser and automatic Tailwind class sorting.
 */
export const config = {
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 100,
  tabWidth: 2,
  plugins: [
    'prettier-plugin-astro', // Enables .astro file support
    'prettier-plugin-tailwindcss', // Enables Tailwind class sorting
    'prettier-plugin-classnames', // Enables classnames sorting
  ],
  overrides: [
    {
      files: '*.astro',
      options: {
        parser: 'astro',
      },
    },
  ],
} satisfies Config;

export default config;
