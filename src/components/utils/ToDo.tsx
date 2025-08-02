import { useLayoutEffect, useState, type JSX } from "react";
import { todoImages } from "~/data/todo-images";
import { pickRandom } from "~/utils";

/**
 * Props for the <ToDo /> component.
 */
export interface ToDoProps {
  /**
   * Optional debug metadata (e.g., title, tasks, etc.).
   * This is not rendered in the UI but can help with debugging.
   */
  metadata?: Record<string, unknown>;

  /**
   * Optional message to display below the image.
   * Defaults to a friendly placeholder note.
   */
  message?: string;

  /**
   * Alternative text for the image.
   * Defaults to "Meme".
   */
  altText?: string;
}

/**
 * <ToDo /> is a visual placeholder component indicating that content is under construction.
 *
 * It displays:
 * - A randomly selected image from a predefined set.
 * - A default or custom message.
 * - A warning in the developer console to flag this component as a temporary stub.
 *
 * This component is client-only and uses `useLayoutEffect` instead of `useEffect` to ensure the
 * random image is selected and rendered *before* the browser paints.
 * This avoids potential layout shifts or race conditions in Astro islands where `useEffect` may not
 * reliably run after hydration.
 */
export default function ToDo({
  metadata,
  message = "TODO: Estamos (estoy) trabajando para ustedes c:",
  altText = "Meme",
}: ToDoProps): JSX.Element {
  // Holds the selected image URL or null while loading
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  // Select a random image and emit a console warning before the first paint
  useLayoutEffect(() => {
    const randomImage = pickRandom(todoImages);
    setImageSrc(randomImage ?? null);

    console.warn(
      "⚠️ [ToDo]: This component is a placeholder. Replace it with real content.",
      metadata
    );
  }, []);

  return (
    <figure
      aria-describedby="todo-message"
      className="
        flex flex-col
        p-4
        border-primary border border-dashed
        items-center gap-4 rounded
      "
    >
      {/* Show status based on the selected image */}
      {imageSrc === null ? (
        <div
          className="
            text-sm text-gray-500
            italic
          "
        >
          Cargando imagen...
        </div>
      ) : imageSrc === "" ? (
        <div
          className="
            text-sm text-red-600
          "
        >
          ⚠️ Imagen no disponible
        </div>
      ) : (
        <img
          key={imageSrc}
          src={imageSrc}
          alt={altText}
          className="
            w-full max-w-xs
            rounded shadow
          "
        />
      )}

      {/* Display the custom or default message */}
      <figcaption
        id="todo-message"
        className="
          text-center text-sm
          italic
        "
      >
        {message}
      </figcaption>
    </figure>
  );
}
