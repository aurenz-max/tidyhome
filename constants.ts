import { Task, Frequency, RoomType, RoomTemplate } from './types';
import { getNextOccurrence, isTaskDueOnDate, getToday } from './utils/recurrence';
import { optimizeWeeklySchedule } from './utils/scheduler';

export const ROOM_TASK_CATALOG: Record<RoomType, RoomTemplate> = {
  [RoomType.Kitchen]: {
    roomType: RoomType.Kitchen,
    defaultName: 'Kitchen',
    icon: 'ChefHat',
    description: 'Counters, appliances, sink, floors',
    tasks: [
      { description: 'Wipe down all countertops and backsplash', frequency: Frequency.Daily, estimatedMinutes: 10, priority: 'High' },
      { description: 'Clean exterior of appliances (fridge, oven, microwave, dishwasher)', frequency: Frequency.Weekly, estimatedMinutes: 15, priority: 'Medium' },
      { description: 'Clean inside microwave', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Medium' },
      { description: 'Scrub sink and polish fixtures', frequency: Frequency.Daily, estimatedMinutes: 5, priority: 'High' },
      { description: 'Wipe cabinet fronts (especially around handles)', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Low' },
      { description: 'Clean stovetop and range hood', frequency: Frequency.Daily, estimatedMinutes: 5, priority: 'Medium' },
      { description: 'Empty trash and replace liner', frequency: Frequency.Daily, estimatedMinutes: 2, priority: 'High' },
      { description: 'Mop floors', frequency: Frequency.Weekly, estimatedMinutes: 15, priority: 'Medium' },
    ],
  },
  [RoomType.DiningRoom]: {
    roomType: RoomType.DiningRoom,
    defaultName: 'Dining Room',
    icon: 'UtensilsCrossed',
    description: 'Table, chairs, shelving, floors',
    tasks: [
      { description: 'Dust table and chairs', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Medium' },
      { description: 'Wipe down table surface', frequency: Frequency.Daily, estimatedMinutes: 2, priority: 'Low' },
      { description: 'Dust any buffet/sideboard/shelving', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Low' },
      { description: 'Vacuum / mop floor', frequency: Frequency.Weekly, estimatedMinutes: 10, priority: 'Medium' },
    ],
  },
  [RoomType.LivingRoom]: {
    roomType: RoomType.LivingRoom,
    defaultName: 'Living Room',
    icon: 'Sofa',
    description: 'Surfaces, furniture, floors',
    tasks: [
      { description: 'Dust all surfaces (TV stand, shelves, end tables)', frequency: Frequency.Weekly, estimatedMinutes: 10, priority: 'Medium' },
      { description: 'Wipe down TV screen and electronics', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Low' },
      { description: 'Fluff and arrange couch cushions and pillows', frequency: Frequency.Daily, estimatedMinutes: 3, priority: 'Low' },
      { description: 'Vacuum carpet and under furniture edges', frequency: Frequency.Weekly, estimatedMinutes: 15, priority: 'High' },
      { description: 'Vacuum upholstered furniture', frequency: Frequency.Weekly, estimatedMinutes: 10, priority: 'High' },
    ],
  },
  [RoomType.Office]: {
    roomType: RoomType.Office,
    defaultName: 'Office',
    icon: 'Monitor',
    description: 'Desk, electronics, floors',
    tasks: [
      { description: 'Dust desk and shelving', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Medium' },
      { description: 'Wipe down desk surface', frequency: Frequency.Weekly, estimatedMinutes: 2, priority: 'Medium' },
      { description: 'Dust electronics/monitors', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Low' },
      { description: 'Vacuum / mop floor', frequency: Frequency.Weekly, estimatedMinutes: 10, priority: 'Medium' },
    ],
  },
  [RoomType.Entryway]: {
    roomType: RoomType.Entryway,
    defaultName: 'Entryway',
    icon: 'DoorOpen',
    description: 'Door, mirrors, shoe rack, floor',
    tasks: [
      { description: 'Wipe down door and door handle', frequency: Frequency.Weekly, estimatedMinutes: 2, priority: 'High' },
      { description: 'Clean any mirrors or glass', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Medium' },
      { description: 'Dust shoe rack/coat hooks', frequency: Frequency.Weekly, estimatedMinutes: 2, priority: 'Low' },
      { description: 'Mop/vacuum floor', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'High' },
    ],
  },
  [RoomType.Bathroom]: {
    roomType: RoomType.Bathroom,
    defaultName: 'Bathroom',
    icon: 'Bath',
    description: 'Toilet, sink, shower/tub, floors',
    tasks: [
      { description: 'Scrub and disinfect toilet (inside and out)', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'High' },
      { description: 'Clean sink and polish fixtures', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'High' },
      { description: 'Wipe down counter and mirror', frequency: Frequency.Weekly, estimatedMinutes: 3, priority: 'Medium' },
      { description: 'Clean tub/shower (scrub walls, floor, fixtures)', frequency: Frequency.Weekly, estimatedMinutes: 15, priority: 'High' },
      { description: 'Wipe cabinet fronts', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Low' },
      { description: 'Empty trash', frequency: Frequency.Weekly, estimatedMinutes: 1, priority: 'Medium' },
      { description: 'Mop floor', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Medium' },
    ],
  },
  [RoomType.Bedroom]: {
    roomType: RoomType.Bedroom,
    defaultName: 'Bedroom',
    icon: 'Bed',
    description: 'Bed, surfaces, floors',
    tasks: [
      { description: 'Make bed neatly', frequency: Frequency.Daily, estimatedMinutes: 3, priority: 'Low' },
      { description: 'Change bed linens', frequency: Frequency.Weekly, estimatedMinutes: 10, priority: 'Medium' },
      { description: 'Dust nightstands, dresser, and all surfaces', frequency: Frequency.Weekly, estimatedMinutes: 10, priority: 'Medium' },
      { description: 'Vacuum carpet / mop floor', frequency: Frequency.Weekly, estimatedMinutes: 10, priority: 'Medium' },
      { description: 'Dust ceiling fan/light fixtures', frequency: Frequency.Monthly, estimatedMinutes: 5, priority: 'Low' },
    ],
  },
  [RoomType.Hallway]: {
    roomType: RoomType.Hallway,
    defaultName: 'Hallway',
    icon: 'ArrowRightLeft',
    description: 'Carpet, decor, surfaces',
    tasks: [
      { description: 'Vacuum carpet / mop floor', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Medium' },
      { description: 'Dust any hallway furniture or decor', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Low' },
    ],
  },
  [RoomType.Basement]: {
    roomType: RoomType.Basement,
    defaultName: 'Basement',
    icon: 'ArrowDownToLine',
    description: 'Surfaces, furniture, floors, cobwebs',
    tasks: [
      { description: 'Dust all surfaces and shelving', frequency: Frequency.Monthly, estimatedMinutes: 10, priority: 'Low' },
      { description: 'Wipe down any furniture', frequency: Frequency.Monthly, estimatedMinutes: 5, priority: 'Low' },
      { description: 'Vacuum carpet thoroughly', frequency: Frequency.Weekly, estimatedMinutes: 15, priority: 'Medium' },
      { description: 'Check for cobwebs in corners/ceiling', frequency: Frequency.Monthly, estimatedMinutes: 5, priority: 'Low' },
    ],
  },
  [RoomType.LaundryRoom]: {
    roomType: RoomType.LaundryRoom,
    defaultName: 'Laundry Room',
    icon: 'WashingMachine',
    description: 'Washer, dryer, surfaces, floors',
    tasks: [
      { description: 'Wipe down washer and dryer exterior', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Medium' },
      { description: 'Clean washer door seal and detergent dispenser', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'High' },
      { description: 'Clean lint trap and dryer vent area', frequency: Frequency.Weekly, estimatedMinutes: 3, priority: 'High' },
      { description: 'Wipe counters and folding surfaces', frequency: Frequency.Weekly, estimatedMinutes: 3, priority: 'Medium' },
      { description: 'Sweep and mop floor', frequency: Frequency.Weekly, estimatedMinutes: 10, priority: 'Medium' },
      { description: 'Clean utility sink (if present)', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Medium' },
      { description: 'Organize laundry supplies', frequency: Frequency.Monthly, estimatedMinutes: 5, priority: 'Low' },
    ],
  },
  [RoomType.General]: {
    roomType: RoomType.General,
    defaultName: 'Whole House',
    icon: 'Home',
    description: 'Baseboards, fans, windows, switches',
    tasks: [
      { description: 'Vacuum all baseboards', frequency: Frequency.Monthly, estimatedMinutes: 20, priority: 'Medium' },
      { description: 'Dust ceiling fan blades (all rooms)', frequency: Frequency.Monthly, estimatedMinutes: 15, priority: 'Low' },
      { description: 'Clean interior glass on windows and sliding doors', frequency: Frequency.Weekly, estimatedMinutes: 15, priority: 'Medium' },
      { description: 'Spot-clean any visible marks on walls', frequency: Frequency.Monthly, estimatedMinutes: 10, priority: 'Low' },
      { description: 'Wipe light switches and door handles throughout', frequency: Frequency.Weekly, estimatedMinutes: 10, priority: 'High' },
      { description: 'Shake out or vacuum entry mats/rugs', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Medium' },
    ],
  },
};

export const INITIAL_HOUSE_DESC = `
Main floor is kitchen dining room entryway office half bathroom and living room, mix of carpet and hardwood floors I’d estimate 1500 sqft. Upstairs is main bedroom and 3 kid bedrooms and 1 guest bedroom, all carpet, 2 bathrooms approx 1200 sqft. Basement is partially finished with carpet 600 sqft.
We have 3 kids and 2 dogs.
`;

export const INITIAL_TASKS_RAW = `
House Cleaning Checklist
Main Floor (~1,300 sq ft)
Kitchen
	∙	Wipe down all countertops and backsplash
	∙	Clean exterior of appliances (fridge, oven, microwave, dishwasher)
	∙	Clean inside microwave
	∙	Scrub sink and polish fixtures
	∙	Wipe cabinet fronts (especially around handles)
	∙	Clean stovetop and range hood
	∙	Empty trash and replace liner
	∙	Mop hardwood floors
Dining Room
	∙	Dust table and chairs
	∙	Wipe down table surface
	∙	Dust any buffet/sideboard/shelving
	∙	Vacuum carpet / mop hardwood
Living Room
	∙	Dust all surfaces (TV stand, shelves, end tables)
	∙	Wipe down TV screen and electronics
	∙	Fluff and arrange couch cushions and pillows
	∙	Vacuum carpet and under furniture edges
	∙	Vacuum upholstered furniture (dog hair)
Office
	∙	Dust desk and shelving
	∙	Wipe down desk surface
	∙	Dust electronics/monitors
	∙	Vacuum carpet / mop hardwood
Entryway
	∙	Wipe down door and door handle
	∙	Clean any mirrors or glass
	∙	Dust shoe rack/coat hooks
	∙	Mop/vacuum floor
Half Bathroom
	∙	Scrub and disinfect toilet (inside and out)
	∙	Clean sink and polish fixtures
	∙	Wipe down counter and mirror
	∙	Empty trash
	∙	Mop floor

Upstairs (~1,100 sq ft)
Main Bedroom
	∙	Change bed linens (if provided/requested)
	∙	Make bed neatly
	∙	Dust nightstands, dresser, and all surfaces
	∙	Dust ceiling fan/light fixtures
	∙	Vacuum carpet including under bed edges
	∙	Vacuum any upholstered furniture
3 Kid Bedrooms (each)
	∙	Make beds / straighten bedding
	∙	Dust all surfaces (dressers, desks, shelves)
	∙	Organize visible clutter neatly (don’t discard)
	∙	Vacuum carpet thoroughly
Guest Bedroom
	∙	Dust all surfaces
	∙	Make bed / fluff pillows
	∙	Vacuum carpet
Bathroom 1 & 2 (each)
	∙	Scrub and disinfect toilet
	∙	Clean tub/shower (scrub walls, floor, fixtures)
	∙	Clean sink and polish fixtures
	∙	Wipe down counters and mirror
	∙	Wipe cabinet fronts
	∙	Empty trash
	∙	Mop floor
Upstairs Hallway
	∙	Vacuum carpet
	∙	Dust any hallway furniture or decor

Basement (~600 sq ft finished)
	∙	Dust all surfaces and shelving
	∙	Wipe down any furniture
	∙	Vacuum carpet thoroughly
	∙	Check for cobwebs in corners/ceiling

Whole-House Extras (Dog & Kid Friendly)
	∙	Vacuum all baseboards
	∙	Dust ceiling fan blades (all rooms)
	∙	Clean interior glass on windows and sliding doors (nose prints!)
	∙	Spot-clean any visible marks on walls
	∙	Wipe light switches and door handles throughout
	∙	Shake out or vacuum entry mats/rugs
`;

// Helper to derive scheduledDay from frequency for monthly/quarterly tasks
const getDefaultScheduledDay = (frequency: Frequency, index: number): number | undefined => {
  switch (frequency) {
    case Frequency.Daily:
      return undefined; // Daily tasks don't need scheduledDay
    case Frequency.Monthly:
    case Frequency.Quarterly:
      // Stagger monthly tasks across different days of the month
      return ((index * 7) % 28) + 1; // Days 1, 8, 15, 22, etc.
    default:
      return undefined; // Weekly/BiWeekly will be set by optimizer
  }
};

const RAW_LIST: Omit<Task, 'nextDueDate' | 'isDue'>[] = [
  // Kitchen
  { id: 'k1', room: 'Kitchen', roomType: RoomType.Kitchen, description: 'Wipe down all countertops and backsplash', frequency: Frequency.Daily, estimatedMinutes: 10, priority: 'High' },
  { id: 'k2', room: 'Kitchen', roomType: RoomType.Kitchen, description: 'Clean exterior of appliances (fridge, oven, microwave, dishwasher)', frequency: Frequency.Weekly, estimatedMinutes: 15, priority: 'Medium' },
  { id: 'k3', room: 'Kitchen', roomType: RoomType.Kitchen, description: 'Clean inside microwave', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Medium' },
  { id: 'k4', room: 'Kitchen', roomType: RoomType.Kitchen, description: 'Scrub sink and polish fixtures', frequency: Frequency.Daily, estimatedMinutes: 5, priority: 'High' },
  { id: 'k5', room: 'Kitchen', roomType: RoomType.Kitchen, description: 'Wipe cabinet fronts (especially around handles)', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Low' },
  { id: 'k6', room: 'Kitchen', roomType: RoomType.Kitchen, description: 'Clean stovetop and range hood', frequency: Frequency.Daily, estimatedMinutes: 5, priority: 'Medium' },
  { id: 'k7', room: 'Kitchen', roomType: RoomType.Kitchen, description: 'Empty trash and replace liner', frequency: Frequency.Daily, estimatedMinutes: 2, priority: 'High' },
  { id: 'k8', room: 'Kitchen', roomType: RoomType.Kitchen, description: 'Mop hardwood floors', frequency: Frequency.Weekly, estimatedMinutes: 15, priority: 'Medium' },

  // Dining Room
  { id: 'd1', room: 'Dining Room', roomType: RoomType.DiningRoom, description: 'Dust table and chairs', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Medium' },
  { id: 'd2', room: 'Dining Room', roomType: RoomType.DiningRoom, description: 'Wipe down table surface', frequency: Frequency.Daily, estimatedMinutes: 2, priority: 'Low' },
  { id: 'd3', room: 'Dining Room', roomType: RoomType.DiningRoom, description: 'Dust any buffet/sideboard/shelving', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Low' },
  { id: 'd4', room: 'Dining Room', roomType: RoomType.DiningRoom, description: 'Vacuum carpet / mop hardwood', frequency: Frequency.Weekly, estimatedMinutes: 10, priority: 'Medium' },

  // Living Room
  { id: 'lr1', room: 'Living Room', roomType: RoomType.LivingRoom, description: 'Dust all surfaces (TV stand, shelves, end tables)', frequency: Frequency.Weekly, estimatedMinutes: 10, priority: 'Medium' },
  { id: 'lr2', room: 'Living Room', roomType: RoomType.LivingRoom, description: 'Wipe down TV screen and electronics', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Low' },
  { id: 'lr3', room: 'Living Room', roomType: RoomType.LivingRoom, description: 'Fluff and arrange couch cushions and pillows', frequency: Frequency.Daily, estimatedMinutes: 3, priority: 'Low' },
  { id: 'lr4', room: 'Living Room', roomType: RoomType.LivingRoom, description: 'Vacuum carpet and under furniture edges', frequency: Frequency.Weekly, estimatedMinutes: 15, priority: 'High' },
  { id: 'lr5', room: 'Living Room', roomType: RoomType.LivingRoom, description: 'Vacuum upholstered furniture (dog hair)', frequency: Frequency.Weekly, estimatedMinutes: 10, priority: 'High' },

  // Office
  { id: 'o1', room: 'Office', roomType: RoomType.Office, description: 'Dust desk and shelving', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Medium' },
  { id: 'o2', room: 'Office', roomType: RoomType.Office, description: 'Wipe down desk surface', frequency: Frequency.Weekly, estimatedMinutes: 2, priority: 'Medium' },
  { id: 'o3', room: 'Office', roomType: RoomType.Office, description: 'Dust electronics/monitors', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Low' },
  { id: 'o4', room: 'Office', roomType: RoomType.Office, description: 'Vacuum carpet / mop hardwood', frequency: Frequency.Weekly, estimatedMinutes: 10, priority: 'Medium' },

  // Entryway
  { id: 'e1', room: 'Entryway', roomType: RoomType.Entryway, description: 'Wipe down door and door handle', frequency: Frequency.Weekly, estimatedMinutes: 2, priority: 'High' },
  { id: 'e2', room: 'Entryway', roomType: RoomType.Entryway, description: 'Clean any mirrors or glass', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Medium' },
  { id: 'e3', room: 'Entryway', roomType: RoomType.Entryway, description: 'Dust shoe rack/coat hooks', frequency: Frequency.Weekly, estimatedMinutes: 2, priority: 'Low' },
  { id: 'e4', room: 'Entryway', roomType: RoomType.Entryway, description: 'Mop/vacuum floor', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'High' },

  // Half Bath
  { id: 'hb1', room: 'Half Bathroom', roomType: RoomType.Bathroom, description: 'Scrub and disinfect toilet (inside and out)', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'High' },
  { id: 'hb2', room: 'Half Bathroom', roomType: RoomType.Bathroom, description: 'Clean sink and polish fixtures', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'High' },
  { id: 'hb3', room: 'Half Bathroom', roomType: RoomType.Bathroom, description: 'Wipe down counter and mirror', frequency: Frequency.Weekly, estimatedMinutes: 3, priority: 'Medium' },
  { id: 'hb4', room: 'Half Bathroom', roomType: RoomType.Bathroom, description: 'Empty trash', frequency: Frequency.Weekly, estimatedMinutes: 1, priority: 'Medium' },
  { id: 'hb5', room: 'Half Bathroom', roomType: RoomType.Bathroom, description: 'Mop floor', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Medium' },

  // Main Bedroom
  { id: 'mb1', room: 'Main Bedroom', roomType: RoomType.Bedroom, description: 'Change bed linens', frequency: Frequency.Weekly, estimatedMinutes: 10, priority: 'Medium' },
  { id: 'mb2', room: 'Main Bedroom', roomType: RoomType.Bedroom, description: 'Make bed neatly', frequency: Frequency.Daily, estimatedMinutes: 3, priority: 'Low' },
  { id: 'mb3', room: 'Main Bedroom', roomType: RoomType.Bedroom, description: 'Dust nightstands, dresser, and all surfaces', frequency: Frequency.Weekly, estimatedMinutes: 10, priority: 'Medium' },
  { id: 'mb4', room: 'Main Bedroom', roomType: RoomType.Bedroom, description: 'Dust ceiling fan/light fixtures', frequency: Frequency.Monthly, estimatedMinutes: 5, priority: 'Low' },
  { id: 'mb5', room: 'Main Bedroom', roomType: RoomType.Bedroom, description: 'Vacuum carpet including under bed edges', frequency: Frequency.Weekly, estimatedMinutes: 10, priority: 'Medium' },
  { id: 'mb6', room: 'Main Bedroom', roomType: RoomType.Bedroom, description: 'Vacuum any upholstered furniture', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Low' },

  // Kid Bedrooms
  { id: 'kb1', room: 'Kid Bedrooms', roomType: RoomType.Bedroom, description: 'Make beds / straighten bedding', frequency: Frequency.Daily, estimatedMinutes: 10, priority: 'Medium' },
  { id: 'kb2', room: 'Kid Bedrooms', roomType: RoomType.Bedroom, description: 'Dust all surfaces (dressers, desks, shelves)', frequency: Frequency.Weekly, estimatedMinutes: 15, priority: 'Medium' },
  { id: 'kb3', room: 'Kid Bedrooms', roomType: RoomType.Bedroom, description: 'Organize visible clutter neatly', frequency: Frequency.Daily, estimatedMinutes: 15, priority: 'High' },
  { id: 'kb4', room: 'Kid Bedrooms', roomType: RoomType.Bedroom, description: 'Vacuum carpet thoroughly', frequency: Frequency.Weekly, estimatedMinutes: 15, priority: 'High' },

  // Guest Bedroom
  { id: 'gb1', room: 'Guest Bedroom', roomType: RoomType.Bedroom, description: 'Dust all surfaces', frequency: Frequency.Monthly, estimatedMinutes: 5, priority: 'Low' },
  { id: 'gb2', room: 'Guest Bedroom', roomType: RoomType.Bedroom, description: 'Make bed / fluff pillows', frequency: Frequency.Monthly, estimatedMinutes: 5, priority: 'Low' },
  { id: 'gb3', room: 'Guest Bedroom', roomType: RoomType.Bedroom, description: 'Vacuum carpet', frequency: Frequency.Monthly, estimatedMinutes: 10, priority: 'Low' },

  // Full Bathrooms (1 & 2)
  { id: 'fb1', room: 'Upstairs Bathrooms', roomType: RoomType.Bathroom, description: 'Scrub and disinfect toilets', frequency: Frequency.Weekly, estimatedMinutes: 10, priority: 'High' },
  { id: 'fb2', room: 'Upstairs Bathrooms', roomType: RoomType.Bathroom, description: 'Clean tub/shower (scrub walls, floor, fixtures)', frequency: Frequency.Weekly, estimatedMinutes: 20, priority: 'High' },
  { id: 'fb3', room: 'Upstairs Bathrooms', roomType: RoomType.Bathroom, description: 'Clean sink and polish fixtures', frequency: Frequency.Weekly, estimatedMinutes: 10, priority: 'Medium' },
  { id: 'fb4', room: 'Upstairs Bathrooms', roomType: RoomType.Bathroom, description: 'Wipe down counters and mirror', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Medium' },
  { id: 'fb5', room: 'Upstairs Bathrooms', roomType: RoomType.Bathroom, description: 'Wipe cabinet fronts', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Low' },
  { id: 'fb6', room: 'Upstairs Bathrooms', roomType: RoomType.Bathroom, description: 'Empty trash', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Medium' },
  { id: 'fb7', room: 'Upstairs Bathrooms', roomType: RoomType.Bathroom, description: 'Mop floors', frequency: Frequency.Weekly, estimatedMinutes: 10, priority: 'High' },

  // Hallway
  { id: 'h1', room: 'Upstairs Hallway', roomType: RoomType.Hallway, description: 'Vacuum carpet', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Medium' },
  { id: 'h2', room: 'Upstairs Hallway', roomType: RoomType.Hallway, description: 'Dust any hallway furniture or decor', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Low' },

  // Basement
  { id: 'bm1', room: 'Basement', roomType: RoomType.Basement, description: 'Dust all surfaces and shelving', frequency: Frequency.Monthly, estimatedMinutes: 10, priority: 'Low' },
  { id: 'bm2', room: 'Basement', roomType: RoomType.Basement, description: 'Wipe down any furniture', frequency: Frequency.Monthly, estimatedMinutes: 5, priority: 'Low' },
  { id: 'bm3', room: 'Basement', roomType: RoomType.Basement, description: 'Vacuum carpet thoroughly', frequency: Frequency.Weekly, estimatedMinutes: 15, priority: 'Medium' },
  { id: 'bm4', room: 'Basement', roomType: RoomType.Basement, description: 'Check for cobwebs in corners/ceiling', frequency: Frequency.Monthly, estimatedMinutes: 5, priority: 'Low' },

  // Whole House Extras
  { id: 'wh1', room: 'Whole House', roomType: RoomType.General, description: 'Vacuum all baseboards', frequency: Frequency.Monthly, estimatedMinutes: 20, priority: 'Medium' },
  { id: 'wh2', room: 'Whole House', roomType: RoomType.General, description: 'Dust ceiling fan blades (all rooms)', frequency: Frequency.Monthly, estimatedMinutes: 15, priority: 'Low' },
  { id: 'wh3', room: 'Whole House', roomType: RoomType.General, description: 'Clean interior glass on windows and sliding doors', frequency: Frequency.Weekly, estimatedMinutes: 15, priority: 'Medium' },
  { id: 'wh4', room: 'Whole House', roomType: RoomType.General, description: 'Spot-clean any visible marks on walls', frequency: Frequency.Monthly, estimatedMinutes: 10, priority: 'Low' },
  { id: 'wh5', room: 'Whole House', roomType: RoomType.General, description: 'Wipe light switches and door handles throughout', frequency: Frequency.Weekly, estimatedMinutes: 10, priority: 'High' },
  { id: 'wh6', room: 'Whole House', roomType: RoomType.General, description: 'Shake out or vacuum entry mats/rugs', frequency: Frequency.Weekly, estimatedMinutes: 5, priority: 'Medium' },
];

// Build fallback tasks with recurrence fields
const buildFallbackTasks = (): Task[] => {
  const today = getToday();

  // First pass: create tasks with scheduledDay for monthly/quarterly
  const tasksWithRecurrence: Task[] = RAW_LIST.map((t, index) => ({
    ...t,
    scheduledDay: getDefaultScheduledDay(t.frequency, index),
    anchorDate: t.frequency === Frequency.BiWeekly || t.frequency === Frequency.Quarterly ? today : undefined,
    completedDates: [],
    nextDueDate: today, // Temporary, will be computed below
    isDue: false, // Temporary, will be computed below
  }));

  // Run optimizer to assign scheduledDay for weekly/bi-weekly tasks
  const assignments = optimizeWeeklySchedule(tasksWithRecurrence);
  for (const { taskId, scheduledDay } of assignments) {
    const task = tasksWithRecurrence.find(t => t.id === taskId);
    if (task) task.scheduledDay = scheduledDay;
  }

  // Compute nextDueDate and isDue from recurrence
  for (const task of tasksWithRecurrence) {
    task.nextDueDate = getNextOccurrence(task, today);
    task.isDue = isTaskDueOnDate(task, today);
  }

  return tasksWithRecurrence;
};

export const FALLBACK_TASKS: Task[] = buildFallbackTasks();
