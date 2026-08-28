"use client";

import { Task } from "@/lib/types";

export default function TaskCard({
  task,
  onClick,
}: {
  task: Task;
  onClick: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onClick}
      className={`card-color-${task.color} cursor-grab active:cursor-grabbing rounded-xl p-3 shadow-lg shadow-black/20 text-white select-none hover:brightness-110 transition`}
    >
      <div className="text-sm font-medium leading-snug">{task.title}</div>
      {task.note ? (
        <div className="text-xs text-white/75 mt-1 line-clamp-2">
          {task.note}
        </div>
      ) : null}
      <div className="flex items-center gap-2 mt-2 text-[11px] text-white/70">
        <span>{task.durationMinutes} دقیقه</span>
        {task.reminderMinutesBefore ? (
          <span className="flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-3 h-3"
            >
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
            </svg>
            {task.reminderMinutesBefore} دقیقه قبل
          </span>
        ) : null}
      </div>
    </div>
  );
}
