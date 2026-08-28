"use client";

import { useMemo, useRef } from "react";
import { Task } from "@/lib/types";
import {
  gregorianToJalali,
  toISODate,
  toPersianDigits,
  WEEKDAY_NAMES,
} from "@/lib/jalali";
import { DAY_HEIGHT, HOUR_HEIGHT, PX_PER_MINUTE, snapMinutes } from "@/lib/gridConfig";
import EventBlock from "./EventBlock";

type LaidOutTask = { task: Task; columnIndex: number; columnCount: number };

function layoutDayEvents(dayTasks: Task[]): LaidOutTask[] {
  const sorted = [...dayTasks].sort(
    (a, b) => (a.startMinutes ?? 0) - (b.startMinutes ?? 0)
  );

  const result: LaidOutTask[] = [];
  let cluster: Task[] = [];
  let clusterEnd = -1;

  function flushCluster() {
    if (cluster.length === 0) return;
    const columns: number[] = []; // end minute of last task in each column
    const assigned: { task: Task; columnIndex: number }[] = [];
    for (const t of cluster) {
      const start = t.startMinutes ?? 0;
      let placed = false;
      for (let c = 0; c < columns.length; c++) {
        if (columns[c] <= start) {
          columns[c] = start + t.durationMinutes;
          assigned.push({ task: t, columnIndex: c });
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push(start + t.durationMinutes);
        assigned.push({ task: t, columnIndex: columns.length - 1 });
      }
    }
    const columnCount = columns.length;
    for (const a of assigned) {
      result.push({ task: a.task, columnIndex: a.columnIndex, columnCount });
    }
    cluster = [];
  }

  for (const t of sorted) {
    const start = t.startMinutes ?? 0;
    if (cluster.length === 0 || start < clusterEnd) {
      cluster.push(t);
      clusterEnd = Math.max(clusterEnd, start + t.durationMinutes);
    } else {
      flushCluster();
      cluster.push(t);
      clusterEnd = start + t.durationMinutes;
    }
  }
  flushCluster();

  return result;
}

// Renders a scrollable hour-by-hour grid for the given list of days.
// Pass a single date for a day view, or 7 dates for a week view.
export default function TimeGridView({
  days,
  tasks,
  onDropTask,
  onSlotClick,
  onEventClick,
}: {
  days: Date[];
  tasks: Task[];
  onDropTask: (taskId: string, dateISO: string, startMinutes: number) => void;
  onSlotClick: (dateISO: string, startMinutes: number) => void;
  onEventClick: (task: Task) => void;
}) {
  const todayISO = toISODate(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  function handleDrop(e: React.DragEvent, dayISO: string) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minutes = snapMinutes(offsetY / PX_PER_MINUTE);
    onDropTask(taskId, dayISO, minutes);
  }

  function handleColumnClick(e: React.MouseEvent, dayISO: string) {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minutes = snapMinutes(offsetY / PX_PER_MINUTE);
    onSlotClick(dayISO, minutes);
  }

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      <div className="flex border-b border-[var(--border)] bg-[var(--panel)]">
        <div className="w-14 shrink-0" />
        {days.map((d, i) => {
          const iso = toISODate(d);
          const isToday = iso === todayISO;
          const weekdayIdx = (d.getDay() + 1) % 7; // Saturday-first
          return (
            <div
              key={i}
              className={`flex-1 text-center py-2 border-r border-[var(--border)] last:border-r-0 ${
                isToday ? "bg-[var(--accent)]/10" : ""
              }`}
            >
              <div className="text-xs text-[var(--text-dim)]">
                {WEEKDAY_NAMES[weekdayIdx]}
              </div>
              <div
                className={`text-sm font-semibold mt-0.5 ${
                  isToday
                    ? "inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--accent-2)] text-[#1a1300]"
                    : ""
                }`}
              >
                {toPersianDigits(gregorianToJalali(d).jd)}
              </div>
            </div>
          );
        })}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex" style={{ height: DAY_HEIGHT }}>
          <div className="w-14 shrink-0 relative">
            {hours.map((h) => (
              <div
                key={h}
                style={{ height: HOUR_HEIGHT }}
                className="text-[10px] text-[var(--text-dim)] text-left pl-1 relative -top-1.5"
              >
                {h !== 0 ? toPersianDigits(String(h).padStart(2, "0")) : ""}
              </div>
            ))}
          </div>

          {days.map((d, dayIdx) => {
            const iso = toISODate(d);
            const isToday = iso === todayISO;
            const dayTasks = tasks.filter(
              (t) => t.scheduled && t.date === iso
            );
            const laidOut = layoutDayEvents(dayTasks);

            return (
              <div
                key={dayIdx}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, iso)}
                onClick={(e) => handleColumnClick(e, iso)}
                className={`flex-1 relative border-r border-[var(--border)] last:border-r-0 cursor-pointer ${
                  isToday ? "bg-[var(--accent)]/5" : ""
                }`}
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    style={{ height: HOUR_HEIGHT }}
                    className="border-b border-[var(--border)]/60"
                  />
                ))}

                {laidOut.map(({ task, columnIndex, columnCount }) => (
                  <EventBlock
                    key={task.id}
                    task={task}
                    columnIndex={columnIndex}
                    columnCount={columnCount}
                    onClick={() => onEventClick(task)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
