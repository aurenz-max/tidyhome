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

// For now, we'll use a single user. Later you can add Firebase Auth
const USER_ID = 'default-user';

// Get user-specific collection path
const getUserTasksCollection = () => collection(db, `users/${USER_ID}/${TASKS_COLLECTION}`);
const getUserSettingsDoc = () => doc(db, `users/${USER_ID}/${SETTINGS_COLLECTION}/preferences`);

// Tasks CRUD operations
export const firestoreService = {
  // Fetch all tasks
  async getTasks(): Promise<Task[]> {
    const tasksCol = getUserTasksCollection();
    const snapshot = await getDocs(tasksCol);
    return snapshot.docs.map(doc => ({ ...doc.data() } as Task));
  },

  // Subscribe to real-time task updates
  subscribeTasks(callback: (tasks: Task[]) => void): () => void {
    const tasksCol = getUserTasksCollection();
    return onSnapshot(tasksCol, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ ...doc.data() } as Task));
      callback(tasks);
    });
  },

  // Add or update a task
  async saveTask(task: Task): Promise<void> {
    const taskDoc = doc(getUserTasksCollection(), task.id);
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
  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const taskDoc = doc(getUserTasksCollection(), taskId);

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
  async deleteTask(taskId: string): Promise<void> {
    const taskDoc = doc(getUserTasksCollection(), taskId);
    await deleteDoc(taskDoc);
  },

  // Bulk save tasks (useful for initial data migration)
  async saveTasks(tasks: Task[]): Promise<void> {
    console.log('💾 Bulk saving', tasks.length, 'tasks to Firestore...');
    const promises = tasks.map(task => this.saveTask(task));
    await Promise.all(promises);
    console.log('✅ All tasks saved successfully');
  },

  // Settings operations
  async getSettings(): Promise<{ houseDescription?: string } | null> {
    const settingsDoc = getUserSettingsDoc();
    const snapshot = await getDoc(settingsDoc);
    return snapshot.exists() ? snapshot.data() : null;
  },

  async saveSettings(settings: { houseDescription?: string }): Promise<void> {
    const settingsDoc = getUserSettingsDoc();
    await setDoc(settingsDoc, settings);
  },

  // Check if user has data (for first-time initialization)
  async hasExistingData(): Promise<boolean> {
    const tasksCol = getUserTasksCollection();
    const snapshot = await getDocs(tasksCol);
    return !snapshot.empty;
  }
};
