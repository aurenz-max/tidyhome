import React, { useState, useMemo } from 'react';
import { Task, Frequency, RoomType, RoomTaskTemplate, Room } from '../types';
import { ROOM_TASK_CATALOG, FALLBACK_TASKS } from '../constants';
import { getNextOccurrence, isTaskDueOnDate, getToday } from '../utils/recurrence';
import { optimizeWeeklySchedule } from '../utils/scheduler';
import { roomService } from '../services/roomService';
import {
  ChefHat, UtensilsCrossed, Sofa, Monitor, DoorOpen, Bath, Bed,
  ArrowRightLeft, ArrowDownToLine, Home, Plus, Minus, X, ChevronDown, ChevronRight,
  Check, Sparkles, Loader2, ArrowUp, Pencil, Trash2, WashingMachine,
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  ChefHat, UtensilsCrossed, Sofa, Monitor, DoorOpen, Bath, Bed,
  ArrowRightLeft, ArrowDownToLine, WashingMachine, Home,
};

const FREQ_COLORS: Record<string, string> = {
  [Frequency.Daily]: 'bg-red-100 text-red-700',
  [Frequency.Weekly]: 'bg-blue-100 text-blue-700',
  [Frequency.BiWeekly]: 'bg-purple-100 text-purple-700',
  [Frequency.Monthly]: 'bg-amber-100 text-amber-700',
  [Frequency.Quarterly]: 'bg-green-100 text-green-700',
};

// Main floor room options
const MAIN_FLOOR_ROOMS: { roomType: RoomType; icon: string }[] = [
  { roomType: RoomType.Kitchen, icon: 'ChefHat' },
  { roomType: RoomType.DiningRoom, icon: 'UtensilsCrossed' },
  { roomType: RoomType.LivingRoom, icon: 'Sofa' },
  { roomType: RoomType.Office, icon: 'Monitor' },
  { roomType: RoomType.Entryway, icon: 'DoorOpen' },
  { roomType: RoomType.LaundryRoom, icon: 'WashingMachine' },
];

interface SelectedRoom {
  roomType: RoomType;
  name: string;
  isCustom: boolean;
}

interface OnboardingWizardProps {
  householdId: string;
  onComplete: (tasks: Task[]) => Promise<void>;
}

// Counter component for bedrooms/bathrooms
const Counter: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-7 h-7 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Minus size={14} />
      </button>
      <span className="w-6 text-center font-semibold text-slate-800 dark:text-slate-200">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-7 h-7 rounded-lg border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Plus size={14} />
      </button>
    </div>
  </div>
);

// Toggle switch component
const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (v: boolean) => void }> = ({ enabled, onChange }) => (
  <button
    onClick={() => onChange(!enabled)}
    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${enabled ? 'bg-teal-600' : 'bg-slate-300'}`}
  >
    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? 'left-6' : 'left-1'}`} />
  </button>
);

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ householdId, onComplete }) => {
  const [step, setStep] = useState(1);

  // Floor-based configuration (Step 1)
  const [mainFloorRooms, setMainFloorRooms] = useState<Set<RoomType>>(
    new Set([RoomType.Kitchen, RoomType.LivingRoom, RoomType.DiningRoom, RoomType.Entryway])
  );
  const [mainFloorBedrooms, setMainFloorBedrooms] = useState(0);
  const [mainFloorBathrooms, setMainFloorBathrooms] = useState(1);
  const [mainFloorHalfBath, setMainFloorHalfBath] = useState(true);
  const [upstairsEnabled, setUpstairsEnabled] = useState(true);
  const [upstairsBedrooms, setUpstairsBedrooms] = useState(3);
  const [upstairsBathrooms, setUpstairsBathrooms] = useState(2);
  const [upstairsHallway, setUpstairsHallway] = useState(true);
  const [basementEnabled, setBasementEnabled] = useState(false);

  // Generated rooms (populated when transitioning to step 2)
  const [selectedRooms, setSelectedRooms] = useState<SelectedRoom[]>([]);

  // Task selection (Step 2)
  const [taskSelections, setTaskSelections] = useState<Record<string, boolean>>({});
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Custom room form
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customRoomType, setCustomRoomType] = useState<RoomType>(RoomType.General);
  const [customRooms, setCustomRooms] = useState<SelectedRoom[]>([]);

  // Per-room custom tasks (Step 2)
  const [roomCustomTasks, setRoomCustomTasks] = useState<Record<string, RoomTaskTemplate[]>>({});
  const [addingTaskForRoom, setAddingTaskForRoom] = useState<string | null>(null);
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskFreq, setNewTaskFreq] = useState<Frequency>(Frequency.Weekly);
  const [newTaskMinutes, setNewTaskMinutes] = useState(10);

  // Editable descriptions (Step 2)
  const [editedDescriptions, setEditedDescriptions] = useState<Record<string, string>>({});
  const [editingTaskKey, setEditingTaskKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const taskKey = (room: SelectedRoom | { roomType: RoomType; name: string; isCustom: boolean }, desc: string) =>
    `${room.roomType}::${room.name}::${desc}`;

  const roomKey = (room: SelectedRoom) => `${room.roomType}::${room.name}`;

  // Generate SelectedRoom[] from floor configuration
  const generateSelectedRooms = (): SelectedRoom[] => {
    const rooms: SelectedRoom[] = [];

    // Main floor rooms
    for (const { roomType } of MAIN_FLOOR_ROOMS) {
      if (mainFloorRooms.has(roomType)) {
        rooms.push({
          roomType,
          name: ROOM_TASK_CATALOG[roomType].defaultName,
          isCustom: false,
        });
      }
    }

    // Main floor bedrooms
    for (let i = 1; i <= mainFloorBedrooms; i++) {
      rooms.push({
        roomType: RoomType.Bedroom,
        name: mainFloorBedrooms === 1 ? 'Main Floor Bedroom' : `Main Floor Bedroom ${i}`,
        isCustom: false,
      });
    }

    // Main floor bathrooms
    for (let i = 1; i <= mainFloorBathrooms; i++) {
      const isHalf = i === 1 && mainFloorHalfBath;
      rooms.push({
        roomType: RoomType.Bathroom,
        name: isHalf ? 'Half Bath'
          : mainFloorBathrooms === 1 ? 'Main Floor Bathroom'
          : `Main Floor Bathroom ${i}`,
        isCustom: false,
      });
    }

    // Upstairs
    if (upstairsEnabled) {
      for (let i = 1; i <= upstairsBedrooms; i++) {
        rooms.push({
          roomType: RoomType.Bedroom,
          name: i === 1 ? 'Main Bedroom' : `Bedroom ${i}`,
          isCustom: false,
        });
      }

      for (let i = 1; i <= upstairsBathrooms; i++) {
        rooms.push({
          roomType: RoomType.Bathroom,
          name: upstairsBathrooms === 1 ? 'Upstairs Bathroom' : `Upstairs Bathroom ${i}`,
          isCustom: false,
        });
      }

      if (upstairsHallway) {
        rooms.push({
          roomType: RoomType.Hallway,
          name: 'Upstairs Hallway',
          isCustom: false,
        });
      }
    }

    // Basement
    if (basementEnabled) {
      rooms.push({
        roomType: RoomType.Basement,
        name: 'Basement',
        isCustom: false,
      });
    }

    // Custom rooms
    rooms.push(...customRooms);

    return rooms;
  };

  // Computed room count for step 1 preview
  const totalRoomCount = useMemo(() => {
    let count = mainFloorRooms.size + mainFloorBedrooms + mainFloorBathrooms;
    if (upstairsEnabled) {
      count += upstairsBedrooms + upstairsBathrooms;
      if (upstairsHallway) count++;
    }
    if (basementEnabled) count++;
    count += customRooms.length;
    return count;
  }, [mainFloorRooms, mainFloorBedrooms, mainFloorBathrooms, upstairsEnabled, upstairsBedrooms, upstairsBathrooms, upstairsHallway, basementEnabled, customRooms]);

  // Initialize task selections when moving to step 2
  const initializeTaskSelections = () => {
    const generated = generateSelectedRooms();
    setSelectedRooms(generated);

    const selections: Record<string, boolean> = {};
    for (const room of generated) {
      const catalog = ROOM_TASK_CATALOG[room.roomType];
      if (catalog) {
        for (const task of catalog.tasks) {
          // Pre-uncheck shower/tub task for half baths
          const isHalfBathShower = room.name === 'Half Bath' &&
            task.description.toLowerCase().includes('tub/shower');
          // Pre-uncheck cabinet fronts for half baths
          const isHalfBathCabinet = room.name === 'Half Bath' &&
            task.description.toLowerCase().includes('cabinet');
          selections[taskKey(room, task.description)] = !isHalfBathShower && !isHalfBathCabinet;
        }
      }
    }

    // Always include General/Whole House tasks
    const hasGeneral = generated.some(r => r.roomType === RoomType.General);
    if (!hasGeneral) {
      const general = ROOM_TASK_CATALOG[RoomType.General];
      for (const task of general.tasks) {
        selections[taskKey({ roomType: RoomType.General, name: general.defaultName, isCustom: false }, task.description)] = true;
      }
    }
    setTaskSelections(selections);

    // Expand all rooms by default
    const expanded = new Set<string>();
    for (const room of generated) {
      expanded.add(roomKey(room));
    }
    if (!hasGeneral) expanded.add(`${RoomType.General}::Whole House`);
    setExpandedRooms(expanded);
  };

  const toggleMainFloorRoom = (roomType: RoomType) => {
    setMainFloorRooms(prev => {
      const next = new Set(prev);
      if (next.has(roomType)) next.delete(roomType);
      else next.add(roomType);
      return next;
    });
  };

  const addCustomRoom = () => {
    if (!customName.trim()) return;
    setCustomRooms(prev => [...prev, {
      roomType: customRoomType,
      name: customName.trim(),
      isCustom: true,
    }]);
    setCustomName('');
    setCustomRoomType(RoomType.General);
    setShowCustomForm(false);
  };

  const removeCustomRoom = (name: string) => {
    setCustomRooms(prev => prev.filter(r => r.name !== name));
  };

  const toggleTask = (key: string) => {
    setTaskSelections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleExpandRoom = (key: string) => {
    setExpandedRooms(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Add a custom task to a room
  const addCustomTask = (rKey: string) => {
    if (!newTaskDesc.trim()) return;
    const task: RoomTaskTemplate = {
      description: newTaskDesc.trim(),
      frequency: newTaskFreq,
      estimatedMinutes: newTaskMinutes,
      priority: 'Medium',
    };
    setRoomCustomTasks(prev => ({
      ...prev,
      [rKey]: [...(prev[rKey] || []), task],
    }));
    // Auto-enable in selections
    const [roomType, roomName] = rKey.split('::');
    const key = taskKey({ roomType: roomType as RoomType, name: roomName, isCustom: false }, task.description);
    setTaskSelections(prev => ({ ...prev, [key]: true }));
    // Reset form
    setNewTaskDesc('');
    setNewTaskFreq(Frequency.Weekly);
    setNewTaskMinutes(10);
    setAddingTaskForRoom(null);
  };

  // Remove a custom task from a room
  const removeCustomTask = (rKey: string, desc: string) => {
    setRoomCustomTasks(prev => ({
      ...prev,
      [rKey]: (prev[rKey] || []).filter(t => t.description !== desc),
    }));
    const [roomType, roomName] = rKey.split('::');
    const key = taskKey({ roomType: roomType as RoomType, name: roomName, isCustom: false }, desc);
    setTaskSelections(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Start editing a task description
  const startEditing = (key: string, currentDesc: string) => {
    setEditingTaskKey(key);
    setEditingValue(editedDescriptions[key] || currentDesc);
  };

  // Commit an edited description
  const commitEdit = (key: string, originalDesc: string) => {
    const trimmed = editingValue.trim();
    if (trimmed && trimmed !== originalDesc) {
      setEditedDescriptions(prev => ({ ...prev, [key]: trimmed }));
    } else if (trimmed === originalDesc) {
      // Reverted to original — remove override
      setEditedDescriptions(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    setEditingTaskKey(null);
  };

  // Get all tasks for a room (catalog + custom)
  const getAllTasksForRoom = (room: SelectedRoom, rKey: string) => {
    const catalog = ROOM_TASK_CATALOG[room.roomType];
    const catalogTasks = catalog ? catalog.tasks : [];
    const custom = roomCustomTasks[rKey] || [];
    return { catalogTasks, customTasks: custom };
  };

  // Compute summary stats
  const summary = useMemo(() => {
    const selected = Object.entries(taskSelections).filter(([, v]) => v);
    let weeklyMinutes = 0;

    const addMinutes = (freq: Frequency, mins: number) => {
      switch (freq) {
        case Frequency.Daily: weeklyMinutes += mins * 7; break;
        case Frequency.Weekly: weeklyMinutes += mins; break;
        case Frequency.BiWeekly: weeklyMinutes += mins / 2; break;
        case Frequency.Monthly: weeklyMinutes += mins / 4; break;
        case Frequency.Quarterly: weeklyMinutes += mins / 13; break;
      }
    };

    for (const [key] of selected) {
      const [roomType, roomName, desc] = key.split('::');
      const rKey = `${roomType}::${roomName}`;
      // Check custom tasks first
      const custom = roomCustomTasks[rKey];
      const customTask = custom?.find(t => t.description === desc);
      if (customTask) {
        addMinutes(customTask.frequency, customTask.estimatedMinutes);
        continue;
      }
      // Then catalog tasks
      const catalog = ROOM_TASK_CATALOG[roomType as RoomType];
      if (catalog) {
        const task = catalog.tasks.find(t => t.description === desc);
        if (task) addMinutes(task.frequency, task.estimatedMinutes);
      }
    }
    return {
      taskCount: selected.length,
      roomCount: selectedRooms.length,
      weeklyHours: Math.round(weeklyMinutes / 60 * 10) / 10,
    };
  }, [taskSelections, selectedRooms, roomCustomTasks]);

  const buildTasks = (roomIdMap: Map<string, string>): Task[] => {
    const today = getToday();
    const tasks: Task[] = [];
    let counter = 0;

    // Gather all rooms to process (selected + General if not explicitly selected)
    const roomsToProcess = [...selectedRooms];
    const hasGeneral = selectedRooms.some(r => r.roomType === RoomType.General);
    if (!hasGeneral) {
      roomsToProcess.push({ roomType: RoomType.General, name: 'Whole House', isCustom: false });
    }

    for (const room of roomsToProcess) {
      const catalog = ROOM_TASK_CATALOG[room.roomType];
      if (!catalog) continue;

      const rKey = roomKey(room);
      const roomId = roomIdMap.get(rKey);
      if (!roomId) {
        console.warn(`No roomId found for ${rKey}`);
        continue;
      }

      // Catalog tasks (with optional edited descriptions)
      for (const tmpl of catalog.tasks) {
        const key = taskKey(room, tmpl.description);
        if (!taskSelections[key]) continue;

        counter++;
        const id = `task-${Date.now()}-${counter}-${Math.random().toString(36).substring(2, 9)}`;
        const scheduledDay = tmpl.frequency === Frequency.Monthly || tmpl.frequency === Frequency.Quarterly
          ? ((counter * 7) % 28) + 1
          : undefined;
        const anchorDate = tmpl.frequency === Frequency.BiWeekly || tmpl.frequency === Frequency.Quarterly
          ? today : undefined;

        tasks.push({
          id,
          roomId,
          room: room.name,
          roomType: room.roomType,
          description: editedDescriptions[key] || tmpl.description,
          frequency: tmpl.frequency,
          estimatedMinutes: tmpl.estimatedMinutes,
          priority: tmpl.priority,
          scheduledDay,
          anchorDate,
          completedDates: [],
          nextDueDate: today,
          isDue: false,
        });
      }

      // Custom tasks added per room
      const custom = roomCustomTasks[rKey] || [];
      for (const tmpl of custom) {
        const key = taskKey(room, tmpl.description);
        if (!taskSelections[key]) continue;

        counter++;
        const id = `task-${Date.now()}-${counter}-${Math.random().toString(36).substring(2, 9)}`;
        const scheduledDay = tmpl.frequency === Frequency.Monthly || tmpl.frequency === Frequency.Quarterly
          ? ((counter * 7) % 28) + 1
          : undefined;
        const anchorDate = tmpl.frequency === Frequency.BiWeekly || tmpl.frequency === Frequency.Quarterly
          ? today : undefined;

        tasks.push({
          id,
          roomId,
          room: room.name,
          roomType: room.roomType,
          description: tmpl.description,
          frequency: tmpl.frequency,
          estimatedMinutes: tmpl.estimatedMinutes,
          priority: tmpl.priority,
          scheduledDay,
          anchorDate,
          completedDates: [],
          nextDueDate: today,
          isDue: false,
        });
      }
    }

    // Run optimizer for weekly/bi-weekly tasks
    const assignments = optimizeWeeklySchedule(tasks);
    for (const { taskId, scheduledDay } of assignments) {
      const task = tasks.find(t => t.id === taskId);
      if (task) task.scheduledDay = scheduledDay;
    }

    // Compute nextDueDate and isDue
    for (const task of tasks) {
      task.nextDueDate = getNextOccurrence(task, today);
      task.isDue = isTaskDueOnDate(task, today);
    }

    return tasks;
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      // Step 1: Create all Room documents first
      const roomsToProcess = [...selectedRooms];
      const hasGeneral = selectedRooms.some(r => r.roomType === RoomType.General);
      if (!hasGeneral) {
        roomsToProcess.push({ roomType: RoomType.General, name: 'Whole House', isCustom: false });
      }

      const roomIdMap = new Map<string, string>();

      for (const room of roomsToProcess) {
        const catalog = ROOM_TASK_CATALOG[room.roomType];
        if (!catalog) continue;

        // Create Room document
        const createdRoom = await roomService.createRoom(
          householdId,
          room.name,
          room.roomType,
          catalog.icon
        );

        const rKey = roomKey(room);
        roomIdMap.set(rKey, createdRoom.id);
      }

      // Step 2: Build tasks with proper roomIds
      const tasks = buildTasks(roomIdMap);

      // Step 3: Save tasks
      await onComplete(tasks);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      alert('Failed to save tasks. Please try again.');
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      // Create Room documents for FALLBACK_TASKS
      const fallbackRoomNames = new Set<string>();
      const fallbackRoomTypes = new Map<string, RoomType>();

      for (const task of FALLBACK_TASKS) {
        if (!fallbackRoomNames.has(task.room)) {
          fallbackRoomNames.add(task.room);
          fallbackRoomTypes.set(task.room, task.roomType);
        }
      }

      const roomIdMap = new Map<string, string>();

      // Create Room documents
      for (const roomName of fallbackRoomNames) {
        const roomType = fallbackRoomTypes.get(roomName)!;
        const catalog = ROOM_TASK_CATALOG[roomType];

        const createdRoom = await roomService.createRoom(
          householdId,
          roomName,
          roomType,
          catalog?.icon || 'Home'
        );
        roomIdMap.set(roomName, createdRoom.id);
      }

      // Update FALLBACK_TASKS with proper roomIds
      const tasksWithRoomIds: Task[] = FALLBACK_TASKS.map(task => ({
        ...task,
        roomId: roomIdMap.get(task.room) || '',
      }));

      await onComplete(tasksWithRoomIds);
    } catch (error) {
      console.error('Failed to skip onboarding:', error);
      alert('Failed to set up defaults. Please try again.');
      setSaving(false);
    }
  };

  // Get rooms to display in step 2 (selected + General if not selected)
  const reviewRooms = useMemo(() => {
    const rooms = [...selectedRooms];
    const hasGeneral = selectedRooms.some(r => r.roomType === RoomType.General);
    if (!hasGeneral) {
      rooms.push({ roomType: RoomType.General, name: 'Whole House', isCustom: false });
    }
    return rooms;
  }, [selectedRooms]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/50 rounded-xl flex items-center justify-center">
              <Sparkles className="text-teal-600 dark:text-teal-400" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Set Up Your Home</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {step === 1 && 'Configure your floors, bedrooms, and bathrooms'}
                {step === 2 && 'Review recommended tasks for each room'}
                {step === 3 && 'Ready to get started!'}
              </p>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-2 justify-center">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-2 rounded-full transition-all duration-300 ${
                s === step ? 'w-8 bg-teal-600' : s < step ? 'w-2 bg-teal-400' : 'w-2 bg-slate-200 dark:bg-slate-600'
              }`} />
            ))}
          </div>
        </div>

        {/* Content (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* Step 1: Floor-based Room Configuration */}
          {step === 1 && (
            <div className="space-y-4">

              {/* Main Floor */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Home size={18} className="text-teal-600" />
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">Main Floor</h3>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {MAIN_FLOOR_ROOMS.map(({ roomType, icon }) => {
                    const selected = mainFloorRooms.has(roomType);
                    const Icon = ICON_MAP[icon] || Home;
                    return (
                      <button
                        key={roomType}
                        onClick={() => toggleMainFloorRoom(roomType)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                          selected
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-400'
                            : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <Icon size={14} className={selected ? 'text-teal-600' : 'text-slate-400'} />
                        {ROOM_TASK_CATALOG[roomType].defaultName}
                        {selected && <Check size={12} className="text-teal-600 ml-0.5" />}
                      </button>
                    );
                  })}

                </div>

                <div className="space-y-3 pt-1">
                  <Counter
                    label="Bedrooms"
                    value={mainFloorBedrooms}
                    min={0}
                    max={4}
                    onChange={setMainFloorBedrooms}
                  />
                  <Counter
                    label="Bathrooms"
                    value={mainFloorBathrooms}
                    min={0}
                    max={3}
                    onChange={setMainFloorBathrooms}
                  />
                  {mainFloorBathrooms >= 1 && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mainFloorHalfBath}
                        onChange={e => setMainFloorHalfBath(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm text-slate-600">First bathroom is a half bath</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Upstairs */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ArrowUp size={18} className={upstairsEnabled ? 'text-teal-600' : 'text-slate-400'} />
                    <h3 className={`font-semibold ${upstairsEnabled ? 'text-slate-800' : 'text-slate-400'}`}>Upstairs</h3>
                  </div>
                  <ToggleSwitch enabled={upstairsEnabled} onChange={setUpstairsEnabled} />
                </div>

                {upstairsEnabled && (
                  <div className="space-y-3 pt-1">
                    <Counter
                      label="Bedrooms"
                      value={upstairsBedrooms}
                      min={1}
                      max={6}
                      onChange={setUpstairsBedrooms}
                    />
                    <Counter
                      label="Bathrooms"
                      value={upstairsBathrooms}
                      min={1}
                      max={4}
                      onChange={setUpstairsBathrooms}
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={upstairsHallway}
                        onChange={e => setUpstairsHallway(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Hallway</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Basement */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowDownToLine size={18} className={basementEnabled ? 'text-teal-600' : 'text-slate-400'} />
                    <h3 className={`font-semibold ${basementEnabled ? 'text-slate-800' : 'text-slate-400'}`}>Basement</h3>
                  </div>
                  <ToggleSwitch enabled={basementEnabled} onChange={setBasementEnabled} />
                </div>
              </div>

              {/* Custom rooms */}
              {customRooms.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Custom Rooms</h4>
                  <div className="flex flex-wrap gap-2">
                    {customRooms.map(room => (
                      <div key={room.name} className="flex items-center gap-1 bg-teal-50 border border-teal-200 rounded-lg px-3 py-1.5">
                        <span className="text-sm text-teal-800">{room.name}</span>
                        <button onClick={() => removeCustomRoom(room.name)} className="text-teal-400 hover:text-teal-600">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add custom room */}
              {!showCustomForm ? (
                <button
                  onClick={() => setShowCustomForm(true)}
                  className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  <Plus size={16} />
                  Add Custom Room
                </button>
              ) : (
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={customName}
                      onChange={e => setCustomName(e.target.value)}
                      placeholder="Room name (e.g. Laundry Room)"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      onKeyDown={e => e.key === 'Enter' && addCustomRoom()}
                      autoFocus
                    />
                    <select
                      value={customRoomType}
                      onChange={e => setCustomRoomType(e.target.value as RoomType)}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {Object.values(RoomType).map(rt => (
                        <option key={rt} value={rt}>{rt}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addCustomRoom} disabled={!customName.trim()} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50">
                      Add
                    </button>
                    <button onClick={() => { setShowCustomForm(false); setCustomName(''); }} className="px-3 py-1.5 text-slate-600 hover:text-slate-800 text-sm">
                      Cancel
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Pick a room type to get suggested tasks for this room.</p>
                </div>
              )}

              {/* Room count preview */}
              <div className="text-center text-sm text-slate-400 pt-2">
                {totalRoomCount} rooms configured
              </div>
            </div>
          )}

          {/* Step 2: Task Review */}
          {step === 2 && (
            <div className="space-y-2">
              {reviewRooms.map(room => {
                const catalog = ROOM_TASK_CATALOG[room.roomType];
                if (!catalog) return null;
                const rKey = roomKey(room);
                const expanded = expandedRooms.has(rKey);
                const Icon = ICON_MAP[catalog.icon] || Home;
                const { catalogTasks, customTasks: customTasksForRoom } = getAllTasksForRoom(room, rKey);
                const totalTasks = catalogTasks.length + customTasksForRoom.length;
                const checkedCount = catalogTasks.filter(t => taskSelections[taskKey(room, t.description)]).length
                  + customTasksForRoom.filter(t => taskSelections[taskKey(room, t.description)]).length;

                return (
                  <div key={rKey} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleExpandRoom(rKey)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      {expanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                      <Icon size={18} className="text-teal-600" />
                      <span className="font-medium text-slate-800 dark:text-slate-200 flex-1 text-left">{room.name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{checkedCount}/{totalTasks} tasks</span>
                    </button>

                    {expanded && (
                      <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                        {/* Catalog tasks (editable descriptions) */}
                        {catalogTasks.map(task => {
                          const key = taskKey(room, task.description);
                          const checked = taskSelections[key] ?? false;
                          const isEditing = editingTaskKey === key;
                          const displayDesc = editedDescriptions[key] || task.description;

                          return (
                            <div
                              key={key}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-100 transition-colors group"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleTask(key)}
                                className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                              />
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={e => setEditingValue(e.target.value)}
                                  onBlur={() => commitEdit(key, task.description)}
                                  onKeyDown={e => { if (e.key === 'Enter') commitEdit(key, task.description); if (e.key === 'Escape') setEditingTaskKey(null); }}
                                  className="flex-1 text-sm px-2 py-1 border border-teal-400 rounded bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  autoFocus
                                />
                              ) : (
                                <span
                                  onClick={() => startEditing(key, task.description)}
                                  className={`flex-1 text-sm cursor-pointer ${checked ? 'text-slate-800' : 'text-slate-400 line-through'} ${editedDescriptions[key] ? 'italic' : ''}`}
                                  title="Click to edit"
                                >
                                  {displayDesc}
                                  <Pencil size={12} className="inline ml-1.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </span>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${FREQ_COLORS[task.frequency] || 'bg-slate-100 text-slate-600'}`}>
                                {task.frequency}
                              </span>
                              <span className="text-xs text-slate-400 whitespace-nowrap">{task.estimatedMinutes}m</span>
                            </div>
                          );
                        })}

                        {/* Custom tasks for this room */}
                        {customTasksForRoom.map(task => {
                          const key = taskKey(room, task.description);
                          const checked = taskSelections[key] ?? false;
                          return (
                            <div
                              key={key}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-100 transition-colors group"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleTask(key)}
                                className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                              />
                              <span className={`flex-1 text-sm ${checked ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                                {task.description}
                                <span className="ml-1.5 text-[10px] text-teal-500 font-medium">CUSTOM</span>
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${FREQ_COLORS[task.frequency] || 'bg-slate-100 text-slate-600'}`}>
                                {task.frequency}
                              </span>
                              <span className="text-xs text-slate-400 whitespace-nowrap">{task.estimatedMinutes}m</span>
                              <button
                                onClick={() => removeCustomTask(rKey, task.description)}
                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                title="Remove task"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })}

                        {/* Add task form */}
                        {addingTaskForRoom === rKey ? (
                          <div className="px-4 py-3 border-t border-slate-100 bg-white">
                            <input
                              type="text"
                              value={newTaskDesc}
                              onChange={e => setNewTaskDesc(e.target.value)}
                              placeholder="Task description (e.g. Wipe down leather furniture)"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 mb-2"
                              onKeyDown={e => { if (e.key === 'Enter' && newTaskDesc.trim()) addCustomTask(rKey); }}
                              autoFocus
                            />
                            <div className="flex items-center gap-2">
                              <select
                                value={newTaskFreq}
                                onChange={e => setNewTaskFreq(e.target.value as Frequency)}
                                className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                              >
                                {Object.values(Frequency).map(f => (
                                  <option key={f} value={f}>{f}</option>
                                ))}
                              </select>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={newTaskMinutes}
                                  onChange={e => setNewTaskMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  min={1}
                                  max={120}
                                />
                                <span className="text-xs text-slate-500">min</span>
                              </div>
                              <div className="flex-1" />
                              <button
                                onClick={() => addCustomTask(rKey)}
                                disabled={!newTaskDesc.trim()}
                                className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
                              >
                                Add
                              </button>
                              <button
                                onClick={() => { setAddingTaskForRoom(null); setNewTaskDesc(''); }}
                                className="px-3 py-1.5 text-slate-500 hover:text-slate-700 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAddingTaskForRoom(rKey); setNewTaskDesc(''); setNewTaskFreq(Frequency.Weekly); setNewTaskMinutes(10); }}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-teal-600 hover:text-teal-700 hover:bg-slate-100 w-full transition-colors border-t border-slate-100"
                          >
                            <Plus size={14} />
                            Add task
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-teal-600" size={28} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">You're all set!</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">Here's a summary of your cleaning schedule.</p>

              <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-8">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-teal-600">{summary.roomCount}</p>
                  <p className="text-xs text-slate-500 mt-1">Rooms</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-teal-600">{summary.taskCount}</p>
                  <p className="text-xs text-slate-500 mt-1">Tasks</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-teal-600">{summary.weeklyHours}h</p>
                  <p className="text-xs text-slate-500 mt-1">Per Week</p>
                </div>
              </div>

              <p className="text-sm text-slate-400">
                Tasks will be automatically scheduled across the week. You can always adjust later.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
          {step === 2 && (
            <div className="text-center text-sm text-slate-500 mb-3">
              {summary.taskCount} tasks selected &middot; ~{summary.weeklyHours} hrs/week
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              {step === 1 && (
                <button onClick={handleSkip} disabled={saving} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
                  {saving ? 'Setting up...' : 'Skip \u2014 use defaults'}
                </button>
              )}
              {step > 1 && (
                <button onClick={() => setStep(step - 1)} className="text-sm text-slate-600 hover:text-slate-800 font-medium">
                  Back
                </button>
              )}
            </div>

            <div>
              {step === 1 && (
                <button
                  onClick={() => { initializeTaskSelections(); setStep(2); }}
                  disabled={totalRoomCount === 0}
                  className="px-6 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Review Tasks
                </button>
              )}
              {step === 2 && (
                <button
                  onClick={() => setStep(3)}
                  disabled={summary.taskCount === 0}
                  className="px-6 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              )}
              {step === 3 && (
                <button
                  onClick={handleComplete}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    'Get Started'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default OnboardingWizard;
