import clsx from "clsx";
import { useLayoutEffect, useState } from "preact/hooks";
import type { JSX } from "preact/jsx-runtime";
import { notFoundMessages, ultraRareMessage } from "~/data/not-found-messages";
import { pickRandom, type StyledComponent } from "~/utils";

/**
 * Props for the <NotFound /> component.
 *
 * This component accepts all standard styling props via `className` using the `StyledComponent`
 * type.
 */
type NotFoundProps = StyledComponent;

/**
 * <NotFound /> displays a large heading with a random 404 message.
 *
 * On very rare occasions, it shows a hidden easter egg message ("¡Has encontrado el One Piece!").
 * It is designed to be used on 404 error pages, and supports custom styling via `className`.
 *
 * This component uses `useLayoutEffect` to ensure the message is selected before the initial paint.
 * This avoids a brief flash of empty or incorrect content.
 */
export default function NotFound({ className }: NotFoundProps): JSX.Element {
  // Holds the selected 404 message title
  const [title, setTitle] = useState<string | null>(null);

  useLayoutEffect(() => {
    // Select a random message (ultra-rare easter egg included)
    const notFoundMessage =
      Math.random() < 1e-6
        ? ultraRareMessage
        : pickRandom(notFoundMessages);

    console.log("📄 NotFound title:", notFoundMessage);
    setTitle(notFoundMessage ?? null);
  }, []);

  return (
    <h1
      // Merge default Tailwind styles with optional external className
      className={clsx([
        "text-4xl",           // Base size
        "sm:text-5xl",        // Medium screens
        "md:text-6xl",        // Large screens
        "font-extrabold",     // Emphasize the heading
        "text-primary",       // Themed text color
        "tracking-tight",     // Reduce letter spacing
        "drop-shadow-md",     // Add subtle depth
        "font-404-title",     // Custom font defined for 404 pages
        "animate-fade-in",    // Smooth entrance animation
        className,            // Allow external overrides
      ])}
      role="heading"
      aria-level={1}
    >
      {title}
    </h1>
  );
}
