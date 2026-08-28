"use client";

import { useEffect, useState } from "react";
import { CARD_COLORS, Task } from "@/lib/types";
import {
  formatJalali,
  gregorianToJalali,
  isoDateToDate,
  jalaliToGregorian,
  JALALI_MONTHS,
  toISODate,
} from "@/lib/jalali";

export type EditorInitial = {
  id?: string;
  title?: string;
  note?: string;
  scheduled?: boolean;
  date?: string | null; // ISO
  startMinutes?: number | null;
  durationMinutes?: number;
  reminderMinutesBefore?: number | null;
  color?: string;
};

export default function TaskEditorModal({
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  initial: EditorInitial;
  onClose: () => void;
  onSave: (data: Required<Omit<EditorInitial, "id">> & { id?: string }) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [note, setNote] = useState(initial.note ?? "");
  const [scheduled, setScheduled] = useState(initial.scheduled ?? false);
  const [color, setColor] = useState(initial.color ?? "violet");
  const [durationMinutes, setDurationMinutes] = useState(
    initial.durationMinutes ?? 60
  );
  const [reminder, setReminder] = useState<number | "">(
    initial.reminderMinutesBefore ?? 30
  );
  const [hasReminder, setHasReminder] = useState(
    Boolean(initial.reminderMinutesBefore)
  );

  const initDate = initial.date ? isoDateToDate(initial.date) : new Date();
  const initJalali = gregorianToJalali(initDate);
  const [jy, setJy] = useState(initJalali.jy);
  const [jm, setJm] = useState(initJalali.jm);
  const [jd, setJd] = useState(initJalali.jd);

  const initMinutes = initial.startMinutes ?? 9 * 60;
  const [hour, setHour] = useState(Math.floor(initMinutes / 60));
  const [minute, setMinute] = useState(initMinutes % 60);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSave() {
    if (!title.trim()) return;
    const dateISO = scheduled ? toISODate(jalaliToGregorian(jy, jm, jd)) : null;
    const startMinutes = scheduled ? hour * 60 + minute : null;
    onSave({
      id: initial.id,
      title: title.trim(),
      note: note.trim(),
      scheduled,
      date: dateISO,
      startMinutes,
      durationMinutes,
      reminderMinutesBefore: hasReminder ? Number(reminder) || 30 : null,
      color,
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--panel-2)] border border-[var(--border)] rounded-2xl w-full max-w-md p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold mb-4">
          {initial.id ? "ویرایش کار" : "کار جدید"}
        </h3>

        <div className="flex flex-col gap-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان کار، مثلاً: جلسه با تیم"
            className="bg-[var(--panel)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="یادداشت (اختیاری)"
            rows={2}
            className="bg-[var(--panel)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--accent)] resize-none"
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={scheduled}
              onChange={(e) => setScheduled(e.target.checked)}
            />
            روی تقویم زمان‌بندی شود
          </label>

          {scheduled && (
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 flex gap-2">
                <select
                  value={jd}
                  onChange={(e) => setJd(Number(e.target.value))}
                  className="bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm flex-1"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <select
                  value={jm}
                  onChange={(e) => setJm(Number(e.target.value))}
                  className="bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm flex-[2]"
                >
                  {JALALI_MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={jy}
                  onChange={(e) => setJy(Number(e.target.value))}
                  className="bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm w-20"
                />
              </div>

              <div className="flex items-center gap-1">
                <select
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                  className="bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm flex-1"
                >
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, "0")}
                    </option>
                  ))}
                </select>
                <span className="text-[var(--text-dim)]">:</span>
                <select
                  value={minute}
                  onChange={(e) => setMinute(Number(e.target.value))}
                  className="bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm flex-1"
                >
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm"
              >
                {[15, 30, 45, 60, 90, 120, 180].map((d) => (
                  <option key={d} value={d}>
                    {d} دقیقه
                  </option>
                ))}
              </select>
            </div>
          )}

          {scheduled && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hasReminder}
                  onChange={(e) => setHasReminder(e.target.checked)}
                />
                یادآور
              </label>
              {hasReminder && (
                <select
                  value={reminder}
                  onChange={(e) => setReminder(Number(e.target.value))}
                  className="bg-[var(--panel)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm"
                >
                  {[5, 10, 15, 30, 60, 120].map((m) => (
                    <option key={m} value={m}>
                      {m} دقیقه قبل
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            {CARD_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`card-color-${c} w-6 h-6 rounded-full transition ${
                  color === c ? "ring-2 ring-white ring-offset-2 ring-offset-[var(--panel-2)]" : ""
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-5">
          <div>
            {onDelete && (
              <button
                onClick={onDelete}
                className="text-sm text-red-400 hover:text-red-300 px-3 py-2"
              >
                حذف
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-white/5"
            >
              انصراف
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="text-sm px-4 py-2 rounded-lg bg-[var(--accent)] hover:brightness-110 disabled:opacity-40 text-white"
            >
              ذخیره
            </button>
          </div>
        </div>

        {scheduled && (
          <div className="text-[11px] text-[var(--text-dim)] mt-3">
            پیش‌نمایش تاریخ: {formatJalali(jalaliToGregorian(jy, jm, jd))}
          </div>
        )}
      </div>
    </div>
  );
}
