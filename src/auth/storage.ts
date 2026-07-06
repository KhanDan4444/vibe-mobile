import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'vibe_auth_token';
const GYM_NAME_KEY = 'vibe_gym_name';

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getStoredGymName(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(GYM_NAME_KEY);
  } catch {
    return null;
  }
}

export async function setStoredGymName(name: string): Promise<void> {
  await SecureStore.setItemAsync(GYM_NAME_KEY, name);
}

export async function clearStoredGymName(): Promise<void> {
  await SecureStore.deleteItemAsync(GYM_NAME_KEY);
}
