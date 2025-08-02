import type { FC } from "react";
import { useEffect, useState } from "react";
import clsx from "clsx";
import type { Lesson } from "~/data/course-structure";
import { LessonTree } from "./LessonTree";
import { useMediaQuery } from "~/hooks/use-media-query";

/**
 * Props:
 *  - lessons: estructura de lecciones
 */
interface Props {
  lessons: Lesson[];
}

export const LessonSidebar: FC<Props> = ({ lessons }) => {
  const isSmall = useMediaQuery("(max-width: 1024px)"); // colapsa en pantallas pequeñas (ej. lg abajo)
  const [hydrated, setHydrated] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setHydrated(true); // ya podemos confiar en el valor de `isSmall`
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const stored = localStorage.getItem("sidebar-visible");
    if (stored !== null) {
      setVisible(stored === "true");
    } else {
      setVisible(!isSmall); // solo decidir visibilidad una vez que sabemos el tamaño
    }
  }, [hydrated, isSmall]);

  // Sincronizar media query: si entra en small y no hay preferencia, colapsar
  useEffect(() => {
    if (isSmall) {
      const stored = localStorage.getItem("sidebar-visible");
      if (stored === null) {
        setVisible(false);
      }
    } else {
      // en pantallas grandes, mostrar si no se ha guardado override
      const stored = localStorage.getItem("sidebar-visible");
      if (stored === null) {
        setVisible(true);
      }
    }
  }, [isSmall]);

  // Persistir cuando cambie
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-visible", visible ? "true" : "false");
    }
  }, [visible]);

  return (
    <div className="relative flex-shrink-0">
      <div className="relative flex-shrink-0 flex">
        {/* Mostrar barra solo una vez hidratado */}
        {hydrated && !isSmall && (
          <div
            onClick={() => setVisible((v) => !v)}
            className="w-2 cursor-ew-resize hover:bg-primary-light/20 transition"
            title={visible ? "Ocultar menú" : "Mostrar menú"}
          />
        )}

        <div
          className={clsx(
            "sidebar transition-all duration-200",
            visible ? "opacity-100" : "pointer-events-none opacity-0",
            hydrated && isSmall
              ? "fixed inset-y-0 left-0 z-50 w-64 bg-base-background shadow-lg"
              : "w-64"
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
