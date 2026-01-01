import clsx from "clsx";
import { CaretDown, CaretRight } from "phosphor-react";
import { memo, type ReactNode, useCallback, useEffect, useState } from "react";
import type { Lesson } from "~/data/course-structure";

/**
 * Props:
 *  - lessons: tree of lessons to render
 *  - depth: recursion depth (used for indentation)
 */
interface Props {
    lessons: Lesson[];
    depth?: number;
    /**
     * Optional key to persist expand/collapse state in localStorage.
     * When provided, user toggles will be saved and restored.
     */
    persistKey?: string;
}

export const LessonTree = memo(function LessonTree({ lessons, depth = 0, persistKey }: Props) {
    const [currentPath, setCurrentPath] = useState<string>("/");
    const [open, setOpen] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setCurrentPath(window.location.pathname);
    }, []);

    // Auto-expand parents of active path once per render tree
    useEffect(() => {
        const expanded: Record<string, boolean> = {};
        const walk = (nodes: Lesson[]): boolean => {
            let matchedSubtree = false;
            for (const node of nodes) {
                const key = node.href ?? node.title;
                const selfMatch = node.href === currentPath;
                const childMatch = node.children ? walk(node.children) : false;
                if (childMatch) {
                    expanded[key] = true;
                }
                matchedSubtree = matchedSubtree || selfMatch || childMatch;
            }
            return matchedSubtree;
        };
        walk(lessons);

        let persisted: Record<string, boolean> = {};
        if (persistKey && typeof window !== "undefined") {
            try {
                const raw = localStorage.getItem(persistKey);
                if (raw) persisted = JSON.parse(raw);
            } catch {
                // ignore parse errors
            }
        }

        setOpen((prev) => ({ ...prev, ...expanded, ...persisted }));
    }, [lessons, currentPath, persistKey]);

    const toggle = useCallback((key: string) => {
        setOpen((prev) => {
            const currentValue = prev[key] ?? true;
            const nextValue = !currentValue;
            const next = { ...prev, [key]: nextValue };
            if (persistKey && typeof window !== "undefined") {
                try {
                    localStorage.setItem(persistKey, JSON.stringify(next));
                } catch {
                    // ignore quota errors
                }
            }
            return next;
        });
    }, [persistKey]);

    // Use a fixed set of Tailwind classes so the compiler can tree-shake correctly.
    const INDENTS = ["pl-0", "pl-3", "pl-6", "pl-9"] as const;
    const indentPadding = (d: number) => INDENTS[Math.min(d, INDENTS.length - 1)];

    // Small subcomponents to keep markup concise and reusable
    function ToggleBtn({ onClick, isOpen }: { onClick: () => void; isOpen: boolean }) {
        return (
            <button
                onClick={onClick}
                aria-label={isOpen ? "Contraer sección" : "Expandir sección"}
                className="flex-none w-5 h-5 grid place-items-center rounded hover:bg-base-border/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary text-base-text/60 hover:text-base-text transition-all"
            >
                {isOpen
                    ? <CaretDown size={14} weight="bold" />
                    : <CaretRight size={14} weight="bold" />}
            </button>
        );
    }

    const renderLessons = useCallback((nodes: Lesson[], level: number): ReactNode[] => {
        return nodes.map((lesson, index) => {
            const key = lesson.href ?? `${lesson.title}-${level}-${index}`;
            const isActive = lesson.href ? currentPath === lesson.href : false;
            const hasChildren = !!lesson.children?.length;
            const isOpen = open[key] ?? true;

            return (
                <li
                    key={key}
                    role="treeitem"
                    aria-expanded={hasChildren ? isOpen : undefined}
                    className={clsx("group", indentPadding(level), "relative")}
                >
                    <div className="flex items-center gap-1.5">
                        {hasChildren
                            ? <ToggleBtn onClick={() => toggle(key)} isOpen={isOpen} />
                            : <div className="w-5" aria-hidden="true" />}
                        {lesson.href
                            ? (
                                <a
                                    href={lesson.href}
                                    aria-current={isActive ? "page" : undefined}
                                    className={clsx(
                                        "group flex-1 block mx-2 no-underline outline-none focus:outline-none shadow-none ring-0 border-0 border-l-0",
                                    )}
                                >
                                    <span
                                        className={clsx(
                                            "block rounded-lg px-3 py-1.5 text-sm transition-colors",
                                            isActive
                                                ? "bg-primary/15 text-primary font-semibold"
                                                : "text-base-text group-hover:bg-base-border/10 group-hover:text-primary",
                                        )}
                                    >
                                        {lesson.title}
                                    </span>
                                </a>
                            )
                            : (
                                <span
                                    className={clsx(
                                        "flex-1 px-3 py-1 mx-2 ml-1",
                                        "text-base-text/60",
                                        "font-semibold text-xs uppercase tracking-wider",
                                    )}
                                >
                                    {lesson.title}
                                </span>
                            )}
                    </div>
                    {hasChildren && isOpen && (
                        <div className="mt-1">
                            <nav aria-label="Navegación de lecciones" className="lesson-tree">
                                <ul role="tree" className="space-y-1">
                                    {renderLessons(lesson.children!, level + 1)}
                                </ul>
                            </nav>
                        </div>
                    )}
                </li>
            );
        });
    }, [currentPath, toggle, open]);

    return (
        <nav aria-label="Navegación de lecciones" className="lesson-tree">
            <ul role="tree" className="space-y-1">
                {renderLessons(lessons, depth)}
            </ul>
        </nav>
    );
});
