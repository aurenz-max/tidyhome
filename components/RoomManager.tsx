import React, { useState, useMemo } from 'react';
import { Task, RoomType, RoomTaskTemplate } from '../types';
import { ROOM_TASK_CATALOG } from '../constants';
import {
  ChefHat, UtensilsCrossed, Sofa, Monitor, DoorOpen, Bath, Bed,
  ArrowRightLeft, ArrowDownToLine, Home, X, Pencil, Trash2, Plus,
  Check, ChevronLeft, Loader2,
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  ChefHat, UtensilsCrossed, Sofa, Monitor, DoorOpen, Bath, Bed,
  ArrowRightLeft, ArrowDownToLine, Home,
};

interface RoomManagerProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onAddRoom: (roomName: string, roomType: RoomType, seedTasks: RoomTaskTemplate[]) => Promise<void>;
  onRenameRoom: (oldName: string, newName: string) => Promise<void>;
  onDeleteRoom: (roomName: string) => Promise<void>;
}

const RoomManager: React.FC<RoomManagerProps> = ({ isOpen, onClose, tasks, onAddRoom, onRenameRoom, onDeleteRoom }) => {
  const [mode, setMode] = useState<'list' | 'add'>('list');
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletingRoom, setDeletingRoom] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Add room state
  const [newRoomType, setNewRoomType] = useState<RoomType>(RoomType.Bedroom);
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedSeedTasks, setSelectedSeedTasks] = useState<Record<number, boolean>>({});
  const [nameError, setNameError] = useState('');

  const rooms = useMemo(() => {
    const roomMap = new Map<string, { roomType: RoomType; taskCount: number }>();
    for (const task of tasks) {
      if (!roomMap.has(task.room)) {
        roomMap.set(task.room, { roomType: task.roomType, taskCount: 0 });
      }
      roomMap.get(task.room)!.taskCount++;
    }
    return Array.from(roomMap.entries())
      .map(([name, info]) => ({
        name,
        roomType: info.roomType,
        taskCount: info.taskCount,
        icon: ROOM_TASK_CATALOG[info.roomType]?.icon || 'Home',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  const existingRoomNames = useMemo(() => new Set(rooms.map(r => r.name)), [rooms]);

  const resetAddForm = (roomType?: RoomType) => {
    const type = roomType || RoomType.Bedroom;
    setNewRoomType(type);
    setNewRoomName(ROOM_TASK_CATALOG[type].defaultName);
    setNameError('');
    const catalog = ROOM_TASK_CATALOG[type].tasks;
    const sel: Record<number, boolean> = {};
    catalog.forEach((_, i) => { sel[i] = true; });
    setSelectedSeedTasks(sel);
  };

  const handleStartAdd = () => {
    resetAddForm();
    setMode('add');
  };

  const handleTypeChange = (type: RoomType) => {
    setNewRoomType(type);
    setNewRoomName(ROOM_TASK_CATALOG[type].defaultName);
    setNameError('');
    const catalog = ROOM_TASK_CATALOG[type].tasks;
    const sel: Record<number, boolean> = {};
    catalog.forEach((_, i) => { sel[i] = true; });
    setSelectedSeedTasks(sel);
  };

  const handleAddRoom = async () => {
    const trimmed = newRoomName.trim();
    if (!trimmed) {
      setNameError('Room name is required');
      return;
    }
    if (existingRoomNames.has(trimmed)) {
      setNameError('A room with this name already exists');
      return;
    }

    const catalog = ROOM_TASK_CATALOG[newRoomType].tasks;
    const selected = catalog.filter((_, i) => selectedSeedTasks[i]);

    setSaving(true);
    try {
      await onAddRoom(trimmed, newRoomType, selected);
      setMode('list');
    } finally {
      setSaving(false);
    }
  };

  const handleStartRename = (roomName: string) => {
    setEditingRoom(roomName);
    setEditValue(roomName);
  };

  const handleCommitRename = async () => {
    if (!editingRoom) return;
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === editingRoom) {
      setEditingRoom(null);
      return;
    }
    if (existingRoomNames.has(trimmed)) {
      return; // silently reject duplicate
    }
    setSaving(true);
    try {
      await onRenameRoom(editingRoom, trimmed);
    } finally {
      setSaving(false);
      setEditingRoom(null);
    }
  };

  const handleDelete = async (roomName: string) => {
    setSaving(true);
    try {
      await onDeleteRoom(roomName);
    } finally {
      setSaving(false);
      setDeletingRoom(null);
    }
  };

  if (!isOpen) return null;

  const catalogTasks = ROOM_TASK_CATALOG[newRoomType]?.tasks || [];
  const selectedCount = Object.values(selectedSeedTasks).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          {mode === 'add' ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setMode('list')} className="p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <ChevronLeft size={20} className="text-slate-500" />
              </button>
              <h2 className="text-lg font-semibold text-slate-800">Add Room</h2>
            </div>
          ) : (
            <h2 className="text-lg font-semibold text-slate-800">Manage Rooms</h2>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {mode === 'list' ? (
            <>
              {rooms.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No rooms yet. Add one to get started.</p>
              ) : (
                <div className="space-y-1">
                  {rooms.map(room => {
                    const IconComp = ICON_MAP[room.icon] || Home;
                    const isDeleting = deletingRoom === room.name;

                    return (
                      <div key={room.name} className="group">
                        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                            <IconComp size={16} className="text-teal-600" />
                          </div>

                          <div className="flex-1 min-w-0">
                            {editingRoom === room.name ? (
                              <input
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleCommitRename();
                                  if (e.key === 'Escape') setEditingRoom(null);
                                }}
                                onBlur={handleCommitRename}
                                className="w-full text-sm font-medium text-slate-800 border border-teal-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                              />
                            ) : (
                              <p className="text-sm font-medium text-slate-800 truncate">{room.name}</p>
                            )}
                            <p className="text-xs text-slate-400">{room.taskCount} task{room.taskCount !== 1 ? 's' : ''}</p>
                          </div>

                          {editingRoom !== room.name && !isDeleting && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleStartRename(room.name)}
                                className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                                title="Rename"
                              >
                                <Pencil size={14} className="text-slate-400" />
                              </button>
                              <button
                                onClick={() => setDeletingRoom(room.name)}
                                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={14} className="text-slate-400 hover:text-red-500" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Delete confirmation */}
                        {isDeleting && (
                          <div className="flex items-center gap-2 px-3 py-2 ml-11 bg-red-50 rounded-lg text-sm">
                            <span className="text-red-700 flex-1">Delete <strong>{room.name}</strong> and {room.taskCount} task{room.taskCount !== 1 ? 's' : ''}?</span>
                            <button
                              onClick={() => setDeletingRoom(null)}
                              className="px-2 py-1 text-xs text-slate-600 hover:bg-white rounded transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDelete(room.name)}
                              disabled={saving}
                              className="px-2 py-1 text-xs text-white bg-red-500 hover:bg-red-600 rounded transition-colors disabled:opacity-50"
                            >
                              {saving ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Add Room Mode */
            <div className="space-y-5">
              {/* Room Type Picker */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Room Type</label>
                <div className="grid grid-cols-5 gap-2">
                  {Object.values(RoomType).map(type => {
                    const template = ROOM_TASK_CATALOG[type];
                    const IconComp = ICON_MAP[template.icon] || Home;
                    const isSelected = newRoomType === type;
                    return (
                      <button
                        key={type}
                        onClick={() => handleTypeChange(type)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <IconComp size={18} className={isSelected ? 'text-teal-600' : 'text-slate-400'} />
                        <span className="truncate w-full text-center leading-tight">{template.defaultName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Room Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Room Name</label>
                <input
                  value={newRoomName}
                  onChange={e => { setNewRoomName(e.target.value); setNameError(''); }}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    nameError ? 'border-red-300' : 'border-slate-300'
                  }`}
                  placeholder="e.g. Main Bedroom, Guest Bath"
                />
                {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
              </div>

              {/* Seed Tasks */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Suggested Tasks ({selectedCount} of {catalogTasks.length} selected)
                </label>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {catalogTasks.map((tmpl, i) => (
                    <label key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!selectedSeedTasks[i]}
                        onChange={() => setSelectedSeedTasks(prev => ({ ...prev, [i]: !prev[i] }))}
                        className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm text-slate-700 flex-1">{tmpl.description}</span>
                      <span className="text-xs text-slate-400">{tmpl.frequency} &middot; {tmpl.estimatedMinutes}m</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200">
          {mode === 'list' ? (
            <button
              onClick={handleStartAdd}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              <Plus size={16} />
              Add Room
            </button>
          ) : (
            <button
              onClick={handleAddRoom}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {saving ? 'Adding...' : `Add Room${selectedCount > 0 ? ` with ${selectedCount} Tasks` : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomManager;
