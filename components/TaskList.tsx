import React, { useState, useMemo } from 'react';
import { Task, RoomType, Frequency } from '../types';
import { CheckCircle2, Circle, Clock, AlertCircle, Plus, Edit2 } from 'lucide-react';
import TaskModal from './TaskModal';

interface TaskListProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onSaveTask: (task: Partial<Task>) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, onToggleTask, onSaveTask }) => {
  const [activeFilter, setActiveFilter] = useState<'All' | 'Due' | RoomType>('Due');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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
      const room = task.room || '';
      
      const matchesSearch = description.toLowerCase().includes(search.toLowerCase()) || 
                            room.toLowerCase().includes(search.toLowerCase());
      
      if (!matchesSearch) return false;

      if (activeFilter === 'All') return true;
      if (activeFilter === 'Due') return task.isDue;
      return task.roomType === activeFilter;
    });
  }, [tasks, activeFilter, search]);

  // Group by Room specific name for display
  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: Task[] } = {};
    filteredTasks.forEach(task => {
      const roomName = task.room || 'General';
      if (!groups[roomName]) {
        groups[roomName] = [];
      }
      groups[roomName].push(task);
    });
    return groups;
  }, [filteredTasks]);

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
      />
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Filters Toolbar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
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
                   : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
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
            className="w-full sm:w-64 px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
        />
      </div>

      {/* Add Task Button */}
      <div className="p-4 border-b border-slate-200">
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
            <div className="text-center py-20 text-slate-400">
                <p>No tasks found for this filter.</p>
            </div>
        ) : (
            Object.entries(groupedTasks).map(([roomName, roomTasks]: [string, Task[]]) => (
                <div key={roomName} className="animate-fade-in">
                    <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center">
                        <span className="w-2 h-6 bg-teal-500 rounded-full mr-3"></span>
                        {roomName}
                        <span className="ml-3 text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                            {roomTasks.length} tasks
                        </span>
                    </h3>
                    <div className="space-y-2">
                        {roomTasks.map(task => (
                            <div 
                                key={task.id}
                                className={`group flex items-center p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${
                                    task.isDue 
                                        ? 'bg-white border-slate-200' 
                                        : 'bg-slate-50 border-slate-100 opacity-60'
                                }`}
                            >
                                <button 
                                    onClick={() => onToggleTask(task.id)}
                                    className={`flex-shrink-0 mr-4 transition-colors ${
                                        task.isDue ? 'text-slate-300 hover:text-teal-500' : 'text-teal-500'
                                    }`}
                                >
                                    {task.isDue ? <Circle size={24} strokeWidth={2} /> : <CheckCircle2 size={24} />}
                                </button>
                                
                                <div className="flex-1">
                                    <p className={`text-sm font-medium ${task.isDue ? 'text-slate-800' : 'text-slate-500 line-through decoration-slate-400'}`}>
                                        {task.description || 'Untitled Task'}
                                    </p>
                                    <div className="flex items-center mt-1 space-x-3 text-xs text-slate-500">
                                        <span className="flex items-center">
                                            <Clock size={12} className="mr-1" />
                                            {task.estimatedMinutes || 0}m
                                        </span>
                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                            {task.frequency}
                                        </span>
                                        {task.priority === 'High' && (
                                            <span className="flex items-center text-amber-600 font-medium">
                                                <AlertCircle size={12} className="mr-1" />
                                                Priority
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleEditTask(task)}
                                    className="flex-shrink-0 ml-4 text-slate-400 hover:text-teal-600 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Edit task"
                                >
                                    <Edit2 size={18} />
                                </button>
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