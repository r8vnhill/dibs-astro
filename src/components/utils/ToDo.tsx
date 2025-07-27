import { useMemo, useEffect } from 'preact/hooks';
import type { JSX } from 'preact/jsx-runtime';

/**
 * Dynamically imports all images from the specified folder as static URLs.
 *
 * - `eager: true` ensures the images are bundled immediately.
 * - `as: 'url'` transforms file paths into URL strings for use in <img> tags.
 */
const imageMap = import.meta.glob('/src/assets/img/why/todo/*.{jpg,jpeg,png,webp}', {
  query: '?url',
  import: 'default',
  eager: true,
});

/**
 * Converts the globbed image map into an array of URL strings.
 */
const images = Object.values(imageMap) as string[];

/**
 * Props for the <ToDo /> component.
 */
export interface ToDoProps {
  /**
   * Optional debug metadata, not rendered in the UI.
   */
  metadata?: Record<string, unknown>;

  /**
   * Optional message shown under the image.
   * Defaults to a friendly placeholder.
   */
  message?: string;

  /**
   * Optional alt text for the image.
   * Defaults to "Meme".
   */
  altText?: string;
}

/**
 * Placeholder component indicating that content is under construction.
 * Displays a random image and message, and logs a warning to the console.
 */
export default function ToDo({
  metadata,
  message = 'TODO: Estamos (estoy) trabajando para ustedes c:',
  altText = 'Meme',
}: ToDoProps): JSX.Element {
  // Pick a random image once on mount
  const imageSrc = useMemo(() => pickRandom(images) ?? '', []);

  // Warn on mount that this is a placeholder
  useEffect(() => {
    console.warn(
      '⚠️ [ToDo]: This component is a placeholder. Replace it with real content.',
      metadata
    );
  }, []);

  return (
    <figure
      aria-describedby="todo-message"
      class="border-primary flex flex-col items-center gap-4 rounded border border-dashed p-4"
    >
      {imageSrc ? (
        <img src={imageSrc} alt={altText} class="w-full max-w-xs rounded shadow" loading="lazy" />
      ) : (
        <div class="text-sm text-red-600">⚠️ Imagen no disponible</div>
      )}
      <figcaption id="todo-message" class="text-center text-sm italic">
        {message}
      </figcaption>
    </figure>
  );
}

/**
 * Returns a random element from an array.
 *
 * @param arr Array to select from.
 * @returns A random element or `undefined` if the array is empty.
 */
function pickRandom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}
