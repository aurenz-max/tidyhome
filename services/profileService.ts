import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase.config';
import { UserProfile } from '../types';

const getProfileDoc = (userId: string) =>
  doc(db, `users/${userId}/profile/data`);

export const profileService = {
  async createProfile(uid: string, email: string, displayName?: string, photoURL?: string): Promise<void> {
    const profileDoc = getProfileDoc(uid);
    const existing = await getDoc(profileDoc);
    if (existing.exists()) return; // Don't overwrite existing profile

    const profile: UserProfile = {
      uid,
      email,
      displayName: displayName || undefined,
      photoURL: photoURL || undefined,
      createdAt: new Date().toISOString(),
    };

    // Remove undefined values for Firestore
    const clean: any = {};
    for (const [key, value] of Object.entries(profile)) {
      if (value !== undefined) clean[key] = value;
    }

    await setDoc(profileDoc, clean);
  },

  async getProfile(userId: string): Promise<UserProfile | null> {
    const profileDoc = getProfileDoc(userId);
    const snapshot = await getDoc(profileDoc);
    return snapshot.exists() ? (snapshot.data() as UserProfile) : null;
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const profileDoc = getProfileDoc(userId);
    const clean: any = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) clean[key] = value;
    }
    await setDoc(profileDoc, clean, { merge: true });
  },
};
