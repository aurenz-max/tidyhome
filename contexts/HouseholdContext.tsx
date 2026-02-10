import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Household, HouseholdMember } from '../types';
import { householdService } from '../services/householdService';
import { profileService } from '../services/profileService';
import { firestoreService } from '../services/firestoreService';
import { migrateUserTasksToHousehold } from '../services/householdMigrationService';
import { useAuth } from './AuthContext';

interface HouseholdContextType {
  household: Household | null;
  members: HouseholdMember[];
  loading: boolean;
  isAdmin: boolean;
  getMemberByUid: (uid: string) => HouseholdMember | undefined;
  createHousehold: (name: string) => Promise<void>;
  joinHousehold: (inviteCode: string) => Promise<void>;
  leaveHousehold: () => Promise<void>;
  removeMember: (uid: string) => Promise<void>;
  regenerateInviteCode: () => Promise<string>;
}

const HouseholdContext = createContext<HouseholdContextType | null>(null);

export function useHousehold(): HouseholdContextType {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
}

export const HouseholdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHousehold(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    let unsubHousehold: (() => void) | undefined;
    let unsubMembers: (() => void) | undefined;

    async function init() {
      try {
        const profile = await profileService.getProfile(user!.uid);
        const householdId = profile?.householdId;

        if (householdId) {
          // User already has a household - subscribe to it
          unsubHousehold = householdService.subscribeHousehold(householdId, (h) => {
            setHousehold(h);
            setLoading(false);
          });
          unsubMembers = householdService.subscribeMembers(householdId, setMembers);
        } else {
          // Check if user has legacy data that needs migration
          const hasLegacy = await firestoreService.hasLegacyUserData(user!.uid);
          if (hasLegacy) {
            // Auto-create household and migrate
            const displayName = user!.displayName || user!.email || 'My';
            const name = `${displayName.split(' ')[0]}'s Home`;
            const newHousehold = await householdService.createHousehold(user!.uid, name);

            await migrateUserTasksToHousehold(user!.uid, newHousehold.id);

            unsubHousehold = householdService.subscribeHousehold(newHousehold.id, (h) => {
              setHousehold(h);
              setLoading(false);
            });
            unsubMembers = householdService.subscribeMembers(newHousehold.id, setMembers);
          } else {
            // No household, no legacy data - show setup flow
            setHousehold(null);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Error initializing household:', err);
        setLoading(false);
      }
    }

    init();

    return () => {
      if (unsubHousehold) unsubHousehold();
      if (unsubMembers) unsubMembers();
    };
  }, [user]);

  const createHouseholdAction = useCallback(async (name: string) => {
    if (!user) return;
    const newHousehold = await householdService.createHousehold(user.uid, name);
    // Subscriptions will be set up on the next effect cycle since profile.householdId changed
    // But we can set state immediately for responsiveness
    setHousehold(newHousehold);
  }, [user]);

  const joinHouseholdAction = useCallback(async (inviteCode: string) => {
    if (!user) return;
    const found = await householdService.findHouseholdByInviteCode(inviteCode);
    if (!found) throw new Error('Invalid invite code');
    await householdService.joinHousehold(user.uid, found.id);
    setHousehold(found);
  }, [user]);

  const leaveHouseholdAction = useCallback(async () => {
    if (!user || !household) return;
    await householdService.leaveHousehold(user.uid, household.id);
    setHousehold(null);
    setMembers([]);
  }, [user, household]);

  const removeMemberAction = useCallback(async (targetUid: string) => {
    if (!user || !household) return;
    await householdService.removeMember(user.uid, targetUid, household.id);
  }, [user, household]);

  const regenerateInviteCodeAction = useCallback(async (): Promise<string> => {
    if (!household) throw new Error('No household');
    return householdService.regenerateInviteCode(household.id);
  }, [household]);

  const getMemberByUid = useCallback((uid: string) => {
    return members.find(m => m.uid === uid);
  }, [members]);

  const isAdmin = !!(user && household && household.adminUid === user.uid);

  return (
    <HouseholdContext.Provider value={{
      household,
      members,
      loading,
      isAdmin,
      getMemberByUid,
      createHousehold: createHouseholdAction,
      joinHousehold: joinHouseholdAction,
      leaveHousehold: leaveHouseholdAction,
      removeMember: removeMemberAction,
      regenerateInviteCode: regenerateInviteCodeAction,
    }}>
      {children}
    </HouseholdContext.Provider>
  );
};
