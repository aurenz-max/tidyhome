import { Task, Frequency } from '../types';

export interface ScheduleAssignment {
  taskId: string;
  scheduledDay: number; // 0-6 day of week
}

/**
 * Assigns scheduledDay for all Weekly and BiWeekly tasks using a greedy
 * bin-packing algorithm that batches tasks by room and balances workload.
 *
 * Algorithm (Longest Processing Time First):
 * 1. Group weekly/bi-weekly tasks by room
 * 2. Sort room groups by total estimated minutes (heaviest first)
 * 3. Assign each room's tasks to the day with the least current load
 *
 * Daily, Monthly, and Quarterly tasks are not affected.
 *
 * @param tasks All tasks
 * @param availableDays Days of week to schedule on (default Mon-Sat: [1,2,3,4,5,6])
 * @returns Array of { taskId, scheduledDay } assignments
 */
export function optimizeWeeklySchedule(
  tasks: Task[],
  availableDays: number[] = [1, 2, 3, 4, 5, 6]
): ScheduleAssignment[] {
  // 1. Filter to weekly/bi-weekly tasks
  const weeklyTasks = tasks.filter(
    t => t.frequency === Frequency.Weekly || t.frequency === Frequency.BiWeekly
  );

  if (weeklyTasks.length === 0) return [];

  // 2. Group by room
  const roomGroups = new Map<string, Task[]>();
  for (const task of weeklyTasks) {
    const room = task.room;
    if (!roomGroups.has(room)) roomGroups.set(room, []);
    roomGroups.get(room)!.push(task);
  }

  // 3. Compute total minutes per room and sort descending (heaviest first)
  const roomEntries = Array.from(roomGroups.entries()).map(([room, tasks]) => ({
    room,
    tasks,
    totalMinutes: tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0),
  }));
  roomEntries.sort((a, b) => b.totalMinutes - a.totalMinutes);

  // 4. Initialize day loads
  const dayLoads = new Map<number, number>();
  for (const day of availableDays) {
    dayLoads.set(day, 0);
  }

  // 5. Greedy assignment: put each room on the lightest day
  const assignments: ScheduleAssignment[] = [];

  for (const { tasks: roomTasks, totalMinutes } of roomEntries) {
    // Find day with minimum load
    let minDay = availableDays[0];
    let minLoad = Infinity;
    for (const [day, load] of dayLoads) {
      if (load < minLoad) {
        minLoad = load;
        minDay = day;
      }
    }

    // Assign all tasks in this room to that day
    for (const task of roomTasks) {
      assignments.push({ taskId: task.id, scheduledDay: minDay });
    }

    // Update day load
    dayLoads.set(minDay, (dayLoads.get(minDay) ?? 0) + totalMinutes);
  }

  return assignments;
}

/**
 * Returns a summary of the schedule: day -> rooms assigned and total minutes.
 * Useful for displaying the optimization result to the user.
 */
export function getScheduleSummary(
  tasks: Task[],
  assignments: ScheduleAssignment[]
): Map<number, { rooms: string[]; totalMinutes: number }> {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const summary = new Map<number, { rooms: Set<string>; totalMinutes: number }>();

  const taskMap = new Map(tasks.map(t => [t.id, t]));

  for (const { taskId, scheduledDay } of assignments) {
    const task = taskMap.get(taskId);
    if (!task) continue;

    if (!summary.has(scheduledDay)) {
      summary.set(scheduledDay, { rooms: new Set(), totalMinutes: 0 });
    }
    const entry = summary.get(scheduledDay)!;
    entry.rooms.add(task.room);
    entry.totalMinutes += task.estimatedMinutes;
  }

  const result = new Map<number, { rooms: string[]; totalMinutes: number }>();
  for (const [day, { rooms, totalMinutes }] of summary) {
    result.set(day, { rooms: Array.from(rooms).sort(), totalMinutes });
  }

  return result;
}
