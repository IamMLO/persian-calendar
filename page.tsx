"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import TimeGridView from "@/components/TimeGridView";
import MonthView from "@/components/MonthView";
import TaskEditorModal, { EditorInitial } from "@/components/TaskEditorModal";
import ChatPanel from "@/components/ChatPanel";
import { Task } from "@/lib/types";
import {
  addDays,
  addJalaliMonths,
  gregorianToJalali,
  isoDateToDate,
  jalaliToGregorian,
  JALALI_MONTHS,
  toISODate,
  toPersianDigits,
} from "@/lib/jalali";

type SuggestedTask = {
  title: string;
  jalaliYear: number;
  jalaliMonth: number;
  jalaliDay: number;
  hasTime: boolean;
  startMinutes: number | null;
  durationMinutes: number;
  reminderMinutesBefore: number | null;
};

type ViewMode = "day" | "week" | "month";

function startOfWeekFor(d: Date): Date {
  const idx = (d.getDay() + 1) % 7; // Saturday-first index
  return addDays(d, -idx);
}

const VIEW_LABELS: Record<ViewMode, string> = {
  day: "روز",
  week: "هفته",
  month: "ماه",
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [modalState, setModalState] = useState<EditorInitial | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const remindedRef = useRef<Set<string>>(new Set());

  const weekStart = useMemo(() => startOfWeekFor(anchorDate), [anchorDate]);
  const visibleDays = useMemo(() => {
    if (viewMode === "day") return [anchorDate];
    if (viewMode === "week")
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    return [];
  }, [viewMode, anchorDate, weekStart]);

  const headerLabel = useMemo(() => {
    if (viewMode === "month") {
      const { jy, jm } = gregorianToJalali(anchorDate);
      return `${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
    }
    const rangeDays = viewMode === "day" ? [anchorDate] : visibleDays;
    if (rangeDays.length === 0) return "";
    const first = gregorianToJalali(rangeDays[0]);
    const last = gregorianToJalali(rangeDays[rangeDays.length - 1]);
    if (first.jm === last.jm) {
      return `${JALALI_MONTHS[first.jm - 1]} ${toPersianDigits(first.jy)}`;
    }
    return `${JALALI_MONTHS[first.jm - 1]} - ${JALALI_MONTHS[last.jm - 1]} ${toPersianDigits(
      last.jy
    )}`;
  }, [viewMode, anchorDate, visibleDays]);

  function goToToday() {
    setAnchorDate(new Date());
  }

  function goPrev() {
    if (viewMode === "day") setAnchorDate((d) => addDays(d, -1));
    else if (viewMode === "week") setAnchorDate((d) => addDays(d, -7));
    else setAnchorDate((d) => addJalaliMonths(d, -1));
  }

  function goNext() {
    if (viewMode === "day") setAnchorDate((d) => addDays(d, 1));
    else if (viewMode === "week") setAnchorDate((d) => addDays(d, 7));
    else setAnchorDate((d) => addJalaliMonths(d, 1));
  }

  const refreshTasks = useCallback(async () => {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data.tasks ?? []);
  }, []);

  useEffect(() => {
    refreshTasks();
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [refreshTasks]);

  // Reminder polling
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      for (const t of tasks) {
        if (
          !t.scheduled ||
          !t.date ||
          t.startMinutes === null ||
          !t.reminderMinutesBefore ||
          t.reminderFired ||
          remindedRef.current.has(t.id)
        )
          continue;

        const eventDate = isoDateToDate(t.date);
        eventDate.setMinutes(eventDate.getMinutes() + t.startMinutes);
        const triggerAt = new Date(
          eventDate.getTime() - t.reminderMinutesBefore * 60000
        );

        if (now >= triggerAt && now <= eventDate) {
          remindedRef.current.add(t.id);
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("یادآوری", { body: t.title });
          }
          fetch(`/api/tasks/${t.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reminderFired: true }),
          }).then(() => refreshTasks());
        }
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [tasks, refreshTasks]);

  async function handleDropTask(
    taskId: string,
    dateISO: string,
    startMinutes: number
  ) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduled: true,
        date: dateISO,
        startMinutes,
        reminderFired: false,
      }),
    });
    refreshTasks();
  }

  function handleSlotClick(dateISO: string, startMinutes: number) {
    setModalState({
      scheduled: true,
      date: dateISO,
      startMinutes,
      durationMinutes: 60,
      color: "violet",
    });
  }

  function handleEventClick(task: Task) {
    setModalState({
      id: task.id,
      title: task.title,
      note: task.note ?? "",
      scheduled: Boolean(task.scheduled),
      date: task.date,
      startMinutes: task.startMinutes,
      durationMinutes: task.durationMinutes,
      reminderMinutesBefore: task.reminderMinutesBefore,
      color: task.color,
    });
  }

  function handleAddClick() {
    setModalState({ scheduled: false, durationMinutes: 60, color: "violet" });
  }

  async function handleSave(data: Required<Omit<EditorInitial, "id">> & { id?: string }) {
    if (data.id) {
      await fetch(`/api/tasks/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, reminderFired: false }),
      });
    } else {
      await fetch(`/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setModalState(null);
    refreshTasks();
  }

  async function handleDelete() {
    if (!modalState?.id) return;
    await fetch(`/api/tasks/${modalState.id}`, { method: "DELETE" });
    setModalState(null);
    refreshTasks();
  }

  async function handleAcceptSuggestion(s: SuggestedTask) {
    const dateISO = toISODate(
      jalaliToGregorian(s.jalaliYear, s.jalaliMonth, s.jalaliDay)
    );
    await fetch(`/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: s.title,
        scheduled: s.hasTime,
        date: dateISO,
        startMinutes: s.hasTime ? s.startMinutes : null,
        durationMinutes: s.durationMinutes || 60,
        reminderMinutesBefore: s.reminderMinutesBefore,
        color: "blue",
      }),
    });
    refreshTasks();
  }

  return (
    <div className="flex flex-1 min-h-0 h-screen">
      <Sidebar
        tasks={tasks}
        onAddClick={handleAddClick}
        onTaskClick={handleEventClick}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--panel)]">
          <span className="font-bold text-sm">تقویم شمسی</span>
          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:brightness-110 text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
            دستیار چت
          </button>
        </div>
        <div className="tile-divider" />

        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              aria-label="قبلی"
              className="w-8 h-8 rounded-lg border border-[var(--border)] hover:bg-white/5 flex items-center justify-center"
            >
              ›
            </button>
            <button
              onClick={goNext}
              aria-label="بعدی"
              className="w-8 h-8 rounded-lg border border-[var(--border)] hover:bg-white/5 flex items-center justify-center"
            >
              ‹
            </button>
            <button
              onClick={goToToday}
              className="px-3 h-8 rounded-lg border border-[var(--border)] hover:bg-white/5 text-sm"
            >
              امروز
            </button>
          </div>

          <h1 className="font-semibold text-sm">{headerLabel}</h1>

          <div className="flex items-center rounded-lg border border-[var(--border)] overflow-hidden">
            {(["day", "week", "month"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 h-8 text-sm transition ${
                  viewMode === mode
                    ? "bg-[var(--accent)] text-white"
                    : "hover:bg-white/5 text-[var(--text-dim)]"
                }`}
              >
                {VIEW_LABELS[mode]}
              </button>
            ))}
          </div>
        </div>

        {viewMode === "month" ? (
          <MonthView
            anchorDate={anchorDate}
            tasks={tasks}
            onDayClick={(iso) => {
              setAnchorDate(isoDateToDate(iso));
              setViewMode("day");
            }}
            onEventClick={handleEventClick}
          />
        ) : (
          <TimeGridView
            days={visibleDays}
            tasks={tasks}
            onDropTask={handleDropTask}
            onSlotClick={handleSlotClick}
            onEventClick={handleEventClick}
          />
        )}
      </div>

      {modalState && (
        <TaskEditorModal
          initial={modalState}
          onClose={() => setModalState(null)}
          onSave={handleSave}
          onDelete={modalState.id ? handleDelete : undefined}
        />
      )}

      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        onAcceptSuggestion={handleAcceptSuggestion}
      />
    </div>
  );
}
