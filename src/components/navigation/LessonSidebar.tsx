import clsx from "clsx";
import type { FC } from "react";
import type { Lesson } from "../../data/course-structure";
import { LessonTree } from "./LessonTree";

interface Props {
    lessons: Lesson[];
}

export const LessonSidebar: FC<Props> = ({ lessons }) => {
    return (
        <div className="relative flex-shrink-0">
            <div
                data-testid="lesson-sidebar-panel"
                className={clsx(
                    "w-72 min-w-72",
                    "px-3 py-4",
                    "bg-base-background/98",
                    "backdrop-blur-md",
                    "border-r border-base-border/50",
                    "shadow-sm",
                    "overflow-y-auto overflow-x-hidden",
                    "shrink-0 h-full",
                )}
            >
                <div className="overflow-y-auto h-full">
                    <LessonTree lessons={lessons} persistKey="lesson-tree" />
                </div>
            </div>
        </div>
    );
};

export default LessonSidebar;
