import AsyncStorage from '@react-native-async-storage/async-storage';
import { writeOfflineQueue } from '@/src/offline/queue';
import { queryClient, QUERY_CACHE_STORAGE_KEY } from '@/src/query/client';

/** Drop in-memory and persisted gym data when signing out or switching accounts. */
export async function clearSessionCache(): Promise<void> {
  queryClient.clear();
  await Promise.all([
    AsyncStorage.removeItem(QUERY_CACHE_STORAGE_KEY),
    writeOfflineQueue([]),
  ]);
}
