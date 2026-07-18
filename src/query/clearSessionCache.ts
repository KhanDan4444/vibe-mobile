import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient, QUERY_CACHE_STORAGE_KEY } from '@/src/query/client';

/**
 * Drop in-memory and persisted query cache when signing out or switching accounts.
 * Offline write queue is preserved so pending enrolls/payments can sync after re-login;
 * AuthContext prunes foreign-gym jobs via retainOfflineQueueForGym.
 */
export async function clearSessionCache(): Promise<void> {
  queryClient.clear();
  await AsyncStorage.removeItem(QUERY_CACHE_STORAGE_KEY);
}
