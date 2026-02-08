import { GoogleGenAI, Type } from "@google/genai";
import { INITIAL_TASKS_RAW, INITIAL_HOUSE_DESC } from '../constants';
import { Task, Frequency } from '../types';
import { isTaskDueOnDate, getNextOccurrence, getToday } from '../utils/recurrence';
import { optimizeWeeklySchedule } from '../utils/scheduler';

export const generateSmartSchedule = async (): Promise<{ tasks: Task[], analysis: string }> => {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    console.warn("No API Key found, returning fallback data simulated.");
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const today = getToday();

  const prompt = `
    You are an expert home management consultant.
    I have a house with the following description:
    "${INITIAL_HOUSE_DESC}"

    And here is the raw list of tasks I want to track:
    "${INITIAL_TASKS_RAW}"

    Today's date is ${today}.

    Please analyze this context (specifically the dogs and kids) to create a structured cleaning schedule.

    CRITICAL INSTRUCTIONS:
    1. You MUST generate tasks for EVERY room mentioned in the input list.
    2. You MUST NOT summarize multiple tasks into one. Use the EXACT bullet points provided in the raw list.
    3. Ensure the output list is exhaustive and matches the input granularity.
    4. For 'scheduledDay':
       - Daily tasks: set to -1 (they run every day)
       - Weekly/Bi-Weekly tasks: set to a day of week (0=Sunday, 1=Monday, ... 6=Saturday)
       - Monthly/Quarterly tasks: set to day of month (1-31)
    5. Distribute weekly tasks across weekdays so the workload is balanced.

    Return a JSON object with:
    1. 'analysis': A short paragraph explaining your scheduling strategy.
    2. 'tasks': An array of task objects.

    Each task object must have:
    - id: string (unique)
    - room: string
    - roomType: string (Kitchen, Dining Room, Living Room, Office, Entryway, Bathroom, Bedroom, Hallway, Basement, General)
    - description: string
    - frequency: string (Daily, Weekly, Bi-Weekly, Monthly, Quarterly)
    - estimatedMinutes: number
    - priority: string (High, Medium, Low)
    - scheduledDay: number
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  room: { type: Type.STRING },
                  roomType: { type: Type.STRING },
                  description: { type: Type.STRING },
                  frequency: { type: Type.STRING },
                  estimatedMinutes: { type: Type.NUMBER },
                  priority: { type: Type.STRING },
                  scheduledDay: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{}");

    // Post-process: set recurrence fields and compute derived fields
    const rawTasks: Task[] = (result.tasks || []).map((t: any) => {
      const task: Task = {
        ...t,
        description: t.description || 'Untitled Task',
        room: t.room || 'General',
        scheduledDay: t.scheduledDay === -1 ? undefined : t.scheduledDay,
        anchorDate: (t.frequency === 'Bi-Weekly' || t.frequency === 'Quarterly') ? today : undefined,
        completedDates: [],
        isCompleted: false,
        lastCompleted: undefined,
        nextDueDate: today, // Temporary, computed below
        isDue: false, // Temporary, computed below
      };
      task.nextDueDate = getNextOccurrence(task, today);
      task.isDue = isTaskDueOnDate(task, today);
      return task;
    });

    // Run local optimizer to balance weekly tasks by room
    const assignments = optimizeWeeklySchedule(rawTasks);
    for (const { taskId, scheduledDay } of assignments) {
      const task = rawTasks.find(t => t.id === taskId);
      if (task) {
        task.scheduledDay = scheduledDay;
        task.nextDueDate = getNextOccurrence(task, today);
        task.isDue = isTaskDueOnDate(task, today);
      }
    }

    return {
      tasks: rawTasks,
      analysis: result.analysis || "Generated schedule based on house profile."
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
