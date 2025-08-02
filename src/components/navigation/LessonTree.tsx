import type { FC } from "react";
import { useEffect, useState } from "react";
import type { Lesson } from "~/data/course-structure";
import clsx from "clsx";
import { CaretDown, CaretRight } from "phosphor-react";

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
    const walk = (nodes: Lesson[]) => {
      for (const node of nodes) {
        if (node.children) {
          if (node.children.some((c) => c.href === currentPath)) {
            expanded[node.href] = true;
          }
          walk(node.children);
        }
      }
    };
    walk(lessons);
    setOpen((prev) => ({ ...prev, ...expanded }));
  }, [lessons, currentPath]);

  const toggle = (href: string) =>
    setOpen((prev) => ({ ...prev, [href]: !prev[href] }));

  const indentPadding = (d: number) => {
    // use consistent spacing per depth
    return `pl-${Math.min(d * 4, 12)}`; // cap at pl-12
  };

  return (
    <nav aria-label="Lesson navigation" className="lesson-tree">
      <ul role="tree" className="space-y-1">
        {lessons.map((lesson) => {
          const isActive = currentPath === lesson.href;
          const hasChildren = !!lesson.children?.length;
          const isOpen = open[lesson.href] ?? true;

          return (
            <li
              key={lesson.href}
              role="treeitem"
              aria-expanded={hasChildren ? isOpen : undefined}
              className={clsx("group", indentPadding(depth), "relative")}
            >
              <div className="flex items-center gap-2">
                {hasChildren ? (
                  <button
                    onClick={() => toggle(lesson.href)}
                    aria-label={isOpen ? "Collapse section" : "Expand section"}
                    className="flex-none p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary text-base-text hover:text-primary transition"
                  >
                    {isOpen ? (
                      <CaretDown size={16} weight="bold" />
                    ) : (
                      <CaretRight size={16} weight="bold" />
                    )}
                  </button>
                ) : (
                  // placeholder to align titles when no toggle exists
                  <div className="w-5" aria-hidden="true" />
                )}
                <a
                  href={lesson.href}
                  className={clsx(
                    "flex-1 truncate transition-colors underline underline-offset-2 hover:text-primary",
                    isActive
                      ? "text-primary font-semibold"
                      : "text-base-text"
                  )}
                >
                  {lesson.title}
                </a>
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
