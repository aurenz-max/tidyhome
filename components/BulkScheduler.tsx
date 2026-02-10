import React, { useState, useMemo } from 'react';
import { Task, Frequency, Room } from '../types';
import { X, Calendar, Users, Save, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { useHousehold } from '../contexts/HouseholdContext';
import { useRooms } from '../contexts/RoomsContext';

interface BulkSchedulerProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onSaveBulkChanges: (updates: Map<string, { scheduledDay?: number; assignedTo?: string }>) => Promise<void>;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface RoomSchedule {
  roomId: string;
  roomName: string;
  tasks: Task[];
  weeklyTasks: Task[];
  monthlyTasks: Task[];
}

const BulkScheduler: React.FC<BulkSchedulerProps> = ({
  isOpen,
  onClose,
  tasks,
  onSaveBulkChanges,
}) => {
  const { members } = useHousehold();
  const { rooms, getRoomById } = useRooms();
  const [pendingChanges, setPendingChanges] = useState<Map<string, { scheduledDay?: number; assignedTo?: string }>>(new Map());
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Group tasks by room
  const roomSchedules = useMemo((): RoomSchedule[] => {
    const grouped = new Map<string, Task[]>();

    tasks.forEach(task => {
      const roomId = task.roomId || 'general';
      if (!grouped.has(roomId)) {
        grouped.set(roomId, []);
      }
      grouped.get(roomId)!.push(task);
    });

    return Array.from(grouped.entries()).map(([roomId, roomTasks]) => {
      const room = getRoomById(roomId);
      const roomName = room?.name || roomTasks[0]?.room || 'General';

      const weeklyTasks = roomTasks.filter(t =>
        t.frequency === Frequency.Weekly || t.frequency === Frequency.BiWeekly
      );

      const monthlyTasks = roomTasks.filter(t =>
        t.frequency === Frequency.Monthly || t.frequency === Frequency.Quarterly
      );

      return {
        roomId,
        roomName,
        tasks: roomTasks,
        weeklyTasks,
        monthlyTasks,
      };
    }).sort((a, b) => a.roomName.localeCompare(b.roomName));
  }, [tasks, getRoomById]);

  // Calculate workload by day
  const workloadByDay = useMemo(() => {
    const workload = new Map<number, { minutes: number; tasks: number; rooms: Set<string> }>();

    for (let i = 0; i < 7; i++) {
      workload.set(i, { minutes: 0, tasks: 0, rooms: new Set() });
    }

    tasks.forEach(task => {
      const change = pendingChanges.get(task.id);
      const scheduledDay = change?.scheduledDay ?? task.scheduledDay;

      if (scheduledDay !== undefined && (task.frequency === Frequency.Weekly || task.frequency === Frequency.BiWeekly)) {
        const day = workload.get(scheduledDay)!;
        day.minutes += task.estimatedMinutes;
        day.tasks += 1;
        day.rooms.add(getRoomById(task.roomId)?.name || task.room);
      }
    });

    return workload;
  }, [tasks, pendingChanges, getRoomById]);

  const maxWorkload = Math.max(...Array.from(workloadByDay.values()).map(w => w.minutes), 1);

  const toggleRoomExpanded = (roomId: string) => {
    const newExpanded = new Set(expandedRooms);
    if (newExpanded.has(roomId)) {
      newExpanded.delete(roomId);
    } else {
      newExpanded.add(roomId);
    }
    setExpandedRooms(newExpanded);
  };

  const getTaskScheduledDay = (task: Task): number | undefined => {
    const change = pendingChanges.get(task.id);
    return change?.scheduledDay ?? task.scheduledDay;
  };

  const getTaskAssignee = (task: Task): string => {
    const change = pendingChanges.get(task.id);
    return change?.assignedTo ?? task.assignedTo ?? '';
  };

  const updateTaskSchedule = (taskId: string, scheduledDay: number | undefined) => {
    const newChanges = new Map(pendingChanges);
    const existing = newChanges.get(taskId) || {};
    newChanges.set(taskId, { ...existing, scheduledDay });
    setPendingChanges(newChanges);
  };

  const updateTaskAssignee = (taskId: string, assignedTo: string) => {
    const newChanges = new Map(pendingChanges);
    const existing = newChanges.get(taskId) || {};
    newChanges.set(taskId, { ...existing, assignedTo: assignedTo || undefined });
    setPendingChanges(newChanges);
  };

  const bulkAssignRoomToDay = (roomSchedule: RoomSchedule, dayIndex: number) => {
    const newChanges = new Map(pendingChanges);
    roomSchedule.weeklyTasks.forEach(task => {
      const existing = newChanges.get(task.id) || {};
      newChanges.set(task.id, { ...existing, scheduledDay: dayIndex });
    });
    setPendingChanges(newChanges);
  };

  const bulkAssignRoomToMember = (roomSchedule: RoomSchedule, memberUid: string) => {
    const newChanges = new Map(pendingChanges);
    roomSchedule.tasks.forEach(task => {
      const existing = newChanges.get(task.id) || {};
      newChanges.set(task.id, { ...existing, assignedTo: memberUid || undefined });
    });
    setPendingChanges(newChanges);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveBulkChanges(pendingChanges);
      setPendingChanges(new Map());
      onClose();
    } catch (error) {
      console.error('Failed to save bulk changes:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPendingChanges(new Map());
  };

  if (!isOpen) return null;

  const hasChanges = pendingChanges.size > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="text-teal-600" size={28} />
              Bulk Task Scheduler
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Quickly assign tasks to days and household members
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Room-based scheduling */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Schedule by Room
                </h3>
                {hasChanges && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-teal-600 font-medium">
                      {pendingChanges.size} changes pending
                    </span>
                    <button
                      onClick={handleReset}
                      className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
                    >
                      <RefreshCw size={14} />
                      Reset
                    </button>
                  </div>
                )}
              </div>

              {roomSchedules.map(roomSchedule => {
                const isExpanded = expandedRooms.has(roomSchedule.roomId);

                return (
                  <div
                    key={roomSchedule.roomId}
                    className="border border-slate-200 rounded-lg bg-white overflow-hidden"
                  >
                    {/* Room Header */}
                    <div className="bg-slate-50 p-4 border-b border-slate-200">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => toggleRoomExpanded(roomSchedule.roomId)}
                          className="flex items-center gap-2 flex-1 text-left"
                        >
                          {isExpanded ? (
                            <ChevronDown size={20} className="text-slate-400" />
                          ) : (
                            <ChevronRight size={20} className="text-slate-400" />
                          )}
                          <h4 className="font-semibold text-slate-900">
                            {roomSchedule.roomName}
                          </h4>
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                            {roomSchedule.tasks.length} tasks
                          </span>
                        </button>
                      </div>

                      {/* Quick Room Actions */}
                      {roomSchedule.weeklyTasks.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="text-xs text-slate-600 font-medium self-center">
                            Assign all weekly to:
                          </span>
                          {DAY_SHORT.slice(1, 7).map((day, idx) => (
                            <button
                              key={idx + 1}
                              onClick={() => bulkAssignRoomToDay(roomSchedule, idx + 1)}
                              className="px-3 py-1 text-xs font-medium bg-white border border-slate-300 rounded hover:bg-teal-50 hover:border-teal-500 hover:text-teal-700 transition-colors"
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      )}

                      {members.length > 1 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="text-xs text-slate-600 font-medium self-center">
                            Assign all to:
                          </span>
                          {members.map(member => (
                            <button
                              key={member.uid}
                              onClick={() => bulkAssignRoomToMember(roomSchedule, member.uid)}
                              className="px-3 py-1 text-xs font-medium bg-white border border-slate-300 rounded hover:bg-indigo-50 hover:border-indigo-500 hover:text-indigo-700 transition-colors"
                            >
                              {member.displayName}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Task List */}
                    {isExpanded && (
                      <div className="p-4 space-y-2">
                        {roomSchedule.tasks.map(task => {
                          const scheduledDay = getTaskScheduledDay(task);
                          const assignee = getTaskAssignee(task);
                          const isWeeklyOrBiWeekly = task.frequency === Frequency.Weekly || task.frequency === Frequency.BiWeekly;
                          const isMonthlyOrQuarterly = task.frequency === Frequency.Monthly || task.frequency === Frequency.Quarterly;

                          return (
                            <div
                              key={task.id}
                              className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {task.description}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {task.frequency} • {task.estimatedMinutes}min
                                </p>
                              </div>

                              {/* Day Selector */}
                              {isWeeklyOrBiWeekly && (
                                <div className="flex-shrink-0">
                                  <select
                                    value={scheduledDay ?? ''}
                                    onChange={(e) => updateTaskSchedule(task.id, e.target.value ? parseInt(e.target.value) : undefined)}
                                    className="text-sm px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                                  >
                                    <option value="">No day set</option>
                                    {DAY_NAMES.map((day, idx) => (
                                      <option key={idx} value={idx}>
                                        {day}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {isMonthlyOrQuarterly && (
                                <div className="flex-shrink-0">
                                  <input
                                    type="number"
                                    min="1"
                                    max="31"
                                    value={scheduledDay ?? ''}
                                    onChange={(e) => updateTaskSchedule(task.id, e.target.value ? parseInt(e.target.value) : undefined)}
                                    placeholder="Day"
                                    className="w-20 text-sm px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  />
                                </div>
                              )}

                              {/* Member Selector */}
                              {members.length > 1 && (
                                <div className="flex-shrink-0">
                                  <select
                                    value={assignee}
                                    onChange={(e) => updateTaskAssignee(task.id, e.target.value)}
                                    className="text-sm px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                  >
                                    <option value="">Everyone</option>
                                    {members.map(member => (
                                      <option key={member.uid} value={member.uid}>
                                        {member.displayName}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right: Weekly workload visualization */}
            <div className="lg:col-span-1">
              <div className="sticky top-0">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Weekly Workload
                </h3>
                <div className="space-y-3">
                  {Array.from(workloadByDay.entries()).map(([dayIndex, workload]) => {
                    const barHeight = (workload.minutes / maxWorkload) * 100;
                    const rooms = Array.from(workload.rooms);

                    return (
                      <div key={dayIndex} className="bg-white rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {DAY_NAMES[dayIndex]}
                          </span>
                          <span className="text-xs text-slate-600 font-medium">
                            {workload.minutes}min
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                          <div
                            className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${barHeight}%` }}
                          />
                        </div>

                        <div className="text-xs text-slate-600">
                          {workload.tasks} {workload.tasks === 1 ? 'task' : 'tasks'}
                          {rooms.length > 0 && (
                            <div className="mt-1 text-[10px] text-slate-500">
                              {rooms.slice(0, 2).join(', ')}
                              {rooms.length > 2 && ` +${rooms.length - 2} more`}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary */}
                <div className="mt-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-teal-900 mb-2">
                    Schedule Summary
                  </h4>
                  <div className="space-y-1 text-xs text-teal-800">
                    <div className="flex justify-between">
                      <span>Total weekly tasks:</span>
                      <span className="font-medium">
                        {tasks.filter(t => t.frequency === Frequency.Weekly || t.frequency === Frequency.BiWeekly).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg per day:</span>
                      <span className="font-medium">
                        {Math.round(Array.from(workloadByDay.values()).reduce((sum, w) => sum + w.minutes, 0) / 7)}min
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 p-6 bg-slate-50 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Changes ({pendingChanges.size})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkScheduler;
