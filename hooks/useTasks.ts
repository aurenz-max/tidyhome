import { useState, useEffect } from 'react';
import { Task, RoomType, Frequency, RoomTaskTemplate } from '../types';
import { firestoreService } from '../services/firestoreService';
import { roomService } from '../services/roomService';
import { FALLBACK_TASKS } from '../constants';
import { migrateTaskToRecurrence, needsMigration } from '../utils/migration';
import { optimizeWeeklySchedule } from '../utils/scheduler';
import { getNextOccurrence, isTaskDueOnDate, getToday } from '../utils/recurrence';

const MIGRATION_KEY = 'tidyhome_schema_v2';

const noop = async () => {};

// Helper function to get default icon for room type
function getDefaultIconForRoomType(roomType: RoomType): string {
  const iconMap: Record<RoomType, string> = {
    [RoomType.Kitchen]: 'ChefHat',
    [RoomType.DiningRoom]: 'Utensils',
    [RoomType.LivingRoom]: 'Sofa',
    [RoomType.Office]: 'Laptop',
    [RoomType.Entryway]: 'DoorOpen',
    [RoomType.Bathroom]: 'Bath',
    [RoomType.Bedroom]: 'BedDouble',
    [RoomType.Hallway]: 'ArrowRight',
    [RoomType.Basement]: 'ArrowDown',
    [RoomType.LaundryRoom]: 'WashingMachine',
    [RoomType.General]: 'Home',
  };
  return iconMap[roomType] || 'Home';
}

export function useTasks(householdId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!householdId) {
      setTasks([]);
      setLoading(false);
      setNeedsOnboarding(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    setLoading(true);

    async function initializeTasks() {
      try {
        // Check if household has existing data
        const hasData = await firestoreService.hasExistingData(householdId!);

        if (!hasData) {
          // First-time household: show onboarding wizard
          setNeedsOnboarding(true);
          setLoading(false);
          return;
        }

        // Subscribe to real-time updates
        unsubscribe = firestoreService.subscribeTasks(householdId!, async (updatedTasks) => {
          // Check if migration is needed (one-time)
          if (!localStorage.getItem(MIGRATION_KEY) && updatedTasks.some(needsMigration)) {
            console.log('Migrating tasks to recurrence model...');
            await runMigration(householdId!, updatedTasks);
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
  }, [householdId]);

  const completeOnboarding = async (selectedTasks: Task[]) => {
    if (!householdId) return;
    try {
      await firestoreService.saveTasks(householdId, selectedTasks);
      setNeedsOnboarding(false);
      setLoading(true);
      // Start subscribing now that data exists
      firestoreService.subscribeTasks(householdId, async (updatedTasks) => {
        setTasks(updatedTasks);
        setLoading(false);
      });
    } catch (err) {
      console.error('Error completing onboarding:', err);
      throw err;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!householdId) return;
    try {
      await firestoreService.updateTask(householdId, taskId, updates);
    } catch (err) {
      console.error('Error updating task:', err);
      throw err;
    }
  };

  const saveTask = async (task: Task) => {
    if (!householdId) return;
    try {
      await firestoreService.saveTask(householdId, task);
    } catch (err) {
      console.error('Error saving task:', err);
      throw err;
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!householdId) return;
    try {
      await firestoreService.deleteTask(householdId, taskId);
    } catch (err) {
      console.error('Error deleting task:', err);
      throw err;
    }
  };

  const addRoom = async (roomName: string, roomType: RoomType, seedTasks: RoomTaskTemplate[], icon?: string) => {
    if (!householdId) return;
    const today = getToday();

    // Create the Room document first
    const roomIcon = icon || getDefaultIconForRoomType(roomType);
    const room = await roomService.createRoom(householdId, roomName, roomType, roomIcon);

    const newTasks: Task[] = seedTasks.map((tmpl, i) => {
      const id = `${roomType.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${i}`;
      const scheduledDay = (tmpl.frequency === Frequency.Monthly || tmpl.frequency === Frequency.Quarterly)
        ? ((i * 7) % 28) + 1
        : undefined;
      const anchorDate = (tmpl.frequency === Frequency.BiWeekly || tmpl.frequency === Frequency.Quarterly)
        ? today : undefined;

      return {
        id,
        roomId: room.id,
        room: roomName, // Keep for backward compatibility during transition
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

    await firestoreService.saveTasks(householdId, newTasks);
  };

  const renameRoom = async (roomId: string, newName: string) => {
    if (!householdId) return;

    // Update the Room document
    await roomService.updateRoom(householdId, roomId, { name: newName });

    // Update all tasks that reference this room (for backward compatibility)
    const roomTasks = tasks.filter(t => t.roomId === roomId);
    for (const task of roomTasks) {
      await firestoreService.updateTask(householdId, task.id, { room: newName });
    }
  };

  const deleteRoom = async (roomId: string) => {
    if (!householdId) return;

    // Delete all tasks in this room
    const roomTasks = tasks.filter(t => t.roomId === roomId);
    for (const task of roomTasks) {
      await firestoreService.deleteTask(householdId, task.id);
    }

    // Delete the Room document
    await roomService.deleteRoom(householdId, roomId);
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
async function runMigration(householdId: string, tasks: Task[]) {
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
  await firestoreService.saveTasks(householdId, migratedTasks);
  console.log('Migration complete. Tasks updated with recurrence fields.');
}
