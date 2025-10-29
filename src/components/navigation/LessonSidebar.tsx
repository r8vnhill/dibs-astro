import clsx from "clsx";
import type { FC } from "react";
import { useEffect, useState } from "react";
import type { Lesson } from "~/data/course-structure";
import { useMediaQuery } from "~/hooks/use-media-query";
import { LessonTree } from "./LessonTree";

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
                    <button
                        onClick={() => setVisible((v) => !v)}
                        className={clsx(
                            "w-1.5 transition-all duration-200",
                            "cursor-ew-resize",
                            "relative overflow-hidden",
                            // Modern grip pattern using subtle gradient
                            "before:absolute before:inset-0",
                            "before:bg-gradient-to-b before:from-base-border/40 before:via-transparent before:to-base-border/40",
                            "hover:w-2",
                            visible
                                ? "opacity-70 hover:opacity-100 bg-base-border/20"
                                : "opacity-40 hover:opacity-70 bg-base-border/10",
                        )}
                        title={visible ? "Ocultar menú" : "Mostrar menú"}
                        aria-label={visible ? "Ocultar menú" : "Mostrar menú"}
                    />
                )}

                <div
                    className={clsx(
                        "w-72 min-w-72",
                        "px-3 py-4",
                        // Refined card aesthetic
                        "bg-base-background/98",
                        "backdrop-blur-md",
                        "border-r border-base-border/50",
                        "shadow-sm",
                        // Scrolling
                        "overflow-y-auto overflow-x-hidden",
                        "shrink-0 h-full",
                        // Smooth motion
                        "transition-all duration-300 ease-in-out",
                        visible ? "opacity-100" : "pointer-events-none opacity-0",
                        hydrated && isSmall
                            ? "fixed inset-y-0 left-0 z-40 shadow-2xl border-r-0 rounded-r-xl"
                            : "",
                    )}
                >
                    <div className="overflow-y-auto h-full">
                        <LessonTree lessons={lessons} persistKey="lesson-tree" />
                    </div>
                </div>
            </div>

            {hydrated && isSmall && visible && (
                <div
                    className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-all duration-300"
                    aria-hidden="true"
                    onClick={() => setVisible(false)}
                />
            )}
        </div>
    );
};

export default LessonSidebar;
