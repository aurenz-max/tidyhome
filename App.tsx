import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import StatsOverview from './components/StatsOverview';
import TaskList from './components/TaskList';
import CalendarView from './components/CalendarView';
import { Task, Frequency } from './types';
import { FALLBACK_TASKS } from './constants';
import { generateSmartSchedule, balanceSchedule } from './services/geminiService';
import { Sparkles, Info } from 'lucide-react';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [viewMode, setViewMode] = useState<'rooms' | 'calendar'>('rooms');

  // Load from local storage or fallback on mount
  useEffect(() => {
    const savedTasks = localStorage.getItem('tidyhome_tasks');
    const savedAnalysis = localStorage.getItem('tidyhome_analysis');
    
    // Always use current date to determine if tasks are due, regardless of when they were saved
    const today = new Date().toISOString().split('T')[0];

    if (savedTasks) {
      try {
        const parsedTasks: Task[] = JSON.parse(savedTasks);
        
        // Refresh 'isDue' status based on the current actual date
        // This prevents the "I saved it yesterday so it's not due today" bug
        const refreshedTasks = parsedTasks.map(task => ({
          ...task,
          isDue: task.nextDueDate <= today
        }));
        
        setTasks(refreshedTasks);
      } catch (e) {
        console.error("Error parsing tasks from local storage", e);
        setTasks(FALLBACK_TASKS);
      }
    } else {
      setTasks(FALLBACK_TASKS);
    }
    
    if (savedAnalysis) {
      setAiAnalysis(savedAnalysis);
    }
    setIsFirstLoad(false);
  }, []);

  // Save to local storage whenever tasks change
  useEffect(() => {
    if (!isFirstLoad) {
      localStorage.setItem('tidyhome_tasks', JSON.stringify(tasks));
      if (aiAnalysis) {
        localStorage.setItem('tidyhome_analysis', aiAnalysis);
      }
    }
  }, [tasks, aiAnalysis, isFirstLoad]);

  const handleGenerateSchedule = async () => {
    setIsLoading(true);
    try {
      const { tasks: newTasks, analysis } = await generateSmartSchedule();
      setTasks(newTasks);
      setAiAnalysis(analysis);
    } catch (error) {
      console.error("Failed to generate schedule", error);
      alert("Failed to generate optimized schedule. Please check your API Key configuration or try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBalanceSchedule = async () => {
    setIsLoading(true);
    try {
        const balancedTasks = await balanceSchedule(tasks);
        setTasks(balancedTasks);
    } catch (error) {
        console.error("Failed to balance schedule", error);
        alert("Failed to balance schedule. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleToggleTask = (taskId: string) => {
    const today = new Date().toISOString().split('T')[0];

    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id === taskId) {
        const newIsDue = !task.isDue;
        let nextDate = task.nextDueDate;

        // If completing a task, set next due date based on frequency
        if (!newIsDue) {
            const d = new Date();
            switch(task.frequency) {
                case Frequency.Daily: d.setDate(d.getDate() + 1); break;
                case Frequency.Weekly: d.setDate(d.getDate() + 7); break;
                case Frequency.BiWeekly: d.setDate(d.getDate() + 14); break;
                case Frequency.Monthly: d.setDate(d.getDate() + 30); break;
                case Frequency.Quarterly: d.setDate(d.getDate() + 90); break;
                default: d.setDate(d.getDate() + 7);
            }
            nextDate = d.toISOString().split('T')[0];
        } else {
            // Unchecking (undoing complete) - revert to today usually, or keep original if we stored it (not storing history for simplicity)
            nextDate = today; 
        }

        return {
          ...task,
          isDue: newIsDue,
          lastCompleted: newIsDue ? undefined : new Date().toISOString(),
          nextDueDate: nextDate
        };
      }
      return task;
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      <Header 
        onGenerate={handleGenerateSchedule} 
        onBalance={handleBalanceSchedule}
        isGenerating={isLoading} 
        viewMode={viewMode}
        setViewMode={setViewMode}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Welcome / Context Banner */}
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Welcome Home</h2>
            <p className="text-slate-500 mt-1">Keep your 2,700 sq ft home fresh for the family.</p>
            
            {aiAnalysis && (
                <div className="mt-4 bg-teal-50 border border-teal-100 rounded-lg p-4 flex items-start animate-fade-in">
                    <Sparkles className="text-teal-600 mt-0.5 mr-3 flex-shrink-0" size={18} />
                    <div>
                        <h4 className="font-semibold text-teal-800 text-sm mb-1">AI Optimized Schedule</h4>
                        <p className="text-sm text-teal-700 leading-relaxed">{aiAnalysis}</p>
                    </div>
                </div>
            )}
        </div>

        {/* Dashboard Stats */}
        {viewMode === 'rooms' && <StatsOverview tasks={tasks} />}

        {/* Views */}
        {viewMode === 'rooms' ? (
             <TaskList tasks={tasks} onToggleTask={handleToggleTask} />
        ) : (
             <CalendarView tasks={tasks} onToggleTask={handleToggleTask} />
        )}
       
        
        {!aiAnalysis && tasks.length === FALLBACK_TASKS.length && viewMode === 'rooms' && (
             <div className="mt-8 p-4 bg-blue-50 text-blue-800 rounded-lg flex items-center border border-blue-100">
                <Info className="mr-3" size={20} />
                <p className="text-sm">
                    <strong>Tip:</strong> Click "AI Optimize" to generate a full, personalized schedule, or use "Calendar" view to see what's coming up.
                </p>
            </div>
        )}

      </main>
    </div>
  );
};

export default App;
