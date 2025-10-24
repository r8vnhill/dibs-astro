import clsx from "clsx";
import { CaretDown, CaretRight } from "phosphor-react";
import type { FC } from "react";
import { useEffect, useState } from "react";
import type { Lesson } from "~/data/course-structure";

/**
 * Props:
 *  - lessons: tree of lessons to render
 *  - depth: recursion depth (used for indentation)
 */
interface Props {
    lessons: Lesson[];
    depth?: number;
}

export const LessonTree: FC<Props> = ({ lessons, depth = 0 }) => {
    const [currentPath, setCurrentPath] = useState<string>("/");
    const [open, setOpen] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setCurrentPath(window.location.pathname);
    }, []);

    // Auto-expand parents of active path
    useEffect(() => {
        const expanded: Record<string, boolean> = {};
        const walk = (nodes: Lesson[]): boolean => {
            let matchedSubtree = false;
            for (const node of nodes) {
                const key = node.href ?? node.title; // stable-enough key for containers
                const selfMatch = node.href === currentPath;
                const childMatch = node.children ? walk(node.children) : false;
                if (childMatch) {
                    expanded[key] = true; // expand parents of active route
                }
                matchedSubtree = matchedSubtree || selfMatch || childMatch;
            }
            return matchedSubtree;
        };
        walk(lessons);
        setOpen((prev) => ({ ...prev, ...expanded }));
    }, [lessons, currentPath]);

    const toggle = (key: string) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

    // Use a fixed set of Tailwind classes so the compiler can tree-shake correctly.
    const indentPadding = (d: number) => ["pl-0", "pl-4", "pl-8", "pl-12"][Math.min(d, 3)];

    return (
    <nav aria-label="Navegación de lecciones" className="lesson-tree">
            <ul role="tree" className="space-y-1">
                {lessons.map((lesson, index) => {
                    const key = lesson.href ?? `${lesson.title}-${depth}-${index}`;
                    const isActive = lesson.href ? currentPath === lesson.href : false;
                    const hasChildren = !!lesson.children?.length;
                    const isOpen = open[key] ?? true;

                    return (
                        <li
                            key={key}
                            role="treeitem"
                            aria-expanded={hasChildren ? isOpen : undefined}
                            className={clsx(
                                "group",
                                indentPadding(depth),
                                "relative",
                                depth === 0 && index > 0 && "tree-separator",
                            )}
                        >
                            <div className="flex items-center gap-2">
                                {hasChildren
                                    ? (
                                        <button
                                            onClick={() => toggle(key)}
                                            aria-label={isOpen ? "Contraer sección" : "Expandir sección"}
                                            className="flex-none p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary text-base-text hover:text-primary transition"
                                        >
                                            {isOpen
                                                ? <CaretDown size={16} weight="bold" />
                                                : <CaretRight size={16} weight="bold" />}
                                        </button>
                                    )
                                    : (
                                        // placeholder to align titles when no toggle exists
                                        <div className="w-5" aria-hidden="true" />
                                    )}
                                {lesson.href
                                    ? (
                                        <a
                                            href={lesson.href}
                                            aria-current={isActive ? "page" : undefined}
                                            className={clsx(
                                                "flex-1 transition-colors underline underline-offset-2 hover:text-primary",
                                                isActive ? "text-primary font-semibold" : "text-base-text",
                                            )}
                                        >
                                            {lesson.title}
                                        </a>
                                    )
                                    : (
                                        <span className={clsx("flex-1 text-base-text", "font-semibold")}>
                                            {lesson.title}
                                        </span>
                                    )}
                            </div>
                            {hasChildren && isOpen && (
                                <div className="mt-1">
                                    <LessonTree lessons={lesson.children!} depth={depth + 1} />
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};
