"use client";

import { Task } from "@/lib/types";
import { minutesToTimeLabel } from "@/lib/jalali";
import { PX_PER_MINUTE } from "@/lib/gridConfig";

export default function EventBlock({
  task,
  onClick,
  columnCount = 1,
  columnIndex = 0,
}: {
  task: Task;
  onClick: () => void;
  columnCount?: number;
  columnIndex?: number;
}) {
  const top = (task.startMinutes ?? 0) * PX_PER_MINUTE;
  const height = Math.max(task.durationMinutes * PX_PER_MINUTE, 22);
  const widthPct = 100 / columnCount;
  const leftPct = widthPct * columnIndex;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        top,
        height,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
      }}
      className={`card-color-${task.color} absolute rounded-lg px-2 py-1 text-white text-[11px] leading-tight shadow-md shadow-black/30 cursor-grab active:cursor-grabbing overflow-hidden hover:brightness-110 transition z-10`}
      title={task.title}
    >
      <div className="font-medium truncate">{task.title}</div>
      {height > 30 && (
        <div className="text-white/75 truncate">
          {minutesToTimeLabel(task.startMinutes ?? 0)}
        </div>
      )}
    </div>
  );
}
