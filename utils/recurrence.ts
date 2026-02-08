import { Task, Frequency } from '../types';

// --- Date helpers (all operate on YYYY-MM-DD strings) ---

function toDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(dateStr: string, days: number): string {
  const d = toDate(dateStr);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

function dayOfWeek(dateStr: string): number {
  return toDate(dateStr).getDay();
}

function dayOfMonth(dateStr: string): number {
  return toDate(dateStr).getDate();
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function diffDays(a: string, b: string): number {
  const da = toDate(a);
  const db = toDate(b);
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Returns all YYYY-MM-DD date strings where `task` occurs within [startDate, endDate] inclusive.
 */
export function getTaskOccurrences(task: Task, startDate: string, endDate: string): string[] {
  const results: string[] = [];

  switch (task.frequency) {
    case Frequency.Daily: {
      let current = startDate;
      while (current <= endDate) {
        results.push(current);
        current = addDays(current, 1);
      }
      break;
    }

    case Frequency.Weekly: {
      const targetDay = task.scheduledDay ?? dayOfWeek(task.nextDueDate);
      let current = startDate;
      while (current <= endDate) {
        if (dayOfWeek(current) === targetDay) {
          results.push(current);
        }
        current = addDays(current, 1);
      }
      break;
    }

    case Frequency.BiWeekly: {
      const targetDay = task.scheduledDay ?? dayOfWeek(task.nextDueDate);
      const anchor = task.anchorDate ?? task.nextDueDate;
      let current = startDate;
      while (current <= endDate) {
        if (dayOfWeek(current) === targetDay) {
          // Check if this is an "on" week relative to anchor
          const weeksDiff = Math.round(diffDays(anchor, current) / 7);
          // The anchor week is week 0 (on), week 1 is off, week 2 is on, etc.
          // Handle negative weeksDiff correctly with modular arithmetic
          if (((weeksDiff % 2) + 2) % 2 === 0) {
            results.push(current);
          }
        }
        current = addDays(current, 1);
      }
      break;
    }

    case Frequency.Monthly: {
      const targetDom = task.scheduledDay ?? dayOfMonth(task.nextDueDate);
      const start = toDate(startDate);
      const end = toDate(endDate);
      let year = start.getFullYear();
      let month = start.getMonth();
      // Start from the month of startDate
      while (true) {
        const maxDay = daysInMonth(year, month);
        const day = Math.min(targetDom, maxDay);
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (dateStr > endDate) break;
        if (dateStr >= startDate) {
          results.push(dateStr);
        }
        month++;
        if (month > 11) { month = 0; year++; }
        // Safety: don't loop forever
        if (year > end.getFullYear() + 1) break;
      }
      break;
    }

    case Frequency.Quarterly: {
      const targetDom = task.scheduledDay ?? dayOfMonth(task.nextDueDate);
      const anchor = task.anchorDate ?? task.nextDueDate;
      const anchorDate = toDate(anchor);
      const anchorMonth = anchorDate.getMonth();
      const start = toDate(startDate);
      const end = toDate(endDate);
      let year = start.getFullYear();
      let month = start.getMonth();
      while (true) {
        // Check if this month is in the quarterly cycle (every 3 months from anchor month)
        const monthDiff = (month - anchorMonth + 12) % 12;
        if (monthDiff % 3 === 0) {
          const maxDay = daysInMonth(year, month);
          const day = Math.min(targetDom, maxDay);
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          if (dateStr > endDate) break;
          if (dateStr >= startDate) {
            results.push(dateStr);
          }
        }
        month++;
        if (month > 11) { month = 0; year++; }
        if (year > end.getFullYear() + 1) break;
      }
      break;
    }
  }

  return results;
}

/**
 * Returns true if this task is scheduled to occur on `date`.
 */
export function isTaskDueOnDate(task: Task, date: string): boolean {
  return getTaskOccurrences(task, date, date).length > 0;
}

/**
 * Returns the next occurrence date string on or after `onOrAfterDate`.
 * Searches up to 1 year ahead.
 */
export function getNextOccurrence(task: Task, onOrAfterDate: string): string {
  // For daily, it's always the given date
  if (task.frequency === Frequency.Daily) return onOrAfterDate;

  // Search forward up to 366 days
  const endDate = addDays(onOrAfterDate, 366);
  const occurrences = getTaskOccurrences(task, onOrAfterDate, endDate);
  return occurrences.length > 0 ? occurrences[0] : onOrAfterDate;
}

/**
 * Returns true if this task's occurrence on `date` has been completed.
 */
export function isOccurrenceCompleted(task: Task, date: string): boolean {
  return (task.completedDates ?? []).includes(date);
}

/**
 * Returns today's date as YYYY-MM-DD (local timezone).
 */
export function getToday(): string {
  return toDateStr(new Date());
}

export { addDays, toDateStr, toDate, dayOfWeek, dayOfMonth };
