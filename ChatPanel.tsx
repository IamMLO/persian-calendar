"use client";

import { useState } from "react";
import { formatJalali, jalaliToGregorian, minutesToTimeLabel, toISODate } from "@/lib/jalali";

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

type ChatMessage =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string }
  | { role: "suggestions"; items: SuggestedTask[] }
  | { role: "error"; text: string };

export default function ChatPanel({
  open,
  onClose,
  onAcceptSuggestion,
}: {
  open: boolean;
  onClose: () => void;
  onAcceptSuggestion: (s: SuggestedTask) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "سلام! کارهاتو به فارسی بنویس، مثلاً «ساعت ۵ میرم گل‌فروشی» یا «فردا ساعت ۹ جلسه و ساعت ۲ دندون‌پزشکی». من کارت‌های پیشنهادی می‌سازم.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "error", text: data.error ?? "خطایی رخ داد" },
        ]);
      } else {
        setMessages((m) => [...m, { role: "suggestions", items: data.tasks }]);
      }
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "error", text: `خطا در اتصال: ${String(e)}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 left-0 w-full sm:w-96 bg-[var(--panel)] border-l border-[var(--border)] z-40 flex flex-col shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <h2 className="font-semibold text-sm">دستیار چت</h2>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-[var(--text-dim)]"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((m, i) => {
          if (m.role === "user") {
            return (
              <div key={i} className="self-end max-w-[85%] bg-[var(--accent)] text-white text-sm px-3 py-2 rounded-2xl rounded-bl-sm">
                {m.text}
              </div>
            );
          }
          if (m.role === "assistant") {
            return (
              <div key={i} className="self-start max-w-[85%] bg-[var(--panel-2)] text-sm px-3 py-2 rounded-2xl rounded-br-sm">
                {m.text}
              </div>
            );
          }
          if (m.role === "error") {
            return (
              <div key={i} className="self-start max-w-[85%] bg-red-500/15 text-red-300 text-xs px-3 py-2 rounded-xl">
                {m.text}
              </div>
            );
          }
          return (
            <div key={i} className="flex flex-col gap-2">
              {m.items.length === 0 && (
                <div className="text-xs text-[var(--text-dim)]">
                  کاری تشخیص داده نشد.
                </div>
              )}
              {m.items.map((s, idx) => {
                const key = `${i}-${idx}`;
                const added = addedKeys.has(key);
                const dateObj = jalaliToGregorian(
                  s.jalaliYear,
                  s.jalaliMonth,
                  s.jalaliDay
                );
                return (
                  <div
                    key={key}
                    className="bg-[var(--panel-2)] border border-[var(--border)] rounded-xl p-3"
                  >
                    <div className="text-sm font-medium">{s.title}</div>
                    <div className="text-xs text-[var(--text-dim)] mt-1">
                      {formatJalali(dateObj)}
                      {s.hasTime && s.startMinutes !== null
                        ? ` — ساعت ${minutesToTimeLabel(s.startMinutes)}`
                        : " — بدون ساعت مشخص"}
                    </div>
                    <button
                      disabled={added}
                      onClick={() => {
                        onAcceptSuggestion(s);
                        setAddedKeys((prev) => new Set(prev).add(key));
                      }}
                      className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-[var(--accent)] disabled:opacity-40 text-white"
                    >
                      {added ? "اضافه شد ✓" : "افزودن به تقویم"}
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
        {loading && (
          <div className="self-start text-xs text-[var(--text-dim)]">
            در حال فکر کردن…
          </div>
        )}
      </div>

      <div className="p-3 border-t border-[var(--border)] flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="مثلاً: فردا ساعت ۱۰ آرایشگاه"
          className="flex-1 bg-[var(--panel-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-4 rounded-xl bg-[var(--accent)] disabled:opacity-40 text-white text-sm"
        >
          ارسال
        </button>
      </div>
    </div>
  );
}
