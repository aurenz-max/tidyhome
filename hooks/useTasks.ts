import { useState, useEffect } from 'react';
import { Task, RoomType, Frequency, RoomTaskTemplate } from '../types';
import { firestoreService } from '../services/firestoreService';
import { FALLBACK_TASKS } from '../constants';
import { migrateTaskToRecurrence, needsMigration } from '../utils/migration';
import { optimizeWeeklySchedule } from '../utils/scheduler';
import { getNextOccurrence, isTaskDueOnDate, getToday } from '../utils/recurrence';

const MIGRATION_KEY = 'tidyhome_schema_v2';

const noop = async () => {};

export function useTasks(userId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setTasks([]);
      setLoading(false);
      setNeedsOnboarding(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    setLoading(true);

    async function initializeTasks() {
      try {
        // Check if user has existing data
        const hasData = await firestoreService.hasExistingData(userId!);

        if (!hasData) {
          // First-time user: show onboarding wizard instead of auto-seeding
          setNeedsOnboarding(true);
          setLoading(false);
          return;
        }

        // Subscribe to real-time updates
        unsubscribe = firestoreService.subscribeTasks(userId!, async (updatedTasks) => {
          // Check if migration is needed (one-time)
          if (!localStorage.getItem(MIGRATION_KEY) && updatedTasks.some(needsMigration)) {
            console.log('Migrating tasks to recurrence model...');
            await runMigration(userId!, updatedTasks);
            localStorage.setItem(MIGRATION_KEY, 'true');
            // The migration writes will trigger another snapshot, so we return early
            return;
          }

          setTasks(updatedTasks);
          setLoading(false);
        });
      } catch (err) {
        console.error('Error initializing tasks:', err);
        setError(err as Error);
        // Fallback to local data if Firestore fails
        setTasks(FALLBACK_TASKS);
        setLoading(false);
      }
    }

    initializeTasks();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId]);

  const completeOnboarding = async (selectedTasks: Task[]) => {
    if (!userId) return;
    try {
      await firestoreService.saveTasks(userId, selectedTasks);
      setNeedsOnboarding(false);
      setLoading(true);
      // Start subscribing now that data exists
      firestoreService.subscribeTasks(userId, async (updatedTasks) => {
        setTasks(updatedTasks);
        setLoading(false);
      });
    } catch (err) {
      console.error('Error completing onboarding:', err);
      throw err;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!userId) return;
    try {
      await firestoreService.updateTask(userId, taskId, updates);
    } catch (err) {
      console.error('Error updating task:', err);
      throw err;
    }
  };

  const saveTask = async (task: Task) => {
    if (!userId) return;
    try {
      await firestoreService.saveTask(userId, task);
    } catch (err) {
      console.error('Error saving task:', err);
      throw err;
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!userId) return;
    try {
      await firestoreService.deleteTask(userId, taskId);
    } catch (err) {
      console.error('Error deleting task:', err);
      throw err;
    }
  };

  const addRoom = async (roomName: string, roomType: RoomType, seedTasks: RoomTaskTemplate[]) => {
    if (!userId) return;
    const today = getToday();

    const newTasks: Task[] = seedTasks.map((tmpl, i) => {
      const id = `${roomType.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${i}`;
      const scheduledDay = (tmpl.frequency === Frequency.Monthly || tmpl.frequency === Frequency.Quarterly)
        ? ((i * 7) % 28) + 1
        : undefined;
      const anchorDate = (tmpl.frequency === Frequency.BiWeekly || tmpl.frequency === Frequency.Quarterly)
        ? today : undefined;

      return {
        id,
        room: roomName,
        roomType,
        description: tmpl.description,
        frequency: tmpl.frequency,
        estimatedMinutes: tmpl.estimatedMinutes,
        priority: tmpl.priority,
        scheduledDay,
        anchorDate,
        completedDates: [],
        nextDueDate: today,
        isDue: false,
        isCompleted: false,
      } as Task;
    });

    // Optimize weekly task scheduling
    const assignments = optimizeWeeklySchedule(newTasks);
    for (const { taskId, scheduledDay } of assignments) {
      const task = newTasks.find(t => t.id === taskId);
      if (task) task.scheduledDay = scheduledDay;
    }
    for (const task of newTasks) {
      task.nextDueDate = getNextOccurrence(task, today);
      task.isDue = isTaskDueOnDate(task, today);
    }

    await firestoreService.saveTasks(userId, newTasks);
  };

  const renameRoom = async (oldName: string, newName: string) => {
    if (!userId) return;
    const roomTasks = tasks.filter(t => t.room === oldName);
    for (const task of roomTasks) {
      await firestoreService.updateTask(userId, task.id, { room: newName });
    }
  };

  const deleteRoom = async (roomName: string) => {
    if (!userId) return;
    const roomTasks = tasks.filter(t => t.room === roomName);
    for (const task of roomTasks) {
      await firestoreService.deleteTask(userId, task.id);
    }
  };

  return {
    tasks,
    loading,
    error,
    needsOnboarding,
    updateTask,
    saveTask,
    deleteTask,
    completeOnboarding,
    addRoom,
    renameRoom,
    deleteRoom,
  };
}

/**
 * One-time migration: add recurrence fields to existing tasks and run optimizer.
 */
async function runMigration(userId: string, tasks: Task[]) {
  // 1. Migrate each task to add scheduledDay, anchorDate, completedDates
  const migratedTasks = tasks.map(task => ({
    ...task,
    ...migrateTaskToRecurrence(task),
  }));

  // 2. Run the optimizer to assign balanced scheduledDay values for weekly tasks
  const assignments = optimizeWeeklySchedule(migratedTasks);
  for (const { taskId, scheduledDay } of assignments) {
    const task = migratedTasks.find(t => t.id === taskId);
    if (task) task.scheduledDay = scheduledDay;
  }

  // 3. Save all migrated tasks back to Firestore
  await firestoreService.saveTasks(userId, migratedTasks);
  console.log('Migration complete. Tasks updated with recurrence fields.');
}
