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

// Household-scoped collection paths
const getHouseholdTasksCollection = (householdId: string) => collection(db, `households/${householdId}/${TASKS_COLLECTION}`);
const getHouseholdSettingsDoc = (householdId: string) => doc(db, `households/${householdId}/${SETTINGS_COLLECTION}/preferences`);

// Legacy user-scoped paths (used only during migration)
const getUserTasksCollection = (userId: string) => collection(db, `users/${userId}/${TASKS_COLLECTION}`);
const getUserSettingsDoc = (userId: string) => doc(db, `users/${userId}/${SETTINGS_COLLECTION}/preferences`);

// Tasks CRUD operations (household-scoped)
export const firestoreService = {
  // Fetch all tasks
  async getTasks(householdId: string): Promise<Task[]> {
    const tasksCol = getHouseholdTasksCollection(householdId);
    const snapshot = await getDocs(tasksCol);
    return snapshot.docs.map(doc => ({ ...doc.data() } as Task));
  },

  // Subscribe to real-time task updates
  subscribeTasks(householdId: string, callback: (tasks: Task[]) => void): () => void {
    const tasksCol = getHouseholdTasksCollection(householdId);
    return onSnapshot(tasksCol, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ ...doc.data() } as Task));
      callback(tasks);
    });
  },

  // Add or update a task
  async saveTask(householdId: string, task: Task): Promise<void> {
    const taskDoc = doc(getHouseholdTasksCollection(householdId), task.id);

    // Firestore doesn't allow undefined values, so we need to remove them
    const cleanTask: any = {};
    for (const [key, value] of Object.entries(task)) {
      if (value !== undefined) {
        cleanTask[key] = value;
      }
    }

    await setDoc(taskDoc, cleanTask);
  },

  // Update specific fields of a task
  async updateTask(householdId: string, taskId: string, updates: Partial<Task>): Promise<void> {
    const taskDoc = doc(getHouseholdTasksCollection(householdId), taskId);

    // Firestore doesn't allow undefined values
    const cleanUpdates: any = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    await updateDoc(taskDoc, cleanUpdates);
  },

  // Delete a task
  async deleteTask(householdId: string, taskId: string): Promise<void> {
    const taskDoc = doc(getHouseholdTasksCollection(householdId), taskId);
    await deleteDoc(taskDoc);
  },

  // Bulk save tasks (useful for initial data migration)
  async saveTasks(householdId: string, tasks: Task[]): Promise<void> {
    const promises = tasks.map(task => this.saveTask(householdId, task));
    await Promise.all(promises);
  },

  // Settings operations
  async getSettings(householdId: string): Promise<{ houseDescription?: string } | null> {
    const settingsDoc = getHouseholdSettingsDoc(householdId);
    const snapshot = await getDoc(settingsDoc);
    return snapshot.exists() ? snapshot.data() : null;
  },

  async saveSettings(householdId: string, settings: { houseDescription?: string }): Promise<void> {
    const settingsDoc = getHouseholdSettingsDoc(householdId);
    await setDoc(settingsDoc, settings);
  },

  // Check if household has task data
  async hasExistingData(householdId: string): Promise<boolean> {
    const tasksCol = getHouseholdTasksCollection(householdId);
    const snapshot = await getDocs(tasksCol);
    return !snapshot.empty;
  },

  // Legacy: check if user has tasks at old path (for migration detection)
  async hasLegacyUserData(userId: string): Promise<boolean> {
    const tasksCol = getUserTasksCollection(userId);
    const snapshot = await getDocs(tasksCol);
    return !snapshot.empty;
  },

  // Legacy: get tasks from old user-scoped path (for migration)
  async getLegacyUserTasks(userId: string): Promise<Task[]> {
    const tasksCol = getUserTasksCollection(userId);
    const snapshot = await getDocs(tasksCol);
    return snapshot.docs.map(doc => ({ ...doc.data() } as Task));
  },

  // Legacy: get settings from old user-scoped path (for migration)
  async getLegacyUserSettings(userId: string): Promise<{ houseDescription?: string } | null> {
    const settingsDoc = getUserSettingsDoc(userId);
    const snapshot = await getDoc(settingsDoc);
    return snapshot.exists() ? snapshot.data() : null;
  },

  // Legacy: delete old user-scoped tasks (after migration)
  async deleteLegacyUserData(userId: string): Promise<void> {
    const tasksCol = getUserTasksCollection(userId);
    const snapshot = await getDocs(tasksCol);
    for (const taskDoc of snapshot.docs) {
      await deleteDoc(taskDoc.ref);
    }
    // Also try to delete settings
    try {
      await deleteDoc(getUserSettingsDoc(userId));
    } catch (e) {
      // Settings may not exist, that's fine
    }
  },
};
