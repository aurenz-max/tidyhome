import React, { useState, useEffect } from 'react';
import { useHousehold } from '../contexts/HouseholdContext';
import { useAuth } from '../contexts/AuthContext';
import { householdService } from '../services/householdService';
import { Home, Users, ArrowRight, Loader2, AlertCircle, LogOut } from 'lucide-react';

const HouseholdSetup: React.FC = () => {
  const { createHousehold, joinHousehold } = useHousehold();
  const { user, signOut } = useAuth();
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [foundHousehold, setFoundHousehold] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Debug logging
  useEffect(() => {
    console.log('[HouseholdSetup] Current user:', {
      uid: user?.uid,
      email: user?.email,
      displayName: user?.displayName,
    });
  }, [user]);

  // Check URL for invite code on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setInviteCode(code.toUpperCase());
      setMode('join');
    }
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdName.trim()) return;
    setLoading(true);
    setError('');
    try {
      await createHousehold(householdName.trim());
    } catch (err: any) {
      setError(err.message || 'Failed to create household');
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async () => {
    if (inviteCode.length < 6) return;
    setLoading(true);
    setError('');
    setFoundHousehold(null);
    console.log('[HouseholdSetup] Looking up invite code:', inviteCode.toUpperCase());
    try {
      const household = await householdService.findHouseholdByInviteCode(inviteCode.toUpperCase());
      console.log('[HouseholdSetup] Lookup result:', household);
      if (household) {
        setFoundHousehold({ id: household.id, name: household.name });
      } else {
        setError('No household found with that code. Please check and try again.');
      }
    } catch (err: any) {
      console.error('[HouseholdSetup] Lookup error:', err);
      setError(err.message || 'Failed to look up code');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setLoading(true);
    setError('');
    console.log('[HouseholdSetup] Attempting to join household:', {
      inviteCode: inviteCode.toUpperCase(),
      householdId: foundHousehold?.id,
      householdName: foundHousehold?.name,
      currentUser: user?.uid,
    });
    try {
      await joinHousehold(inviteCode.toUpperCase());
      console.log('[HouseholdSetup] Successfully joined household');
    } catch (err: any) {
      console.error('[HouseholdSetup] Join error:', err);
      setError(err.message || 'Failed to join household');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 max-w-md w-full overflow-hidden relative">
        {/* Sign Out Button */}
        <button
          onClick={() => signOut()}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors z-10"
          title="Sign Out"
        >
          <LogOut size={20} />
        </button>

        {/* Header */}
        <div className="bg-teal-600 px-6 py-8 text-center text-white">
          <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home size={32} />
          </div>
          <h1 className="text-2xl font-bold">Set Up Your Household</h1>
          <p className="text-teal-100 mt-2 text-sm">Create a new household or join an existing one</p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Choose Mode */}
          {mode === 'choose' && (
            <div className="space-y-3">
              <button
                onClick={() => setMode('create')}
                className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center">
                    <Home size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Create a Household</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Start fresh and invite your family</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-slate-400 group-hover:text-teal-600 transition-colors" />
              </button>

              <button
                onClick={() => setMode('join')}
                className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                    <Users size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Join a Household</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">I have an invite code</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </button>
            </div>
          )}

          {/* Create Household */}
          {mode === 'create' && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Household Name
                </label>
                <input
                  type="text"
                  required
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="e.g., The Smith Family"
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setMode('choose'); setError(''); }}
                  className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !householdName.trim()}
                  className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                  Create
                </button>
              </div>
            </form>
          )}

          {/* Join Household */}
          {mode === 'join' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Invite Code
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
                    setFoundHousehold(null);
                    setError('');
                  }}
                  placeholder="Enter 6-character code"
                  maxLength={6}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-2xl tracking-[0.3em] font-mono uppercase"
                  autoFocus
                />
              </div>

              {foundHousehold && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    Found household: <strong>{foundHousehold.name}</strong>
                  </p>
                  <button
                    onClick={handleJoin}
                    disabled={loading}
                    className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                    Join {foundHousehold.name}
                  </button>
                </div>
              )}

              {!foundHousehold && (
                <button
                  onClick={handleLookup}
                  disabled={loading || inviteCode.length < 6}
                  className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                  Look Up Code
                </button>
              )}

              <button
                type="button"
                onClick={() => { setMode('choose'); setError(''); setFoundHousehold(null); setInviteCode(''); }}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HouseholdSetup;
