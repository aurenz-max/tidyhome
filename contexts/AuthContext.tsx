import React, { createContext, useContext, useState, useEffect } from 'react';
import { type User } from 'firebase/auth';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handlePostSignUp = async (firebaseUser: User) => {
    // Create user profile in Firestore
    await profileService.createProfile(
      firebaseUser.uid,
      firebaseUser.email || '',
      firebaseUser.displayName || undefined,
      firebaseUser.photoURL || undefined,
    );
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const firebaseUser = await authService.signUpWithEmail(email, password, displayName);
    await handlePostSignUp(firebaseUser);
  };

  const signIn = async (email: string, password: string) => {
    await authService.signInWithEmail(email, password);
  };

  const signInWithGoogle = async () => {
    const firebaseUser = await authService.signInWithGoogle();
    // Create profile if it doesn't exist (profileService.createProfile is idempotent)
    await handlePostSignUp(firebaseUser);
  };

  const signOut = async () => {
    await authService.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
