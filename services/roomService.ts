import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { Room, RoomType } from '../types';

const getRoomsCollection = (householdId: string) =>
  collection(db, `households/${householdId}/rooms`);

export const roomService = {
  async getRooms(householdId: string): Promise<Room[]> {
    const roomsCol = getRoomsCollection(householdId);
    const q = query(roomsCol, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Room);
  },

  subscribeRooms(householdId: string, callback: (rooms: Room[]) => void): () => void {
    const roomsCol = getRoomsCollection(householdId);
    const q = query(roomsCol, orderBy('order', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const rooms = snapshot.docs.map(doc => doc.data() as Room);
      callback(rooms);
    });
  },

  async getRoom(householdId: string, roomId: string): Promise<Room | null> {
    const roomDoc = doc(getRoomsCollection(householdId), roomId);
    const snapshot = await getDoc(roomDoc);
    return snapshot.exists() ? (snapshot.data() as Room) : null;
  },

  async createRoom(
    householdId: string,
    name: string,
    roomType: RoomType,
    icon: string
  ): Promise<Room> {
    const roomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Get current max order
    const existingRooms = await this.getRooms(householdId);
    const maxOrder = existingRooms.length > 0
      ? Math.max(...existingRooms.map(r => r.order))
      : -1;

    const room: Room = {
      id: roomId,
      householdId,
      name,
      roomType,
      icon,
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(getRoomsCollection(householdId), roomId), room);
    return room;
  },

  async updateRoom(
    householdId: string,
    roomId: string,
    updates: Partial<Omit<Room, 'id' | 'householdId' | 'createdAt'>>
  ): Promise<void> {
    const roomDoc = doc(getRoomsCollection(householdId), roomId);
    const cleanUpdates: any = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    await updateDoc(roomDoc, cleanUpdates);
  },

  async deleteRoom(householdId: string, roomId: string): Promise<void> {
    const roomDoc = doc(getRoomsCollection(householdId), roomId);
    await deleteDoc(roomDoc);
  },

  async reorderRooms(householdId: string, roomIds: string[]): Promise<void> {
    const updates = roomIds.map((roomId, index) =>
      updateDoc(doc(getRoomsCollection(householdId), roomId), { order: index })
    );
    await Promise.all(updates);
  },

  // Utility: get room ID by name (for migration)
  async findRoomByName(householdId: string, name: string): Promise<Room | null> {
    const rooms = await this.getRooms(householdId);
    return rooms.find(r => r.name === name) || null;
  },
};
