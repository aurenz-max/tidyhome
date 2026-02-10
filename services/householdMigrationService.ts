import { firestoreService } from './firestoreService';

const MIGRATION_KEY = 'tidyhome_household_migrated';

/**
 * Migrates a user's tasks from the legacy `users/{userId}/tasks` path
 * to the new `households/{householdId}/tasks` path.
 * Runs once, guarded by a localStorage flag.
 */
export async function migrateUserTasksToHousehold(
  userId: string,
  householdId: string
): Promise<boolean> {
  if (localStorage.getItem(MIGRATION_KEY)) return false;

  const hasLegacy = await firestoreService.hasLegacyUserData(userId);
  if (!hasLegacy) {
    localStorage.setItem(MIGRATION_KEY, 'true');
    return false;
  }

  console.log('Migrating user tasks to household...');

  // Copy tasks
  const tasks = await firestoreService.getLegacyUserTasks(userId);
  if (tasks.length > 0) {
    await firestoreService.saveTasks(householdId, tasks);
  }

  // Copy settings
  const settings = await firestoreService.getLegacyUserSettings(userId);
  if (settings) {
    await firestoreService.saveSettings(householdId, settings);
  }

  // Delete legacy data
  await firestoreService.deleteLegacyUserData(userId);

  localStorage.setItem(MIGRATION_KEY, 'true');
  console.log('Migration complete:', tasks.length, 'tasks moved to household', householdId);
  return true;
}
