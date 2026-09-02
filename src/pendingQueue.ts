import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PendingCheckIn } from './types';

const STORAGE_PENDING_QUEUE = 'checador.pending_queue';

async function readQueue(): Promise<PendingCheckIn[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_PENDING_QUEUE);
    if (!raw) return [];
    return JSON.parse(raw) as PendingCheckIn[];
  } catch {
    return [];
  }
}

async function writeQueue(queue: PendingCheckIn[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_PENDING_QUEUE, JSON.stringify(queue));
}

/**
 * Saves a pending checkin to local storage.
 */
export async function savePendingCheckin(checkin: PendingCheckIn): Promise<void> {
  const queue = await readQueue();
  // Avoid duplicates by client_uuid
  const exists = queue.some((c) => c.client_uuid === checkin.client_uuid);
  if (!exists) {
    queue.push(checkin);
    await writeQueue(queue);
  }
}

/**
 * Retrieves all pending checkins ordered by pending_checkin_datetime (oldest first).
 */
export async function getPendingCheckins(): Promise<PendingCheckIn[]> {
  const queue = await readQueue();
  return queue.sort(
    (a, b) =>
      new Date(a.pending_checkin_datetime).getTime() -
      new Date(b.pending_checkin_datetime).getTime(),
  );
}

/**
 * Removes a single pending checkin by its client_uuid.
 */
export async function removePendingCheckin(clientUuid: string): Promise<void> {
  const queue = await readQueue();
  const filtered = queue.filter((c) => c.client_uuid !== clientUuid);
  await writeQueue(filtered);
}

/**
 * Clears all pending checkins.
 */
export async function clearPendingCheckins(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_PENDING_QUEUE);
}
