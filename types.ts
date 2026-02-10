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
  LaundryRoom = 'Laundry Room',
  General = 'General'
}

export interface Task {
  id: string;
  roomId: string; // Reference to Room.id
  room: string; // DEPRECATED: kept for backward compatibility during migration
  roomType: RoomType;
  description: string;
  frequency: Frequency;
  estimatedMinutes: number;
  lastCompleted?: string; // ISO Date string
  nextDueDate: string; // ISO Date string YYYY-MM-DD (cached, derived from recurrence)
  isDue: boolean; // Computed from recurrence: is this task scheduled today?
  isCompleted?: boolean; // Today's completion status (derived from completedDates)
  priority: 'High' | 'Medium' | 'Low';
  scheduledDay?: number; // Weekly/BiWeekly: day-of-week (0=Sun..6=Sat), Monthly/Quarterly: day-of-month (1-31), Daily: undefined
  anchorDate?: string; // YYYY-MM-DD starting reference for BiWeekly/Quarterly recurrence
  completedDates?: string[]; // Array of YYYY-MM-DD dates this task was completed on
  assignedTo?: string; // uid of the household member assigned to this task
}

export interface RoomTaskTemplate {
  description: string;
  frequency: Frequency;
  estimatedMinutes: number;
  priority: 'High' | 'Medium' | 'Low';
}

export interface RoomTemplate {
  roomType: RoomType;
  defaultName: string;
  icon: string; // Lucide icon name
  description: string;
  tasks: RoomTaskTemplate[];
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

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: string;
  photoURL?: string;
  householdId?: string;
}

export interface Household {
  id: string;
  name: string;
  memberUids: string[];
  adminUid: string;
  inviteCode: string;
  createdAt: string;
}

export interface HouseholdMember {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface Room {
  id: string;
  householdId: string;
  name: string;
  roomType: RoomType;
  icon: string; // Lucide icon name
  order: number; // For custom sorting
  createdAt: string;
}