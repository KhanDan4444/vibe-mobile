import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'vibe_station_device_token';

export async function getStationDeviceToken(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    return value && value.length >= 32 ? value : null;
  } catch {
    return null;
  }
}

export async function setStationDeviceToken(token: string | null): Promise<void> {
  try {
    if (!token) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEY, token);
  } catch {
    /* ignore */
  }
}

export async function clearStationDeviceToken(): Promise<void> {
  await setStationDeviceToken(null);
}
