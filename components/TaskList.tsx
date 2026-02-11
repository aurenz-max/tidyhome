import React, { useState, useMemo } from 'react';
import { Task, RoomType, Frequency } from '../types';
import { CheckCircle2, Circle, Clock, AlertCircle, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import TaskModal from './TaskModal';
import { useHousehold } from '../contexts/HouseholdContext';
import { useRooms } from '../contexts/RoomsContext';
import { useAuth } from '../contexts/AuthContext';

interface TaskListProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onSaveTask: (task: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, onToggleTask, onSaveTask, onDeleteTask }) => {
  const { user } = useAuth();
  const { members, getMemberByUid } = useHousehold();
  const { getRoomById } = useRooms();
  const showAssignees = members.length > 1;
  const [activeFilter, setActiveFilter] = useState<'All' | 'Due' | 'Mine' | RoomType>('Due');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // Helper to get room name from task (supports both new roomId and legacy room field)
  const getRoomName = (task: Task): string => {
    if (task.roomId) {
      const room = getRoomById(task.roomId);
      return room?.name || task.room || 'General';
    }
    return task.room || 'General';
  };

  // Helper to format scheduled day
  const formatScheduledDay = (task: Task): string | null => {
    if (task.scheduledDay === undefined) return null;

    if (task.frequency === Frequency.Weekly || task.frequency === Frequency.BiWeekly) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days[task.scheduledDay];
    }

    if (task.frequency === Frequency.Monthly || task.frequency === Frequency.Quarterly) {
      const day = task.scheduledDay;
      const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
      return `${day}${suffix}`;
    }

    return null;
  };

  // Get unique rooms for filter tabs
  const rooms = useMemo(() => {
    // Safety check for task.roomType in case of malformed data
    const r = Array.from(new Set(tasks.filter(t => t && t.roomType).map(t => t.roomType))).sort();
    return r;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Safety check for undefined properties
      if (!task) return false;

      const description = task.description || '';
      const roomName = getRoomName(task);

      const matchesSearch = description.toLowerCase().includes(search.toLowerCase()) ||
                            roomName.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === 'All') return true;
      if (activeFilter === 'Due') return task.isDue;
      if (activeFilter === 'Mine') return task.assignedTo === user?.uid;
      return task.roomType === activeFilter;
    });
  }, [tasks, activeFilter, search, getRoomById]);

  // Group by Room specific name for display
  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: Task[] } = {};
    filteredTasks.forEach(task => {
      const roomName = getRoomName(task);
      if (!groups[roomName]) {
        groups[roomName] = [];
      }
      groups[roomName].push(task);
    });
    return groups;
  }, [filteredTasks, getRoomById]);

  const handleAddTask = () => {
    setModalMode('add');
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setModalMode('edit');
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = (taskData: Partial<Task>) => {
    onSaveTask(taskData);
  };

  return (
    <>
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        task={selectedTask}
        mode={modalMode}
        existingTasks={tasks}
      />
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Filters Toolbar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
           {showAssignees && (
             <button
               onClick={() => setActiveFilter('Mine')}
               className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                 activeFilter === 'Mine'
                   ? 'bg-indigo-600 text-white shadow-md'
                   : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
               }`}
             >
               My Tasks
             </button>
           )}
           <button
             onClick={() => setActiveFilter('Due')}
             className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
               activeFilter === 'Due'
                 ? 'bg-teal-600 text-white shadow-md'
                 : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
             }`}
           >
             Due Now
           </button>
           <button
             onClick={() => setActiveFilter('All')}
             className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
               activeFilter === 'All'
                 ? 'bg-teal-600 text-white shadow-md'
                 : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
             }`}
           >
             All Tasks
           </button>
           {rooms.map(room => (
             <button
               key={room}
               onClick={() => setActiveFilter(room)}
               className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                 activeFilter === room
                   ? 'bg-teal-600 text-white shadow-md'
                   : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
               }`}
             >
               {room}
             </button>
           ))}
        </div>

        <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
        />
      </div>

      {/* Add Task Button */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={handleAddTask}
          className="w-full sm:w-auto px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <Plus size={20} />
          Add New Task
        </button>
      </div>

      {/* Task List Content */}
      <div className="p-4 space-y-8">
        {Object.keys(groupedTasks).length === 0 ? (
            <div className="text-center py-20 text-slate-400 dark:text-slate-500">
                <p>No tasks found for this filter.</p>
            </div>
        ) : (
            Object.entries(groupedTasks).map(([roomName, roomTasks]: [string, Task[]]) => (
                <div key={roomName} className="animate-fade-in">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center">
                        <span className="w-2 h-6 bg-teal-500 rounded-full mr-3"></span>
                        {roomName}
                        <span className="ml-3 text-xs font-normal text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                            {roomTasks.length} tasks
                        </span>
                    </h3>
                    <div className="space-y-2">
                        {roomTasks.map(task => (
                            <div
                                key={task.id}
                                className={`group flex items-center p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${
                                    task.isCompleted
                                        ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 opacity-60'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                }`}
                            >
                                <button
                                    onClick={() => onToggleTask(task.id)}
                                    className={`flex-shrink-0 mr-4 transition-colors ${
                                        task.isCompleted ? 'text-teal-500' : 'text-slate-300 hover:text-teal-500'
                                    }`}
                                >
                                    {task.isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} strokeWidth={2} />}
                                </button>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className={`text-sm font-medium ${task.isCompleted ? 'text-slate-500 dark:text-slate-400 line-through decoration-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                          {task.description || 'Untitled Task'}
                                      </p>
                                      {showAssignees && task.assignedTo && (() => {
                                        const member = getMemberByUid(task.assignedTo);
                                        return member ? (
                                          <span
                                            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold flex-shrink-0"
                                            title={member.displayName}
                                          >
                                            {member.displayName?.[0]?.toUpperCase() || '?'}
                                          </span>
                                        ) : null;
                                      })()}
                                    </div>
                                    <div className="flex items-center mt-1 space-x-3 text-xs text-slate-500 dark:text-slate-400">
                                        <span className="flex items-center">
                                            <Clock size={12} className="mr-1" />
                                            {task.estimatedMinutes || 0}m
                                        </span>
                                        <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                                            {task.frequency}
                                        </span>
                                        {formatScheduledDay(task) && (
                                            <span className="bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800 font-medium">
                                                {formatScheduledDay(task)}
                                            </span>
                                        )}
                                        {task.priority === 'High' && (
                                            <span className="flex items-center text-amber-600 font-medium">
                                                <AlertCircle size={12} className="mr-1" />
                                                Priority
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {confirmingDeleteId === task.id ? (
                                    <div className="flex-shrink-0 ml-4 flex items-center gap-1.5 animate-fade-in">
                                        <span className="text-xs text-red-600 font-medium mr-1">Delete?</span>
                                        <button
                                            onClick={() => {
                                                onDeleteTask(task.id);
                                                setConfirmingDeleteId(null);
                                            }}
                                            className="p-1 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                                            title="Confirm delete"
                                        >
                                            <Check size={14} />
                                        </button>
                                        <button
                                            onClick={() => setConfirmingDeleteId(null)}
                                            className="p-1 rounded bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                                            title="Cancel"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex-shrink-0 ml-4 flex items-center gap-2 opacity-0 group-hover:opacity-100">
                                        <button
                                            onClick={() => handleEditTask(task)}
                                            className="text-slate-400 hover:text-teal-600 transition-colors"
                                            title="Edit task"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => setConfirmingDeleteId(task.id)}
                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                            title="Delete task"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
    </>
  );
};

export default TaskList;