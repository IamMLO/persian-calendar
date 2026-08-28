import * as jalaali from "jalaali-js";

export const WEEKDAY_NAMES = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
];

export const WEEKDAY_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export type JalaliDate = { jy: number; jm: number; jd: number };

// Converts a JS Date (local time, date-only) to an ISO date string 'YYYY-MM-DD'
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isoDateToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function gregorianToJalali(d: Date): JalaliDate {
  const { jy, jm, jd } = jalaali.toJalaali(
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate()
  );
  return { jy, jm, jd };
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
  return new Date(gy, gm - 1, gd);
}

// JS getDay(): 0=Sunday..6=Saturday. Persian week starts Saturday.
// Returns 0 for Saturday ... 6 for Friday.
export function persianWeekdayIndex(d: Date): number {
  const jsDay = d.getDay(); // 0=Sun
  return (jsDay + 1) % 7; // Sat->0, Sun->1, ... Fri->6
}

// Returns the Saturday that starts the week containing d (local dates, time stripped)
export function startOfPersianWeek(d: Date): Date {
  const idx = persianWeekdayIndex(d);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  start.setDate(start.getDate() - idx);
  return start;
}

export function addDays(d: Date, n: number): Date {
  const nd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  nd.setDate(nd.getDate() + n);
  return nd;
}

// Number of days in a given jalali month (handles leap year for month 12)
export function jalaliMonthLength(jy: number, jm: number): number {
  let ny = jy;
  let nm = jm + 1;
  if (nm > 12) {
    nm = 1;
    ny += 1;
  }
  const firstOfNext = jalaliToGregorian(ny, nm, 1);
  const lastOfThis = addDays(firstOfNext, -1);
  return gregorianToJalali(lastOfThis).jd;
}

// Returns the Gregorian date for the 1st day of d's jalali month
export function startOfJalaliMonth(d: Date): Date {
  const { jy, jm } = gregorianToJalali(d);
  return jalaliToGregorian(jy, jm, 1);
}

// Shifts d by `delta` jalali months, clamping the day to the target month's length
export function addJalaliMonths(d: Date, delta: number): Date {
  const { jy, jm, jd } = gregorianToJalali(d);
  let ny = jy;
  let nm = jm + delta;
  while (nm > 12) {
    nm -= 12;
    ny += 1;
  }
  while (nm < 1) {
    nm += 12;
    ny -= 1;
  }
  const len = jalaliMonthLength(ny, nm);
  return jalaliToGregorian(ny, nm, Math.min(jd, len));
}

export function formatJalali(d: Date): string {
  const { jy, jm, jd } = gregorianToJalali(d);
  return `${jd} ${JALALI_MONTHS[jm - 1]} ${jy}`;
}

export function formatJalaliShort(d: Date): string {
  const { jy, jm, jd } = gregorianToJalali(d);
  return `${jd} ${JALALI_MONTHS[jm - 1]}`;
}

const toPersianDigitsMap: Record<string, string> = {
  "0": "۰",
  "1": "۱",
  "2": "۲",
  "3": "۳",
  "4": "۴",
  "5": "۵",
  "6": "۶",
  "7": "۷",
  "8": "۸",
  "9": "۹",
};

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (c) => toPersianDigitsMap[c]);
}

export function minutesToTimeLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${toPersianDigits(String(h).padStart(2, "0"))}:${toPersianDigits(
    String(m).padStart(2, "0")
  )}`;
}

// Resolve a jalali date given by the AI (possibly relative keywords already resolved
// by caller) into an ISO gregorian date string.
export function jalaliPartsToISO(jy: number, jm: number, jd: number): string {
  return toISODate(jalaliToGregorian(jy, jm, jd));
}
