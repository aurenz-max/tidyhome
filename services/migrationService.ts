import {
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase.config';

/**
 * Migrate all tasks and settings from 'default-user' to a new authenticated user.
 * Returns true if migration occurred, false if no default-user data existed.
 */
export async function migrateDefaultUserTasks(newUserId: string): Promise<boolean> {
  try {
    const defaultTasksCol = collection(db, 'users/default-user/tasks');
    const snapshot = await getDocs(defaultTasksCol);

    if (snapshot.empty) {
      console.log('No default-user tasks to migrate.');
      return false;
    }

    console.log(`Migrating ${snapshot.size} tasks from default-user to ${newUserId}...`);

    // Copy all tasks to new user's collection
    const newTasksCol = collection(db, `users/${newUserId}/tasks`);
    for (const taskDoc of snapshot.docs) {
      await setDoc(doc(newTasksCol, taskDoc.id), taskDoc.data());
    }

    // Copy settings if they exist
    const defaultSettingsDoc = doc(db, 'users/default-user/settings/preferences');
    const settingsSnapshot = await getDoc(defaultSettingsDoc);
    if (settingsSnapshot.exists()) {
      const newSettingsDoc = doc(db, `users/${newUserId}/settings/preferences`);
      await setDoc(newSettingsDoc, settingsSnapshot.data());
    }

    // Delete default-user tasks
    for (const taskDoc of snapshot.docs) {
      await deleteDoc(doc(defaultTasksCol, taskDoc.id));
    }

    // Delete default-user settings
    if (settingsSnapshot.exists()) {
      await deleteDoc(defaultSettingsDoc);
    }

    console.log(`Migration complete. ${snapshot.size} tasks moved to ${newUserId}.`);
    return true;
  } catch (err) {
    console.error('Migration failed:', err);
    return false;
  }
}
