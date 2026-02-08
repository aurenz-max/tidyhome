import { useState, useEffect } from 'react';
import { Task } from '../types';
import { firestoreService } from '../services/firestoreService';
import { FALLBACK_TASKS } from '../constants';
import { migrateTaskToRecurrence, needsMigration } from '../utils/migration';
import { optimizeWeeklySchedule } from '../utils/scheduler';

const MIGRATION_KEY = 'tidyhome_schema_v2';

const noop = async () => {};

export function useTasks(userId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    setLoading(true);

    async function initializeTasks() {
      try {
        // Check if user has existing data
        const hasData = await firestoreService.hasExistingData(userId!);

        if (!hasData) {
          // First-time user: seed with fallback tasks (already have recurrence fields)
          console.log('No existing data found. Initializing with default tasks...');
          await firestoreService.saveTasks(userId!, FALLBACK_TASKS);
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

  return {
    tasks,
    loading,
    error,
    updateTask,
    saveTask,
    deleteTask
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
