import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { Task } from '../types';

// Collection references
const TASKS_COLLECTION = 'tasks';
const SETTINGS_COLLECTION = 'settings';

// Get user-specific collection path
const getUserTasksCollection = (userId: string) => collection(db, `users/${userId}/${TASKS_COLLECTION}`);
const getUserSettingsDoc = (userId: string) => doc(db, `users/${userId}/${SETTINGS_COLLECTION}/preferences`);

// Tasks CRUD operations
export const firestoreService = {
  // Fetch all tasks
  async getTasks(userId: string): Promise<Task[]> {
    const tasksCol = getUserTasksCollection(userId);
    const snapshot = await getDocs(tasksCol);
    return snapshot.docs.map(doc => ({ ...doc.data() } as Task));
  },

  // Subscribe to real-time task updates
  subscribeTasks(userId: string, callback: (tasks: Task[]) => void): () => void {
    const tasksCol = getUserTasksCollection(userId);
    return onSnapshot(tasksCol, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ ...doc.data() } as Task));
      callback(tasks);
    });
  },

  // Add or update a task
  async saveTask(userId: string, task: Task): Promise<void> {
    const taskDoc = doc(getUserTasksCollection(userId), task.id);
    console.log('💾 Saving task to Firestore:', task.id);

    // Firestore doesn't allow undefined values, so we need to remove them
    const cleanTask: any = {};
    for (const [key, value] of Object.entries(task)) {
      if (value !== undefined) {
        cleanTask[key] = value;
      }
    }

    await setDoc(taskDoc, cleanTask);
    console.log('✅ Task saved successfully:', task.id);
  },

  // Update specific fields of a task
  async updateTask(userId: string, taskId: string, updates: Partial<Task>): Promise<void> {
    const taskDoc = doc(getUserTasksCollection(userId), taskId);

    // Firestore doesn't allow undefined values, so we need to remove them
    // or use deleteField() for fields we want to clear
    const cleanUpdates: any = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    await updateDoc(taskDoc, cleanUpdates);
  },

  // Delete a task
  async deleteTask(userId: string, taskId: string): Promise<void> {
    const taskDoc = doc(getUserTasksCollection(userId), taskId);
    await deleteDoc(taskDoc);
  },

  // Bulk save tasks (useful for initial data migration)
  async saveTasks(userId: string, tasks: Task[]): Promise<void> {
    console.log('💾 Bulk saving', tasks.length, 'tasks to Firestore...');
    const promises = tasks.map(task => this.saveTask(userId, task));
    await Promise.all(promises);
    console.log('✅ All tasks saved successfully');
  },

  // Settings operations
  async getSettings(userId: string): Promise<{ houseDescription?: string } | null> {
    const settingsDoc = getUserSettingsDoc(userId);
    const snapshot = await getDoc(settingsDoc);
    return snapshot.exists() ? snapshot.data() : null;
  },

  async saveSettings(userId: string, settings: { houseDescription?: string }): Promise<void> {
    const settingsDoc = getUserSettingsDoc(userId);
    await setDoc(settingsDoc, settings);
  },

  // Check if user has data (for first-time initialization)
  async hasExistingData(userId: string): Promise<boolean> {
    const tasksCol = getUserTasksCollection(userId);
    const snapshot = await getDocs(tasksCol);
    return !snapshot.empty;
  }
};
