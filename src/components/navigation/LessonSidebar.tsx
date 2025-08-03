import type { FC } from "react";
import { useEffect, useState } from "react";
import clsx from "clsx";
import type { Lesson } from "~/data/course-structure";
import { LessonTree } from "./LessonTree";
import { useMediaQuery } from "~/hooks/use-media-query";

interface Props {
  lessons: Lesson[];
}

export const LessonSidebar: FC<Props> = ({ lessons }) => {
  const isSmall = useMediaQuery("(max-width: 1024px)");
  const [hydrated, setHydrated] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const stored = localStorage.getItem("sidebar-visible");
    if (stored !== null) {
      setVisible(stored === "true");
    } else {
      setVisible(!isSmall);
    }
  }, [hydrated, isSmall]);

  useEffect(() => {
    if (isSmall) {
      const stored = localStorage.getItem("sidebar-visible");
      if (stored === null) {
        setVisible(false);
      }
    } else {
      const stored = localStorage.getItem("sidebar-visible");
      if (stored === null) {
        setVisible(true);
      }
    }
  }, [isSmall]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-visible", visible ? "true" : "false");
    }
  }, [visible]);

  return (
    <div className="relative flex-shrink-0">
      <div className="relative flex-shrink-0 flex">
        {hydrated && !isSmall && (
          <div
            onClick={() => setVisible((v) => !v)}
            className="w-2 cursor-ew-resize hover:bg-primary-light/20 transition"
            title={visible ? "Ocultar menú" : "Mostrar menú"}
          />
        )}

        <div
          className={clsx(
            "w-72", // antes: w-64
            "min-w-72", // antes: min-w-64
            "p-4",
            "border-r",
            "border-base-border",
            "bg-base-background",
            "overflow-y-auto",
            "overflow-x-hidden",
            "shrink-0",
            "h-full",
            "transition-all",
            "duration-200",
            visible ? "opacity-100" : "pointer-events-none opacity-0",
            hydrated && isSmall
              ? "fixed inset-y-0 left-0 z-40 w-72 bg-base-background shadow-lg" // también cambia w-64 aquí
              : "w-72"
          )}
        >
          <div className="overflow-y-auto h-full py-2">
            <LessonTree lessons={lessons} />
          </div>
        </div>
      </div>

      {hydrated && isSmall && visible && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          aria-hidden="true"
          onClick={() => setVisible(false)}
        />
      )}
    </div>
  );
};

export default LessonSidebar;
