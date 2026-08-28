"use client";

import { Task } from "@/lib/types";
import TaskCard from "./TaskCard";

export default function Sidebar({
  tasks,
  onAddClick,
  onTaskClick,
}: {
  tasks: Task[];
  onAddClick: () => void;
  onTaskClick: (task: Task) => void;
}) {
  const unscheduled = tasks.filter((t) => !t.scheduled);

  return (
    <aside className="w-72 shrink-0 border-l border-[var(--border)] bg-[var(--panel)] flex flex-col h-full">
      <div className="p-4 border-b border-[var(--border)]">
        <h2 className="font-semibold text-sm mb-1">کارهای برنامه‌ریزی‌نشده</h2>
        <p className="text-xs text-[var(--text-dim)]">
          کارت‌ها رو بکش و توی روز و ساعت موردنظر توی تقویم رها کن.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {unscheduled.length === 0 ? (
          <div className="text-xs text-[var(--text-dim)] text-center mt-8 leading-6">
            کاری اینجا نیست.
            <br />
            یه کار جدید اضافه کن یا از چت استفاده کن.
          </div>
        ) : (
          unscheduled.map((t) => (
            <TaskCard key={t.id} task={t} onClick={() => onTaskClick(t)} />
          ))
        )}
      </div>

      <div className="p-3 border-t border-[var(--border)]">
        <button
          onClick={onAddClick}
          className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:brightness-110 text-white text-sm font-medium transition"
        >
          + افزودن کار جدید
        </button>
      </div>
    </aside>
  );
}
