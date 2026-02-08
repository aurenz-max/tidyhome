import { Task, Frequency } from '../types';
import { toDate } from './recurrence';

/**
 * Migrates a single task from the old model (nextDueDate-only) to the new
 * recurrence model (scheduledDay + anchorDate + completedDates).
 *
 * Returns only the fields that need updating.
 */
export function migrateTaskToRecurrence(task: Task): Partial<Task> {
  const updates: Partial<Task> = {};
  const date = toDate(task.nextDueDate);
  const today = new Date().toISOString().split('T')[0];

  switch (task.frequency) {
    case Frequency.Daily:
      // Daily tasks don't need scheduledDay
      updates.scheduledDay = undefined;
      updates.anchorDate = undefined;
      break;

    case Frequency.Weekly:
      updates.scheduledDay = date.getDay();
      updates.anchorDate = undefined;
      break;

    case Frequency.BiWeekly:
      updates.scheduledDay = date.getDay();
      updates.anchorDate = task.nextDueDate;
      break;

    case Frequency.Monthly:
      updates.scheduledDay = date.getDate();
      updates.anchorDate = undefined;
      break;

    case Frequency.Quarterly:
      updates.scheduledDay = date.getDate();
      updates.anchorDate = task.nextDueDate;
      break;
  }

  // Initialize completedDates from current isCompleted state
  if (task.isCompleted) {
    updates.completedDates = [today];
  } else {
    updates.completedDates = [];
  }

  return updates;
}

/**
 * Checks if a task needs migration (lacks the new recurrence fields).
 */
export function needsMigration(task: Task): boolean {
  // Daily tasks don't need scheduledDay, so check completedDates instead
  return task.completedDates === undefined;
}
