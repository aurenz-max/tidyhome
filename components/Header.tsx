import React, { useState, useRef, useEffect } from 'react';
import { Home, Sparkles, Calendar as CalendarIcon, List, Scale, LogOut, UserCircle, Settings } from 'lucide-react';

interface HeaderProps {
  onGenerate: () => void;
  onBalance: () => void;
  isGenerating: boolean;
  viewMode: 'rooms' | 'calendar';
  setViewMode: (mode: 'rooms' | 'calendar') => void;
  userName: string;
  onSignOut: () => void;
  onManageRooms: () => void;
}

const Header: React.FC<HeaderProps> = ({ onGenerate, onBalance, isGenerating, viewMode, setViewMode, userName, onSignOut, onManageRooms }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-16 py-3 sm:py-0 space-y-3 sm:space-y-0">
          
          {/* Logo */}
          <div className="flex items-center w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-teal-100 text-teal-600">
                <Home size={20} />
                </div>
                <div className="ml-3">
                <h1 className="text-xl font-bold text-slate-800">TidyHome AI</h1>
                <p className="text-xs text-slate-500 hidden md:block">Smart Maintenance for Busy Families</p>
                </div>
            </div>
            
            {/* Mobile View Toggle */}
            <div className="flex sm:hidden bg-slate-100 p-1 rounded-lg">
                 <button 
                    onClick={() => setViewMode('rooms')}
                    className={`p-2 rounded-md ${viewMode === 'rooms' ? 'bg-white shadow text-teal-600' : 'text-slate-500'}`}
                >
                    <List size={18} />
                </button>
                <button 
                    onClick={() => setViewMode('calendar')}
                    className={`p-2 rounded-md ${viewMode === 'calendar' ? 'bg-white shadow text-teal-600' : 'text-slate-500'}`}
                >
                    <CalendarIcon size={18} />
                </button>
            </div>
          </div>

          {/* Desktop Controls */}
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            
            {/* Desktop View Toggle */}
            <div className="hidden sm:flex bg-slate-100 p-1 rounded-lg mr-4">
                <button
                    onClick={() => setViewMode('rooms')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'rooms' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Rooms
                </button>
                <button
                    onClick={() => setViewMode('calendar')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'calendar' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Calendar
                </button>
            </div>

            {viewMode === 'calendar' && (
                 <button
                 onClick={onBalance}
                 disabled={isGenerating}
                 className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 ${
                   isGenerating
                     ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                     : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300'
                 }`}
               >
                 <Scale size={16} className={`mr-2 ${isGenerating ? 'animate-pulse' : ''}`} />
                 Load Balance
               </button>
            )}

            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 ${
                isGenerating
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
              }`}
            >
              <Sparkles size={16} className={`mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">AI Optimize</span>
              <span className="sm:hidden">Optimize</span>
            </button>

            {/* User Menu */}
            <div className="relative flex items-center ml-2 pl-2 border-l border-slate-200" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <UserCircle size={18} className="text-slate-400" />
                <span className="hidden sm:inline max-w-[120px] truncate">{userName}</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                  <button
                    onClick={() => { setShowUserMenu(false); onManageRooms(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Settings size={15} className="text-slate-400" />
                    Manage Rooms
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => { setShowUserMenu(false); onSignOut(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
