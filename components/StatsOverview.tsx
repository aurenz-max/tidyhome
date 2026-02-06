import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Task, RoomType } from '../types';

interface StatsOverviewProps {
  tasks: Task[];
}

const COLORS = ['#0d9488', '#14b8a6', '#5eead4', '#ccfbf1', '#94a3b8'];

const StatsOverview: React.FC<StatsOverviewProps> = ({ tasks }) => {
  // Focus on today's tasks only
  const todaysTasks = tasks.filter(t => t.isDue);

  // Calculate total minutes per room for TODAY's tasks
  const minutesByRoom = todaysTasks.reduce((acc, task) => {
    const existing = acc.find(item => item.name === task.room);
    if (existing) {
      existing.minutes += task.estimatedMinutes;
    } else {
      acc.push({ name: task.room, minutes: task.estimatedMinutes });
    }
    return acc;
  }, [] as { name: string; minutes: number }[]);

  // Sort by time needed descending and take top 5 for cleaner chart
  minutesByRoom.sort((a, b) => b.minutes - a.minutes);
  const topRooms = minutesByRoom.slice(0, 6);

  // Status breakdown for TODAY
  const totalTasksToday = todaysTasks.length;
  const completedTasksToday = todaysTasks.filter(t => t.isCompleted).length;
  const dueTasksToday = totalTasksToday - completedTasksToday;

  const statusData = [
    { name: 'Completed', value: completedTasksToday },
    { name: 'To Do', value: dueTasksToday },
  ];

  const totalTimeToday = todaysTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  const remainingTimeToday = todaysTasks.filter(t => !t.isCompleted).reduce((sum, t) => sum + t.estimatedMinutes, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {/* Summary Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Today's Progress</h3>
        <div className="flex items-end space-x-2 mb-2">
            <span className="text-4xl font-bold text-teal-600">{totalTasksToday > 0 ? Math.round((completedTasksToday / totalTasksToday) * 100) : 0}%</span>
            <span className="text-slate-500 mb-1">complete</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-6">
            <div
                className="bg-teal-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${totalTasksToday > 0 ? Math.round((completedTasksToday / totalTasksToday) * 100) : 0}%` }}
            ></div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
                <p className="text-slate-500">Remaining Today</p>
                <p className="font-semibold text-slate-800">{Math.floor(remainingTimeToday / 60)}h {remainingTimeToday % 60}m</p>
            </div>
            <div>
                <p className="text-slate-500">Tasks Left</p>
                <p className="font-semibold text-slate-800">{dueTasksToday} of {totalTasksToday}</p>
            </div>
        </div>
      </div>

      {/* Time Distribution Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hidden md:block">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Today's Effort by Room (min)</h3>
        <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topRooms} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={100} 
                        tick={{fontSize: 11, fill: '#64748b'}} 
                        interval={0}
                    />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{fill: '#f1f5f9'}}
                    />
                    <Bar dataKey="minutes" fill="#0d9488" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Completion Donut */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center hidden lg:flex">
         <h3 className="text-lg font-semibold text-slate-800 mb-2 w-full text-left">Task Status</h3>
         <div className="h-48 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                    >
                        <Cell key="cell-0" fill="#14b8a6" /> {/* Completed */}
                        <Cell key="cell-1" fill="#e2e8f0" /> {/* Todo */}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="text-center">
                     <p className="text-2xl font-bold text-slate-700">{totalTasksToday}</p>
                     <p className="text-xs text-slate-500 uppercase tracking-wide">Today</p>
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
};

export default StatsOverview;
