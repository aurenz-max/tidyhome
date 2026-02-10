import React, { useState } from 'react';
import { useHousehold } from '../contexts/HouseholdContext';
import { useAuth } from '../contexts/AuthContext';
import { X, Copy, RefreshCw, UserMinus, LogOut, Check, Shield, User } from 'lucide-react';

interface HouseholdSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const HouseholdSettings: React.FC<HouseholdSettingsProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { household, members, isAdmin, removeMember, leaveHousehold, regenerateInviteCode } = useHousehold();
  const [copied, setCopied] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !household) return null;

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(household.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?code=${household.inviteCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      await regenerateInviteCode();
    } catch (err) {
      console.error('Failed to regenerate code:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (uid: string) => {
    setLoading(true);
    try {
      await removeMember(uid);
      setConfirmingRemove(null);
    } catch (err) {
      console.error('Failed to remove member:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    setLoading(true);
    try {
      await leaveHousehold();
      onClose();
    } catch (err) {
      console.error('Failed to leave household:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortedMembers = [...members].sort((a, b) => {
    if (a.role === 'admin') return -1;
    if (b.role === 'admin') return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Household Settings</h2>
            <p className="text-sm text-slate-500 mt-1">{household.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Invite Code Section */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Invite Code</h3>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-mono font-bold tracking-[0.3em] text-slate-800">
                  {household.inviteCode}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyCode}
                    className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                  >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={handleRegenerate}
                      disabled={loading}
                      className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      title="Generate a new invite code"
                    >
                      <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                      New Code
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={handleCopyLink}
                className="w-full text-center text-xs text-teal-600 hover:text-teal-700 font-medium"
              >
                Copy invite link
              </button>
            </div>
          </div>

          {/* Members Section */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
              Members ({members.length})
            </h3>
            <div className="space-y-2">
              {sortedMembers.map((member) => (
                <div
                  key={member.uid}
                  className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    {member.photoURL ? (
                      <img
                        src={member.photoURL}
                        alt={member.displayName}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold">
                        {member.displayName?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800">
                          {member.displayName}
                          {member.uid === user?.uid && (
                            <span className="text-slate-400 font-normal ml-1">(you)</span>
                          )}
                        </p>
                        {member.role === 'admin' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-semibold rounded">
                            <Shield size={10} /> Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{member.email}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  {isAdmin && member.uid !== user?.uid && (
                    <>
                      {confirmingRemove === member.uid ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-red-600 font-medium">Remove?</span>
                          <button
                            onClick={() => handleRemove(member.uid)}
                            disabled={loading}
                            className="p-1 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmingRemove(null)}
                            className="p-1 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmingRemove(member.uid)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                          title="Remove member"
                        >
                          <UserMinus size={16} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Leave Household */}
          {!isAdmin && (
            <div className="border-t border-slate-200 pt-4">
              {confirmingLeave ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-red-600 font-medium flex-1">
                    Leave this household? Your task assignments will be removed.
                  </span>
                  <button
                    onClick={handleLeave}
                    disabled={loading}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Leave
                  </button>
                  <button
                    onClick={() => setConfirmingLeave(false)}
                    className="px-3 py-1.5 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmingLeave(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                >
                  <LogOut size={16} />
                  Leave Household
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HouseholdSettings;
