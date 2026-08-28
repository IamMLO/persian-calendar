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

export const CARD_COLORS = [
  "violet",
  "blue",
  "green",
  "orange",
  "pink",
  "red",
] as const;

export type CardColor = (typeof CARD_COLORS)[number];
