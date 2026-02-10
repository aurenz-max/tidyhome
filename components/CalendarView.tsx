import React, { useMemo, useState } from 'react';
import { Task } from '../types';
import { isTaskDueOnDate, isOccurrenceCompleted, getToday, addDays } from '../utils/recurrence';
import { Calendar, Clock, CheckCircle2, Circle, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useHousehold } from '../contexts/HouseholdContext';
import { useRooms } from '../contexts/RoomsContext';

interface CalendarViewProps {
  tasks: Task[];
  onToggleTask: (taskId: string, date: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onToggleTask }) => {
  const { members, getMemberByUid } = useHousehold();
  const { getRoomById } = useRooms();
  const showAssignees = members.length > 1;
  const today = getToday();

  // Helper to get room name from task
  const getRoomName = (task: Task): string => {
    if (task.roomId) {
      const room = getRoomById(task.roomId);
      return room?.name || task.room || 'General';
    }
    return task.room || 'General';
  };

  // Track collapsed groups: "YYYY-MM-DD::RoomName"
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (date: string, room: string) => {
    const key = `${date}::${room}`;
    const newSet = new Set(collapsedGroups);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setCollapsedGroups(newSet);
  };

  // Generate task instances for each day using the recurrence engine
  const calendarDays = useMemo(() => {
    const days: { date: string; tasks: Task[] }[] = [];

    for (let i = 0; i < 7; i++) {
      const dateStr = addDays(today, i);
      // Find all tasks that have an occurrence on this date
      const dayTasks = tasks.filter(task => isTaskDueOnDate(task, dateStr));
      days.push({ date: dateStr, tasks: dayTasks });
    }

    return days;
  }, [tasks, today]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (dateStr === today) return `Today, ${monthDay}`;

    const tomorrow = addDays(today, 1);
    if (dateStr === tomorrow) return `Tomorrow, ${monthDay}`;

    return `${dayName}, ${monthDay}`;
  };

  return (
    <div className="space-y-8">
        {calendarDays.map(({ date, tasks: dayTasks }) => {
            const totalMinutes = dayTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);

            // Group tasks by Room for this specific date
            const tasksByRoom = dayTasks.reduce((acc, task) => {
                const roomName = getRoomName(task);
                if (!acc[roomName]) acc[roomName] = [];
                acc[roomName].push(task);
                return acc;
            }, {} as Record<string, Task[]>);

            const sortedRooms = Object.keys(tasksByRoom).sort();

            return (
                <div key={date} className="animate-fade-in">
                    {/* Date Header */}
                    <div className="flex justify-between items-center mb-4 sticky top-16 bg-slate-50 z-10 py-2 border-b border-slate-200">
                        <div className="flex items-center">
                            <Calendar size={20} className="text-teal-600 mr-2" />
                            <h3 className="text-lg font-bold text-slate-800">{formatDate(date)}</h3>
                        </div>
                        {dayTasks.length > 0 && (
                            <span className={`text-xs font-medium px-2 py-1 rounded-full border ${
                                totalMinutes > 60 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-200 text-slate-600 border-slate-300'
                            }`}>
                                {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m total
                            </span>
                        )}
                    </div>

                    <div className="space-y-3">
                        {dayTasks.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
                                <p className="text-slate-400 italic">No tasks scheduled. Enjoy your day!</p>
                            </div>
                        ) : (
                            sortedRooms.map(room => {
                                const roomTasks = tasksByRoom[room];
                                const isCollapsed = collapsedGroups.has(`${date}::${room}`);
                                const roomTotalMinutes = roomTasks.reduce((acc, t) => acc + t.estimatedMinutes, 0);
                                const completedCount = roomTasks.filter(t => isOccurrenceCompleted(t, date)).length;
                                const isAllDone = completedCount === roomTasks.length;

                                return (
                                    <div
                                        key={`${date}-${room}`}
                                        className={`bg-white rounded-lg shadow-sm border overflow-hidden transition-all duration-200 ${
                                            isAllDone ? 'border-slate-100' : 'border-slate-200'
                                        }`}
                                    >
                                        {/* Collapsible Header */}
                                        <button
                                            onClick={() => toggleGroup(date, room)}
                                            className={`w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors ${
                                                isCollapsed ? '' : 'border-b border-slate-100'
                                            }`}
                                        >
                                            <div className="flex items-center">
                                                {isCollapsed ? <ChevronRight size={18} className="text-slate-400 mr-2" /> : <ChevronDown size={18} className="text-slate-400 mr-2" />}
                                                <h4 className={`font-semibold text-sm ${isAllDone ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                                    {room}
                                                </h4>
                                                <span className="ml-2 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                                    {roomTasks.length}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {roomTotalMinutes} min
                                            </div>
                                        </button>

                                        {/* Task List Body */}
                                        {!isCollapsed && (
                                            <div className="bg-white">
                                                {roomTasks.map((task, index) => {
                                                    const completed = isOccurrenceCompleted(task, date);
                                                    return (
                                                        <div
                                                            key={task.id}
                                                            className={`group flex items-center px-4 py-3 hover:bg-slate-50 transition-colors ${
                                                                index !== roomTasks.length - 1 ? 'border-b border-slate-50' : ''
                                                            }`}
                                                        >
                                                            <button
                                                                onClick={() => onToggleTask(task.id, date)}
                                                                className={`flex-shrink-0 mr-3 transition-colors ${
                                                                    completed ? 'text-teal-500' : 'text-slate-300 hover:text-teal-500'
                                                                }`}
                                                            >
                                                                {completed ? <CheckCircle2 size={20} /> : <Circle size={20} strokeWidth={2} />}
                                                            </button>

                                                            {showAssignees && task.assignedTo && (() => {
                                                              const member = getMemberByUid(task.assignedTo);
                                                              if (!member) return null;
                                                              return member.photoURL ? (
                                                                <img
                                                                  src={member.photoURL}
                                                                  alt={member.displayName}
                                                                  className="w-6 h-6 rounded-full object-cover flex-shrink-0 mr-2"
                                                                  title={member.displayName}
                                                                />
                                                              ) : (
                                                                <div
                                                                  className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mr-2"
                                                                  title={member.displayName}
                                                                >
                                                                  {member.displayName?.[0]?.toUpperCase() || '?'}
                                                                </div>
                                                              );
                                                            })()}

                                                            <div className="flex-1">
                                                                <div className="flex justify-between items-start">
                                                                    <p className={`text-sm ${completed ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700 font-medium'}`}>
                                                                        {task.description}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center mt-1 space-x-3 text-xs text-slate-400">
                                                                    <span className="flex items-center">
                                                                        <Clock size={12} className="mr-1" />
                                                                        {task.estimatedMinutes}m
                                                                    </span>
                                                                    {task.priority === 'High' && (
                                                                        <span className="flex items-center text-amber-600 font-medium">
                                                                            <AlertCircle size={12} className="mr-1" />
                                                                            Priority
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            );
        })}
    </div>
  );
};

export default CalendarView;
