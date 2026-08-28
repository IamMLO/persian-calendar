"use client";

import { useMemo } from "react";
import { Task } from "@/lib/types";
import {
  addDays,
  gregorianToJalali,
  startOfJalaliMonth,
  toISODate,
  toPersianDigits,
  WEEKDAY_SHORT,
} from "@/lib/jalali";

const MAX_VISIBLE_TASKS = 3;

export default function MonthView({
  anchorDate,
  tasks,
  onDayClick,
  onEventClick,
}: {
  anchorDate: Date;
  tasks: Task[];
  onDayClick: (dateISO: string) => void;
  onEventClick: (task: Task) => void;
}) {
  const todayISO = toISODate(new Date());
  const { jm: currentJm } = gregorianToJalali(anchorDate);

  const weeks = useMemo(() => {
    const monthStart = startOfJalaliMonth(anchorDate);
    const weekdayIdx = (monthStart.getDay() + 1) % 7; // Saturday-first
    const gridStart = addDays(monthStart, -weekdayIdx);

    const allDays = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    const rows: Date[][] = [];
    for (let i = 0; i < 6; i++) {
      rows.push(allDays.slice(i * 7, i * 7 + 7));
    }
    return rows;
  }, [anchorDate]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.scheduled || !t.date) continue;
      const arr = map.get(t.date) ?? [];
      arr.push(t);
      map.set(t.date, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.startMinutes ?? 0) - (b.startMinutes ?? 0));
    }
    return map;
  }, [tasks]);

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--panel)]">
        {WEEKDAY_SHORT.map((w, i) => (
          <div
            key={i}
            className="text-center py-2 text-xs text-[var(--text-dim)] border-r border-[var(--border)] last:border-r-0"
          >
            {w}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-rows-6 overflow-y-auto">
        {weeks.map((week, rowIdx) => (
          <div
            key={rowIdx}
            className="grid grid-cols-7 border-b border-[var(--border)] last:border-b-0"
          >
            {week.map((d, colIdx) => {
              const iso = toISODate(d);
              const isToday = iso === todayISO;
              const { jm, jd } = gregorianToJalali(d);
              const inCurrentMonth = jm === currentJm;
              const dayTasks = tasksByDate.get(iso) ?? [];
              const visible = dayTasks.slice(0, MAX_VISIBLE_TASKS);
              const overflowCount = dayTasks.length - visible.length;

              return (
                <div
                  key={colIdx}
                  onClick={() => onDayClick(iso)}
                  className={`border-r border-[var(--border)] last:border-r-0 p-1.5 flex flex-col gap-1 cursor-pointer hover:bg-white/[0.03] transition min-h-0 ${
                    inCurrentMonth ? "" : "opacity-40"
                  }`}
                >
                  <div
                    className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full shrink-0 ${
                      isToday ? "bg-[var(--accent-2)] text-[#1a1300]" : ""
                    }`}
                  >
                    {toPersianDigits(jd)}
                  </div>
                  <div className="flex flex-col gap-0.5 min-h-0 overflow-hidden">
                    {visible.map((t) => (
                      <div
                        key={t.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(t);
                        }}
                        className={`card-color-${t.color} text-white text-[10px] leading-tight px-1.5 py-0.5 rounded-md truncate hover:brightness-110`}
                        title={t.title}
                      >
                        {t.title}
                      </div>
                    ))}
                    {overflowCount > 0 && (
                      <div className="text-[10px] text-[var(--text-dim)] px-1.5">
                        + {toPersianDigits(overflowCount)} کار دیگر
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
