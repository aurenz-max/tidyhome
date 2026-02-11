import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Calendar as CalendarIcon, List, Scale, LogOut, UserCircle, Settings, Users, ClipboardList, Sun, Moon, Monitor } from 'lucide-react';
import TidyHomeLogo from './TidyHomeLogo';
import { useTheme } from '../hooks/useTheme';

interface HeaderProps {
  onGenerate: () => void;
  onBalance: () => void;
  onOpenScheduler: () => void;
  isGenerating: boolean;
  viewMode: 'rooms' | 'calendar';
  setViewMode: (mode: 'rooms' | 'calendar') => void;
  userName: string;
  onSignOut: () => void;
  onManageRooms: () => void;
  householdName?: string;
  onManageHousehold: () => void;
  memberCount?: number;
}

const Header: React.FC<HeaderProps> = ({ onGenerate, onBalance, onOpenScheduler, isGenerating, viewMode, setViewMode, userName, onSignOut, onManageRooms, householdName, onManageHousehold, memberCount }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-16 py-3 sm:py-0 space-y-3 sm:space-y-0">
          
          {/* Logo */}
          <div className="flex items-center w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-teal-100 text-teal-600">
                <TidyHomeLogo size={24} />
                </div>
                <div className="ml-3">
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">TidyHome AI</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden md:block">
                  {householdName || 'Smart Maintenance for Busy Families'}
                  {memberCount && memberCount > 1 ? ` \u00B7 ${memberCount} members` : ''}
                </p>
                </div>
            </div>
            
            {/* Mobile View Toggle */}
            <div className="flex sm:hidden bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                 <button
                    onClick={() => setViewMode('rooms')}
                    className={`p-2 rounded-md ${viewMode === 'rooms' ? 'bg-white dark:bg-slate-600 shadow text-teal-600' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    <List size={18} />
                </button>
                <button
                    onClick={() => setViewMode('calendar')}
                    className={`p-2 rounded-md ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-600 shadow text-teal-600' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    <CalendarIcon size={18} />
                </button>
            </div>
          </div>

          {/* Desktop Controls */}
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            
            {/* Desktop View Toggle */}
            <div className="hidden sm:flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg mr-4">
                <button
                    onClick={() => setViewMode('rooms')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'rooms' ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                >
                    Rooms
                </button>
                <button
                    onClick={() => setViewMode('calendar')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'calendar' ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                >
                    Calendar
                </button>
            </div>

            <button
              onClick={onOpenScheduler}
              className="flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <ClipboardList size={16} className="mr-2" />
              <span className="hidden sm:inline">Schedule</span>
            </button>

            {viewMode === 'calendar' && (
                 <button
                 onClick={onBalance}
                 disabled={isGenerating}
                 className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 ${
                   isGenerating
                     ? 'bg-slate-50 dark:bg-slate-700 text-slate-400 border-slate-200 dark:border-slate-600 cursor-not-allowed'
                     : 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300'
                 }`}
               >
                 <Scale size={16} className={`mr-2 ${isGenerating ? 'animate-pulse' : ''}`} />
                 <span className="hidden sm:inline">Load Balance</span>
                 <span className="sm:hidden">Balance</span>
               </button>
            )}

            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 ${
                isGenerating
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
              }`}
            >
              <Sparkles size={16} className={`mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">AI Optimize</span>
              <span className="sm:hidden">Optimize</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title={`Theme: ${theme}`}
            >
              <ThemeIcon size={18} />
            </button>

            {/* User Menu */}
            <div className="relative flex items-center ml-1 pl-2 border-l border-slate-200 dark:border-slate-600" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <UserCircle size={18} className="text-slate-400" />
                <span className="hidden sm:inline max-w-[120px] truncate">{userName}</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 py-1 z-50">
                  <button
                    onClick={() => { setShowUserMenu(false); onManageHousehold(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                  >
                    <Users size={15} className="text-slate-400" />
                    Household Settings
                  </button>
                  <button
                    onClick={() => { setShowUserMenu(false); onManageRooms(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                  >
                    <Settings size={15} className="text-slate-400" />
                    Manage Rooms
                  </button>
                  <div className="border-t border-slate-100 dark:border-slate-600 my-1" />
                  <button
                    onClick={() => { setShowUserMenu(false); onSignOut(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <LogOut size={15} className="text-red-400" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
