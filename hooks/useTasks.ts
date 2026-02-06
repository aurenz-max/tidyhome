import { useState, useEffect } from 'react';
import { Task } from '../types';
import { firestoreService } from '../services/firestoreService';
import { FALLBACK_TASKS } from '../constants';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function initializeTasks() {
      try {
        // Check if user has existing data
        const hasData = await firestoreService.hasExistingData();

        if (!hasData) {
          // First-time user: seed with fallback tasks
          console.log('No existing data found. Initializing with default tasks...');
          await firestoreService.saveTasks(FALLBACK_TASKS);
        }

        // Subscribe to real-time updates
        unsubscribe = firestoreService.subscribeTasks((updatedTasks) => {
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

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await firestoreService.updateTask(taskId, updates);
    } catch (err) {
      console.error('Error updating task:', err);
      throw err;
    }
  };

  const saveTask = async (task: Task) => {
    try {
      await firestoreService.saveTask(task);
    } catch (err) {
      console.error('Error saving task:', err);
      throw err;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await firestoreService.deleteTask(taskId);
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
