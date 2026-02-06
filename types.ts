export enum Frequency {
  Daily = 'Daily',
  Weekly = 'Weekly',
  BiWeekly = 'Bi-Weekly',
  Monthly = 'Monthly',
  Quarterly = 'Quarterly'
}

export enum RoomType {
  Kitchen = 'Kitchen',
  DiningRoom = 'Dining Room',
  LivingRoom = 'Living Room',
  Office = 'Office',
  Entryway = 'Entryway',
  Bathroom = 'Bathroom',
  Bedroom = 'Bedroom',
  Hallway = 'Hallway',
  Basement = 'Basement',
  General = 'General'
}

export interface Task {
  id: string;
  room: string;
  roomType: RoomType;
  description: string;
  frequency: Frequency;
  estimatedMinutes: number;
  lastCompleted?: string; // ISO Date string
  nextDueDate: string; // ISO Date string YYYY-MM-DD
  isDue: boolean; // Computed: nextDueDate <= today
  isCompleted?: boolean; // Today's completion status (resets when task becomes due again)
  priority: 'High' | 'Medium' | 'Low';
}

export interface HouseProfile {
  sqftMain: number;
  sqftUpstairs: number;
  sqftBasement: number;
  kids: number;
  dogs: number;
}

export interface ScheduleGenerationResponse {
  tasks: Task[];
  analysis: string;
}