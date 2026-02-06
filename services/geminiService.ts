import { GoogleGenAI, Type } from "@google/genai";
import { INITIAL_TASKS_RAW, INITIAL_HOUSE_DESC } from '../constants';
import { Task, Frequency, RoomType } from '../types';

export const generateSmartSchedule = async (): Promise<{ tasks: Task[], analysis: string }> => {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    console.warn("No API Key found, returning fallback data simulated.");
    // In a real app we might throw, but here we want to avoid crashing if user forgets key
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const today = new Date().toISOString().split('T')[0];

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
    4. For 'nextDueDate', distribute the tasks over the upcoming 7 days starting from today (${today}) so the workload is somewhat balanced (not everything on day 1).

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
    - nextDueDate: string (YYYY-MM-DD)
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
                  nextDueDate: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    // Post-process to ensure types match our Enum (basic validation)
    const validTasks: Task[] = (result.tasks || []).map((t: any) => ({
      ...t,
      description: t.description || 'Untitled Task',
      room: t.room || 'General',
      isDue: t.nextDueDate ? t.nextDueDate <= today : true, 
      lastCompleted: undefined
    }));

    return {
      tasks: validTasks,
      analysis: result.analysis || "Generated schedule based on house profile."
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const balanceSchedule = async (currentTasks: Task[]): Promise<Task[]> => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
        throw new Error("API Key is missing.");
    }

    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const today = new Date().toISOString().split('T')[0];

    // Minimal payload to save tokens
    const simpleTasks = currentTasks.map(t => ({
        id: t.id,
        description: t.description,
        frequency: t.frequency,
        estimatedMinutes: t.estimatedMinutes,
        priority: t.priority,
        room: t.room
    }));

    const prompt = `
        I have a list of home maintenance tasks. Today is ${today}.
        Please redistribute the 'nextDueDate' for these tasks over the next 7-10 days to "Load Balance" the schedule.
        
        Rules:
        1. Try to keep the total 'estimatedMinutes' per day under 45 minutes where possible, or at least evenly distributed.
        2. High priority tasks should ideally be scheduled sooner (today or tomorrow).
        3. Weekly tasks can be moved to any day within the next 7 days to balance the load.
        4. Daily tasks MUST be scheduled for today (${today}).
        
        Return a JSON array of objects with only 'id' and 'nextDueDate'.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{
                parts: [
                    { text: JSON.stringify(simpleTasks) },
                    { text: prompt }
                ]
            }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            nextDueDate: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        const updates = JSON.parse(response.text || "[]");
        
        // Merge updates back into current tasks
        const updatedTasks = currentTasks.map(task => {
            const update = updates.find((u: any) => u.id === task.id);
            if (update && update.nextDueDate) {
                const isDue = update.nextDueDate <= today;
                return {
                    ...task,
                    nextDueDate: update.nextDueDate,
                    isDue,
                    // Reset completion status when task becomes due again
                    isCompleted: isDue ? false : task.isCompleted
                };
            }
            return task;
        });

        return updatedTasks;

    } catch (error) {
        console.error("Gemini Load Balance Error:", error);
        throw error;
    }
};