import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Household, HouseholdMember } from '../types';
import { householdService } from '../services/householdService';
import { profileService } from '../services/profileService';
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
  addLocalMember: (displayName: string) => Promise<void>;
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
        console.log('[HouseholdContext] Initializing for user:', user!.uid);
        const profile = await profileService.getProfile(user!.uid);
        console.log('[HouseholdContext] User profile:', profile);
        let householdId = profile?.householdId;

        // Check for pending invite code (from AuthForm)
        const pendingInviteCode = sessionStorage.getItem('pendingInviteCode');
        if (pendingInviteCode && !householdId) {
          try {
            console.log('[HouseholdContext] Processing pending invite code:', pendingInviteCode);
            const inviteHousehold = await householdService.findHouseholdByInviteCode(pendingInviteCode);
            if (inviteHousehold) {
              await householdService.joinHousehold(user!.uid, inviteHousehold.id);
              householdId = inviteHousehold.id;
              console.log('[HouseholdContext] Successfully joined household via invite:', inviteHousehold.name);
            }
          } catch (err) {
            console.error('[HouseholdContext] Failed to process pending invite:', err);
          } finally {
            // Always clear the pending invite code
            sessionStorage.removeItem('pendingInviteCode');
          }
        }

        if (householdId) {
          console.log('[HouseholdContext] User has household, subscribing:', householdId);
          // User already has a household - subscribe to it
          unsubHousehold = householdService.subscribeHousehold(householdId, (h) => {
            console.log('[HouseholdContext] Household updated:', h);
            setHousehold(h);
            setLoading(false);
          });
          unsubMembers = householdService.subscribeMembers(householdId, (members) => {
            console.log('[HouseholdContext] Members updated:', members);
            setMembers(members);
          });
        } else {
          console.log('[HouseholdContext] No household found - showing setup flow');
          // No household - show setup flow
          setHousehold(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('[HouseholdContext] Error initializing household:', err);
        setLoading(false);
      }
    }

    init();

    return () => {
      if (unsubHousehold) unsubHousehold();
      if (unsubMembers) unsubMembers();
    };
  }, [user, refreshTrigger]);

  const createHouseholdAction = useCallback(async (name: string) => {
    if (!user) return;
    await householdService.createHousehold(user.uid, name);
    // Trigger re-initialization to fetch updated profile and set up subscriptions
    setRefreshTrigger(prev => prev + 1);
  }, [user]);

  const joinHouseholdAction = useCallback(async (inviteCode: string) => {
    if (!user) {
      console.error('[HouseholdContext] Cannot join - no user');
      return;
    }
    console.log('[HouseholdContext] Join household action:', { inviteCode, userId: user.uid });
    const found = await householdService.findHouseholdByInviteCode(inviteCode);
    if (!found) {
      console.error('[HouseholdContext] Invalid invite code');
      throw new Error('Invalid invite code');
    }
    console.log('[HouseholdContext] Found household, joining:', found);
    await householdService.joinHousehold(user.uid, found.id);
    console.log('[HouseholdContext] Join complete, triggering refresh');
    // Trigger re-initialization to fetch updated profile and set up subscriptions
    setRefreshTrigger(prev => prev + 1);
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

  const addLocalMemberAction = useCallback(async (displayName: string) => {
    if (!user || !household) return;
    await householdService.addLocalMember(household.id, displayName, user.uid);
  }, [user, household]);

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
      addLocalMember: addLocalMemberAction,
    }}>
      {children}
    </HouseholdContext.Provider>
  );
};
