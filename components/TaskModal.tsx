import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Task, RoomType, Frequency } from '../types';
import { X } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  task?: Task | null;
  mode: 'add' | 'edit';
  existingTasks?: Task[];
}

// Common cleaning tasks suggestions
const COMMON_CLEANING_TASKS = [
  'Clean dishwasher',
  'Run dishwasher',
  'Vacuum floors',
  'Mop floors',
  'Dust surfaces',
  'Clean mirrors',
  'Wipe countertops',
  'Clean toilet',
  'Clean shower/tub',
  'Change bed sheets',
  'Empty trash',
  'Clean refrigerator',
  'Clean microwave',
  'Clean oven',
  'Organize closet',
  'Vacuum carpets',
  'Sweep floors',
  'Clean windows',
  'Wipe baseboards',
  'Clean light fixtures',
  'Organize pantry',
  'Clean sink',
  'Wipe cabinets',
  'Clean stove top',
  'Sanitize surfaces',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, task, mode, existingTasks = [] }) => {
  // Derive unique rooms from existing tasks
  const existingRooms = useMemo(() => {
    const roomMap = new Map<string, RoomType>();
    existingTasks.forEach(t => {
      if (t.room && !roomMap.has(t.room)) {
        roomMap.set(t.room, t.roomType);
      }
    });
    return Array.from(roomMap.entries())
      .map(([name, type]) => ({ name, type }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [existingTasks]);

  const [formData, setFormData] = useState({
    description: '',
    room: '',
    roomType: RoomType.Bedroom,
    frequency: Frequency.Weekly,
    estimatedMinutes: 15,
    priority: 'Medium' as 'High' | 'Medium' | 'Low',
    scheduledDay: new Date().getDay() as number | undefined,
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Build list of task suggestions from existing tasks + common tasks
  const allSuggestions = useMemo(() => {
    const existingDescriptions = existingTasks.map(t => t.description).filter(Boolean);
    const combined = [...new Set([...existingDescriptions, ...COMMON_CLEANING_TASKS])];
    return combined.sort();
  }, [existingTasks]);

  useEffect(() => {
    if (task && mode === 'edit') {
      setFormData({
        description: task.description,
        room: task.room,
        roomType: task.roomType,
        frequency: task.frequency,
        estimatedMinutes: task.estimatedMinutes,
        priority: task.priority,
        scheduledDay: task.scheduledDay,
      });
    } else if (mode === 'add') {
      setFormData({
        description: '',
        room: existingRooms.length > 0 ? existingRooms[0].name : '',
        roomType: existingRooms.length > 0 ? existingRooms[0].type : RoomType.Bedroom,
        frequency: Frequency.Weekly,
        estimatedMinutes: 15,
        priority: 'Medium',
        scheduledDay: new Date().getDay(),
      });
    }
    // Reset suggestions when modal opens/closes
    setShowSuggestions(false);
    setFilteredSuggestions([]);
  }, [task, mode, isOpen, existingRooms]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDescriptionChange = (value: string) => {
    setFormData({ ...formData, description: value });

    // Filter suggestions based on input
    if (value.trim().length > 0) {
      const filtered = allSuggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredSuggestions(allSuggestions);
      setShowSuggestions(true);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setFormData({ ...formData, description: suggestion });
    setShowSuggestions(false);
  };

  // Determine whether scheduledDay picker should show, and what type
  const needsScheduledDay = formData.frequency !== Frequency.Daily;
  const isDayOfWeek = formData.frequency === Frequency.Weekly || formData.frequency === Frequency.BiWeekly;
  const isDayOfMonth = formData.frequency === Frequency.Monthly || formData.frequency === Frequency.Quarterly;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const taskData: Partial<Task> = {
      description: formData.description,
      room: formData.room,
      roomType: formData.roomType,
      frequency: formData.frequency,
      estimatedMinutes: formData.estimatedMinutes,
      priority: formData.priority,
      scheduledDay: needsScheduledDay ? formData.scheduledDay : undefined,
      isDue: true,
    };

    if (mode === 'edit' && task) {
      taskData.id = task.id;
    }

    onSave(taskData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">
            {mode === 'add' ? 'Add New Task' : 'Edit Task'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Task Description */}
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Task Description *
            </label>
            <input
              ref={inputRef}
              type="text"
              required
              value={formData.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              onFocus={() => {
                setFilteredSuggestions(allSuggestions);
                setShowSuggestions(true);
              }}
              placeholder="e.g., Clean dishwasher"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              autoComplete="off"
            />

            {/* Suggestions Dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
              >
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-teal-50 hover:text-teal-700 transition-colors text-sm border-b border-slate-100 last:border-b-0"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Room */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Room *
            </label>
            {existingRooms.length > 0 ? (
              <select
                required
                value={formData.room}
                onChange={(e) => {
                  const selected = existingRooms.find(r => r.name === e.target.value);
                  if (selected) {
                    setFormData({ ...formData, room: selected.name, roomType: selected.type });
                  }
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="" disabled>Select a room...</option>
                {existingRooms.map(r => (
                  <option key={r.name} value={r.name}>
                    {r.name} ({r.type})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-slate-500 italic py-2">
                No rooms yet. Add rooms via the Room Manager first.
              </p>
            )}
          </div>

          {/* Frequency and Estimated Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Frequency *
              </label>
              <select
                required
                value={formData.frequency}
                onChange={(e) => {
                  const freq = e.target.value as Frequency;
                  let day = formData.scheduledDay;
                  // Reset scheduledDay when switching frequency types
                  if (freq === Frequency.Daily) {
                    day = undefined;
                  } else if (freq === Frequency.Weekly || freq === Frequency.BiWeekly) {
                    day = (day !== undefined && day >= 0 && day <= 6) ? day : new Date().getDay();
                  } else {
                    // Monthly/Quarterly: day-of-month
                    day = (day !== undefined && day >= 1 && day <= 31) ? day : new Date().getDate();
                  }
                  setFormData({ ...formData, frequency: freq, scheduledDay: day });
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Bi-Weekly">Bi-Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Estimated Time (minutes) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.estimatedMinutes}
                onChange={(e) => setFormData({ ...formData, estimatedMinutes: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Priority and Scheduled Day */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Priority *
              </label>
              <select
                required
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'High' | 'Medium' | 'Low' })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Scheduled Day - only shown for non-daily frequencies */}
            {needsScheduledDay && (
              <div>
                {isDayOfWeek ? (
                  <>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Scheduled Day of Week *
                    </label>
                    <div className="flex gap-1">
                      {DAY_NAMES.map((name, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormData({ ...formData, scheduledDay: idx })}
                          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                            formData.scheduledDay === idx
                              ? 'bg-teal-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </>
                ) : isDayOfMonth ? (
                  <>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Day of Month *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="31"
                      value={formData.scheduledDay ?? 1}
                      onChange={(e) => setFormData({ ...formData, scheduledDay: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </>
                ) : null}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={existingRooms.length === 0}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mode === 'add' ? 'Add Task' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
