import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import StatsOverview from './components/StatsOverview';
import TaskList from './components/TaskList';
import CalendarView from './components/CalendarView';
import { Task, Frequency, RoomType } from './types';
import { FALLBACK_TASKS } from './constants';
import { generateSmartSchedule, balanceSchedule } from './services/geminiService';
import { useTasks } from './hooks/useTasks';
import { Sparkles, Info, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const { tasks: firestoreTasks, loading: firestoreLoading, updateTask, saveTask } = useTasks();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'rooms' | 'calendar'>('rooms');

  // Auto-advance tasks to next due date when day changes
  useEffect(() => {
    const checkAndResetDaily = async () => {
      const today = new Date().toISOString().split('T')[0];
      const savedResetDate = localStorage.getItem('tidyhome_last_reset');

      if (savedResetDate !== today && firestoreTasks.length > 0) {
        // New day detected - advance completed tasks
        console.log('New day detected, advancing completed tasks...');

        for (const task of firestoreTasks) {
          if (task.isCompleted && task.lastCompleted) {
            const lastCompletedDate = task.lastCompleted.split('T')[0];

            // Only advance if completed today or earlier and task is due
            if (lastCompletedDate <= today && task.nextDueDate <= today) {
              const d = new Date(today);
              switch(task.frequency) {
                case Frequency.Daily: d.setDate(d.getDate() + 1); break;
                case Frequency.Weekly: d.setDate(d.getDate() + 7); break;
                case Frequency.BiWeekly: d.setDate(d.getDate() + 14); break;
                case Frequency.Monthly: d.setDate(d.getDate() + 30); break;
                case Frequency.Quarterly: d.setDate(d.getDate() + 90); break;
                default: d.setDate(d.getDate() + 7);
              }

              const newNextDueDate = d.toISOString().split('T')[0];
              await updateTask(task.id, {
                nextDueDate: newNextDueDate,
                isCompleted: false // Reset for new cycle
              });
            }
          }
        }

        localStorage.setItem('tidyhome_last_reset', today);
      }
    };

    if (!firestoreLoading) {
      checkAndResetDaily();
    }
  }, [firestoreLoading, firestoreTasks, updateTask]);

  // Sync Firestore tasks to local state and refresh isDue status
  useEffect(() => {
    if (!firestoreLoading && firestoreTasks.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const refreshedTasks = firestoreTasks.map(task => {
        const isDue = task.nextDueDate <= today;

        return {
          ...task,
          isDue,
          isCompleted: task.isCompleted || false
        };
      });
      setTasks(refreshedTasks);
    }
  }, [firestoreTasks, firestoreLoading]);

  // Load AI analysis from localStorage (can be migrated to Firestore later)
  useEffect(() => {
    const savedAnalysis = localStorage.getItem('tidyhome_analysis');
    if (savedAnalysis) {
      setAiAnalysis(savedAnalysis);
    }
  }, []);

  // Save AI analysis to localStorage when it changes
  useEffect(() => {
    if (aiAnalysis) {
      localStorage.setItem('tidyhome_analysis', aiAnalysis);
    }
  }, [aiAnalysis]);

  const handleGenerateSchedule = async () => {
    setIsLoading(true);
    try {
      const { tasks: newTasks, analysis } = await generateSmartSchedule();

      // Save all generated tasks to Firestore
      for (const task of newTasks) {
        await saveTask(task);
      }

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

        // Save all balanced tasks to Firestore
        for (const task of balancedTasks) {
          await saveTask(task);
        }
    } catch (error) {
        console.error("Failed to balance schedule", error);
        alert("Failed to balance schedule. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);

    if (!task) return;

    const newIsCompleted = !task.isCompleted;

    // Update in Firestore
    try {
      const updates: Partial<Task> = {
        isCompleted: newIsCompleted
      };

      // Only set lastCompleted when completing a task (not when unchecking)
      if (newIsCompleted) {
        updates.lastCompleted = new Date().toISOString();
        // DO NOT update nextDueDate here - task should stay in today's list
        // The nextDueDate will be updated by a daily reset process
      } else {
        // When unchecking, clear lastCompleted
        updates.lastCompleted = undefined as any;
      }

      await updateTask(taskId, updates);
    } catch (error) {
      console.error("Failed to update task", error);
      alert("Failed to update task. Please try again.");
    }
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    try {
      // If no ID exists, this is a new task - generate an ID
      const taskToSave: any = {
        id: taskData.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        description: taskData.description || '',
        room: taskData.room || '',
        roomType: taskData.roomType || RoomType.General,
        frequency: taskData.frequency || Frequency.Weekly,
        estimatedMinutes: taskData.estimatedMinutes || 15,
        priority: taskData.priority || 'Medium',
        nextDueDate: taskData.nextDueDate || new Date().toISOString().split('T')[0],
        isDue: taskData.isDue !== undefined ? taskData.isDue : true,
        isCompleted: taskData.isCompleted || false,
      };

      // Only include lastCompleted if it has a value (Firestore doesn't accept undefined)
      if (taskData.lastCompleted) {
        taskToSave.lastCompleted = taskData.lastCompleted;
      }

      await saveTask(taskToSave as Task);
    } catch (error) {
      console.error("Failed to save task", error);
      alert("Failed to save task. Please try again.");
    }
  };

  // Show loading state while Firestore is initializing
  if (firestoreLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Loading your tasks...</p>
        </div>
      </div>
    );
  }

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
             <TaskList tasks={tasks} onToggleTask={handleToggleTask} onSaveTask={handleSaveTask} />
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
