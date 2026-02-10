import React, { createContext, useContext, useState, useEffect } from 'react';
import { Room } from '../types';
import { roomService } from '../services/roomService';

interface RoomsContextValue {
  rooms: Room[];
  loading: boolean;
  getRoomById: (roomId: string) => Room | undefined;
  getRoomByName: (name: string) => Room | undefined;
  createRoom: (name: string, roomType: any, icon: string) => Promise<Room>;
  updateRoom: (roomId: string, updates: Partial<Room>) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  reorderRooms: (roomIds: string[]) => Promise<void>;
}

const RoomsContext = createContext<RoomsContextValue | null>(null);

export const useRooms = () => {
  const context = useContext(RoomsContext);
  if (!context) {
    throw new Error('useRooms must be used within RoomsProvider');
  }
  return context;
};

interface RoomsProviderProps {
  children: React.ReactNode;
  householdId: string | null;
}

export const RoomsProvider: React.FC<RoomsProviderProps> = ({ children, householdId }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!householdId) {
      setRooms([]);
      setLoading(false);
      return;
    }

    // Subscribe to room updates
    const unsubscribe = roomService.subscribeRooms(householdId, (updatedRooms) => {
      setRooms(updatedRooms);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [householdId]);

  const getRoomById = (roomId: string) => {
    return rooms.find(r => r.id === roomId);
  };

  const getRoomByName = (name: string) => {
    return rooms.find(r => r.name === name);
  };

  const createRoom = async (name: string, roomType: any, icon: string) => {
    if (!householdId) throw new Error('No household ID');
    return await roomService.createRoom(householdId, name, roomType, icon);
  };

  const updateRoom = async (roomId: string, updates: Partial<Room>) => {
    if (!householdId) throw new Error('No household ID');
    await roomService.updateRoom(householdId, roomId, updates);
  };

  const deleteRoom = async (roomId: string) => {
    if (!householdId) throw new Error('No household ID');
    await roomService.deleteRoom(householdId, roomId);
  };

  const reorderRooms = async (roomIds: string[]) => {
    if (!householdId) throw new Error('No household ID');
    await roomService.reorderRooms(householdId, roomIds);
  };

  const value: RoomsContextValue = {
    rooms,
    loading,
    getRoomById,
    getRoomByName,
    createRoom,
    updateRoom,
    deleteRoom,
    reorderRooms,
  };

  return <RoomsContext.Provider value={value}>{children}</RoomsContext.Provider>;
};
