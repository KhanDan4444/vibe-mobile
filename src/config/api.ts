/**
 * Backend API base URL.
 * Physical device: set EXPO_PUBLIC_API_URL to your LAN IP, e.g. http://192.168.1.10:5000
 * Android emulator: http://10.0.2.2:5000
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:5000';
