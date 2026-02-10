import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import StatsOverview from './components/StatsOverview';
import TaskList from './components/TaskList';
import CalendarView from './components/CalendarView';
import AuthForm from './components/AuthForm';
import OnboardingWizard from './components/OnboardingWizard';
import RoomManager from './components/RoomManager';
import HouseholdSetup from './components/HouseholdSetup';
import HouseholdSettings from './components/HouseholdSettings';
import { Task, Frequency, RoomType } from './types';
import { FALLBACK_TASKS } from './constants';
import { generateSmartSchedule } from './services/geminiService';
import { useTasks } from './hooks/useTasks';
import { useAuth } from './contexts/AuthContext';
import { useHousehold } from './contexts/HouseholdContext';
import { isTaskDueOnDate, isOccurrenceCompleted, getNextOccurrence, getToday } from './utils/recurrence';
import { optimizeWeeklySchedule } from './utils/scheduler';
import { Sparkles, Info, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { household, members, loading: householdLoading } = useHousehold();
  const { tasks: firestoreTasks, loading: firestoreLoading, needsOnboarding, updateTask, saveTask, deleteTask, completeOnboarding, addRoom, renameRoom, deleteRoom } = useTasks(household?.id || null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'rooms' | 'calendar'>('rooms');
  const [showRoomManager, setShowRoomManager] = useState(false);
  const [showHouseholdSettings, setShowHouseholdSettings] = useState(false);

  // Daily reset: prune old completedDates, recompute isCompleted
  useEffect(() => {
    const checkAndResetDaily = async () => {
      const today = getToday();
      const savedResetDate = localStorage.getItem('tidyhome_last_reset');

      if (savedResetDate !== today && firestoreTasks.length > 0) {
        console.log('New day detected, resetting completion state...');

        // Set the flag BEFORE updating to prevent re-entry
        localStorage.setItem('tidyhome_last_reset', today);

        for (const task of firestoreTasks) {
          const completedDates = task.completedDates ?? [];
          // Prune entries older than 30 days
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 30);
          const cutoffStr = cutoff.toISOString().split('T')[0];
          const pruned = completedDates.filter(d => d >= cutoffStr);

          const isCompletedToday = pruned.includes(today);

          // Only update if something changed
          if (pruned.length !== completedDates.length || task.isCompleted !== isCompletedToday) {
            await updateTask(task.id, {
              completedDates: pruned,
              isCompleted: isCompletedToday,
              nextDueDate: getNextOccurrence(task, today),
            });
          }
        }
      }
    };

    if (!firestoreLoading) {
      checkAndResetDaily();
    }
  }, [firestoreLoading, firestoreTasks, updateTask]);

  // Sync Firestore tasks to local state and refresh isDue status
  useEffect(() => {
    if (!firestoreLoading && firestoreTasks.length > 0) {
      const today = getToday();
      const refreshedTasks = firestoreTasks.map(task => ({
        ...task,
        isDue: isTaskDueOnDate(task, today),
        isCompleted: isOccurrenceCompleted(task, today),
      }));
      setTasks(refreshedTasks);
    }
  }, [firestoreTasks, firestoreLoading]);

  // Load AI analysis from localStorage
  useEffect(() => {
    const savedAnalysis = localStorage.getItem('tidyhome_analysis');
    if (savedAnalysis) setAiAnalysis(savedAnalysis);
  }, []);

  // Save AI analysis to localStorage when it changes
  useEffect(() => {
    if (aiAnalysis) localStorage.setItem('tidyhome_analysis', aiAnalysis);
  }, [aiAnalysis]);

  const handleGenerateSchedule = async () => {
    setIsLoading(true);
    try {
      const { tasks: newTasks, analysis } = await generateSmartSchedule();
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
      const assignments = optimizeWeeklySchedule(tasks);
      const today = getToday();

      for (const { taskId, scheduledDay } of assignments) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          const updatedTask = { ...task, scheduledDay };
          await updateTask(taskId, {
            scheduledDay,
            nextDueDate: getNextOccurrence(updatedTask, today),
          });
        }
      }
    } catch (error) {
      console.error("Failed to balance schedule", error);
      alert("Failed to balance schedule. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTask = async (taskId: string, date?: string) => {
    const today = getToday();
    const targetDate = date ?? today;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const completedDates = task.completedDates ?? [];
    const isCurrentlyCompleted = completedDates.includes(targetDate);

    try {
      let updatedDates: string[];
      const updates: Partial<Task> = {};

      if (isCurrentlyCompleted) {
        // Uncomplete: remove this date
        updatedDates = completedDates.filter(d => d !== targetDate);
        updates.completedDates = updatedDates;
        updates.isCompleted = updatedDates.includes(today);
      } else {
        // Complete: add this date
        updatedDates = [...completedDates, targetDate];
        updates.completedDates = updatedDates;
        updates.lastCompleted = new Date().toISOString();
        updates.isCompleted = updatedDates.includes(today);
      }

      await updateTask(taskId, updates);
    } catch (error) {
      console.error("Failed to update task", error);
      alert("Failed to update task. Please try again.");
    }
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    try {
      const today = getToday();
      const frequency = taskData.frequency || Frequency.Weekly;

      const taskToSave: any = {
        id: taskData.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        description: taskData.description || '',
        room: taskData.room || '',
        roomType: taskData.roomType || RoomType.General,
        frequency,
        estimatedMinutes: taskData.estimatedMinutes || 15,
        priority: taskData.priority || 'Medium',
        isCompleted: false,
        completedDates: [],
        scheduledDay: taskData.scheduledDay,
        anchorDate: taskData.anchorDate,
        assignedTo: taskData.assignedTo,
      };

      // Compute nextDueDate and isDue from recurrence
      taskToSave.nextDueDate = getNextOccurrence(taskToSave as Task, today);
      taskToSave.isDue = isTaskDueOnDate(taskToSave as Task, today);

      if (taskData.lastCompleted) {
        taskToSave.lastCompleted = taskData.lastCompleted;
      }

      await saveTask(taskToSave as Task);
    } catch (error) {
      console.error("Failed to save task", error);
      alert("Failed to save task. Please try again.");
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show auth form if not logged in
  if (!user) {
    return <AuthForm />;
  }

  // Show loading state while household is initializing
  if (householdLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Loading household...</p>
        </div>
      </div>
    );
  }

  // Show household setup if user has no household
  if (!household) {
    return <HouseholdSetup />;
  }

  // Show onboarding wizard for first-time households
  if (needsOnboarding) {
    return (
      <OnboardingWizard
        onComplete={completeOnboarding}
        onSkip={async () => {
          await completeOnboarding(FALLBACK_TASKS);
        }}
      />
    );
  }

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
        userName={user.displayName || user.email || 'User'}
        onSignOut={signOut}
        onManageRooms={() => setShowRoomManager(true)}
        householdName={household.name}
        onManageHousehold={() => setShowHouseholdSettings(true)}
        memberCount={members.length}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Welcome / Context Banner */}
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Welcome Home</h2>
            <p className="text-slate-500 mt-1">
              {members.length > 1
                ? `${household.name} - ${members.length} members keeping it tidy.`
                : 'Keep your home fresh and tidy.'
              }
            </p>

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
        {viewMode === 'rooms' && <StatsOverview tasks={tasks} members={members} />}

        {/* Views */}
        {viewMode === 'rooms' ? (
             <TaskList tasks={tasks} onToggleTask={handleToggleTask} onSaveTask={handleSaveTask} onDeleteTask={deleteTask} />
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

      <RoomManager
        isOpen={showRoomManager}
        onClose={() => setShowRoomManager(false)}
        tasks={tasks}
        onAddRoom={addRoom}
        onRenameRoom={renameRoom}
        onDeleteRoom={deleteRoom}
      />

      <HouseholdSettings
        isOpen={showHouseholdSettings}
        onClose={() => setShowHouseholdSettings(false)}
      />
    </div>
  );
};

export default App;
