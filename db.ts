import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";

// DB_PATH can be overridden with an absolute path (e.g. a mounted volume on
// Railway/Fly/Docker) so the location doesn't depend on Next.js' internal
// working directory (the standalone server chdirs to its own folder).
const DB_PATH = process.env.DB_PATH
  ? process.env.DB_PATH
  : path.join(process.cwd(), "data", "app.db");

const DATA_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
console.log("[db] using database file:", DB_PATH);

// Reuse a single connection across hot-reloads / requests in dev.
const globalForDb = globalThis as unknown as { __db?: DatabaseSync };

export const db = globalForDb.__db ?? new DatabaseSync(DB_PATH);
if (!globalForDb.__db) globalForDb.__db = db;

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    note TEXT,
    scheduled INTEGER NOT NULL DEFAULT 0,
    date TEXT,
    startMinutes INTEGER,
    durationMinutes INTEGER NOT NULL DEFAULT 60,
    reminderMinutesBefore INTEGER,
    reminderFired INTEGER NOT NULL DEFAULT 0,
    color TEXT NOT NULL DEFAULT 'violet',
    createdAt TEXT NOT NULL
  );
`);

export type Task = {
  id: string;
  title: string;
  note: string | null;
  scheduled: number; // 0/1
  date: string | null; // ISO yyyy-mm-dd (gregorian)
  startMinutes: number | null;
  durationMinutes: number;
  reminderMinutesBefore: number | null;
  reminderFired: number;
  color: string;
  createdAt: string;
};

export function listTasks(): Task[] {
  return db.prepare(`SELECT * FROM tasks ORDER BY createdAt ASC`).all() as unknown as Task[];
}

export function createTask(input: {
  title: string;
  note?: string | null;
  scheduled?: boolean;
  date?: string | null;
  startMinutes?: number | null;
  durationMinutes?: number;
  reminderMinutesBefore?: number | null;
  color?: string;
}): Task {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO tasks (id, title, note, scheduled, date, startMinutes, durationMinutes, reminderMinutesBefore, reminderFired, color, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
  ).run(
    id,
    input.title,
    input.note ?? null,
    input.scheduled ? 1 : 0,
    input.date ?? null,
    input.startMinutes ?? null,
    input.durationMinutes ?? 60,
    input.reminderMinutesBefore ?? null,
    input.color ?? "violet",
    createdAt
  );
  return db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id) as unknown as Task;
}

export function updateTask(
  id: string,
  patch: Partial<{
    title: string;
    note: string | null;
    scheduled: boolean;
    date: string | null;
    startMinutes: number | null;
    durationMinutes: number;
    reminderMinutesBefore: number | null;
    reminderFired: boolean;
    color: string;
  }>
): Task | null {
  const existing = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id) as
    | Task
    | undefined;
  if (!existing) return null;

  const next = {
    title: patch.title ?? existing.title,
    note: patch.note !== undefined ? patch.note : existing.note,
    scheduled:
      patch.scheduled !== undefined ? (patch.scheduled ? 1 : 0) : existing.scheduled,
    date: patch.date !== undefined ? patch.date : existing.date,
    startMinutes:
      patch.startMinutes !== undefined ? patch.startMinutes : existing.startMinutes,
    durationMinutes: patch.durationMinutes ?? existing.durationMinutes,
    reminderMinutesBefore:
      patch.reminderMinutesBefore !== undefined
        ? patch.reminderMinutesBefore
        : existing.reminderMinutesBefore,
    reminderFired:
      patch.reminderFired !== undefined ? (patch.reminderFired ? 1 : 0) : existing.reminderFired,
    color: patch.color ?? existing.color,
  };

  db.prepare(
    `UPDATE tasks SET title=?, note=?, scheduled=?, date=?, startMinutes=?, durationMinutes=?, reminderMinutesBefore=?, reminderFired=?, color=? WHERE id=?`
  ).run(
    next.title,
    next.note,
    next.scheduled,
    next.date,
    next.startMinutes,
    next.durationMinutes,
    next.reminderMinutesBefore,
    next.reminderFired,
    next.color,
    id
  );

  return db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id) as unknown as Task;
}

export function deleteTask(id: string): boolean {
  const res = db.prepare(`DELETE FROM tasks WHERE id = ?`).run(id);
  return res.changes > 0;
}
