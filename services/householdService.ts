import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { Household, HouseholdMember } from '../types';
import { profileService } from './profileService';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const householdService = {
  async createHousehold(userId: string, name: string): Promise<Household> {
    const profile = await profileService.getProfile(userId);
    const householdId = `household-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const inviteCode = generateInviteCode();

    const household: Household = {
      id: householdId,
      name,
      memberUids: [userId],
      adminUid: userId,
      inviteCode,
      createdAt: new Date().toISOString(),
    };

    // Create household document
    await setDoc(doc(db, 'households', householdId), household);

    // Create member subdocument
    const member: HouseholdMember = {
      uid: userId,
      displayName: profile?.displayName || profile?.email || 'User',
      email: profile?.email || '',
      photoURL: profile?.photoURL,
      role: 'admin',
      joinedAt: new Date().toISOString(),
    };
    const cleanMember: any = {};
    for (const [key, value] of Object.entries(member)) {
      if (value !== undefined) cleanMember[key] = value;
    }
    await setDoc(doc(db, `households/${householdId}/members`, userId), cleanMember);

    // Update user profile with householdId
    await profileService.updateProfile(userId, { householdId });

    return household;
  },

  async findHouseholdByInviteCode(code: string): Promise<Household | null> {
    const q = query(
      collection(db, 'households'),
      where('inviteCode', '==', code.toUpperCase())
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as Household;
  },

  async joinHousehold(userId: string, householdId: string): Promise<void> {
    const profile = await profileService.getProfile(userId);

    // Add user to household memberUids
    const householdRef = doc(db, 'households', householdId);
    await updateDoc(householdRef, {
      memberUids: arrayUnion(userId),
    });

    // Create member subdocument
    const member: HouseholdMember = {
      uid: userId,
      displayName: profile?.displayName || profile?.email || 'User',
      email: profile?.email || '',
      photoURL: profile?.photoURL,
      role: 'member',
      joinedAt: new Date().toISOString(),
    };
    const cleanMember: any = {};
    for (const [key, value] of Object.entries(member)) {
      if (value !== undefined) cleanMember[key] = value;
    }
    await setDoc(doc(db, `households/${householdId}/members`, userId), cleanMember);

    // Update user profile
    await profileService.updateProfile(userId, { householdId });
  },

  async leaveHousehold(userId: string, householdId: string): Promise<void> {
    const householdRef = doc(db, 'households', householdId);
    const householdSnap = await getDoc(householdRef);
    if (!householdSnap.exists()) return;

    const household = householdSnap.data() as Household;
    const remainingMembers = household.memberUids.filter(uid => uid !== userId);

    if (remainingMembers.length === 0) {
      // Last member leaving - delete the household and all subcollections
      const tasksSnap = await getDocs(collection(db, `households/${householdId}/tasks`));
      for (const taskDoc of tasksSnap.docs) {
        await deleteDoc(taskDoc.ref);
      }
      const membersSnap = await getDocs(collection(db, `households/${householdId}/members`));
      for (const memberDoc of membersSnap.docs) {
        await deleteDoc(memberDoc.ref);
      }
      await deleteDoc(householdRef);
    } else {
      // Remove user from memberUids
      await updateDoc(householdRef, {
        memberUids: arrayRemove(userId),
      });

      // Transfer admin if leaving user was admin
      if (household.adminUid === userId) {
        await updateDoc(householdRef, {
          adminUid: remainingMembers[0],
        });
        // Update new admin's member doc
        await updateDoc(doc(db, `households/${householdId}/members`, remainingMembers[0]), {
          role: 'admin',
        });
      }

      // Unassign tasks that were assigned to the leaving user
      const tasksSnap = await getDocs(collection(db, `households/${householdId}/tasks`));
      for (const taskDoc of tasksSnap.docs) {
        const task = taskDoc.data();
        if (task.assignedTo === userId) {
          await updateDoc(taskDoc.ref, { assignedTo: '' });
        }
      }

      // Delete member subdocument
      await deleteDoc(doc(db, `households/${householdId}/members`, userId));
    }

    // Clear user's householdId
    await profileService.updateProfile(userId, { householdId: '' });
  },

  async removeMember(adminUid: string, targetUid: string, householdId: string): Promise<void> {
    const householdRef = doc(db, 'households', householdId);
    const householdSnap = await getDoc(householdRef);
    if (!householdSnap.exists()) return;

    const household = householdSnap.data() as Household;
    if (household.adminUid !== adminUid) throw new Error('Only admin can remove members');

    // Remove from memberUids
    await updateDoc(householdRef, {
      memberUids: arrayRemove(targetUid),
    });

    // Unassign their tasks
    const tasksSnap = await getDocs(collection(db, `households/${householdId}/tasks`));
    for (const taskDoc of tasksSnap.docs) {
      const task = taskDoc.data();
      if (task.assignedTo === targetUid) {
        await updateDoc(taskDoc.ref, { assignedTo: '' });
      }
    }

    // Delete member subdocument
    await deleteDoc(doc(db, `households/${householdId}/members`, targetUid));

    // Clear their profile
    await profileService.updateProfile(targetUid, { householdId: '' });
  },

  async getHousehold(householdId: string): Promise<Household | null> {
    const snap = await getDoc(doc(db, 'households', householdId));
    return snap.exists() ? (snap.data() as Household) : null;
  },

  subscribeHousehold(householdId: string, callback: (household: Household | null) => void): () => void {
    return onSnapshot(doc(db, 'households', householdId), (snap) => {
      callback(snap.exists() ? (snap.data() as Household) : null);
    });
  },

  subscribeMembers(householdId: string, callback: (members: HouseholdMember[]) => void): () => void {
    return onSnapshot(collection(db, `households/${householdId}/members`), (snap) => {
      const members = snap.docs.map(d => d.data() as HouseholdMember);
      callback(members);
    });
  },

  async regenerateInviteCode(householdId: string): Promise<string> {
    const newCode = generateInviteCode();
    await updateDoc(doc(db, 'households', householdId), { inviteCode: newCode });
    return newCode;
  },
};
