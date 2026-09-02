import { API_BASE_URL } from '@/src/config/api';
import { fetchWithTimeout } from '@/src/api/fetchWithTimeout';
import {
  clearStationDeviceToken,
  getStationDeviceToken,
  setStationDeviceToken,
} from '@/src/storage/stationDevice';

const STATION_DEVICE_HEADER = 'X-Station-Device-Token';
const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };

async function parseJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

async function stationHeaders(): Promise<Record<string, string>> {
  const deviceToken = await getStationDeviceToken();
  return deviceToken ? { [STATION_DEVICE_HEADER]: deviceToken } : {};
}

export type StationSessionResponse = {
  gym_name?: string;
  branch_name?: string;
  telegram_configured?: boolean;
  trusted?: {
    member_id: number;
    member_name: string;
    phone_masked?: string;
  } | null;
};

export type StationCheckInSuccess = {
  member?: { id: number; name: string };
  member_name?: string;
  visits_this_week?: number;
  visits_limit?: number | null;
  device_token?: string;
};

async function persistDeviceToken(data: { device_token?: string }) {
  if (data.device_token) {
    await setStationDeviceToken(data.device_token);
  }
}

export async function fetchStationSession(stationToken: string) {
  const qs = new URLSearchParams({ station: stationToken });
  const headers = await stationHeaders();
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/api/public/station-check-in/session?${qs}`,
    { headers: { ...JSON_HEADERS, ...headers } }
  );
  const data = await parseJson(res);
  return { res, data };
}

export async function requestStationOtp(stationToken: string, phone: string) {
  const headers = await stationHeaders();
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/public/station-check-in/request-otp`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, ...headers },
    body: JSON.stringify({ station: stationToken, phone }),
  });
  const data = await parseJson(res);
  return { res, data };
}

export async function verifyStationOtp(
  stationToken: string,
  payload: { phone: string; sessionId: string; otp: string }
) {
  const headers = await stationHeaders();
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/public/station-check-in/verify-otp`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, ...headers },
    body: JSON.stringify({
      station: stationToken,
      phone: payload.phone,
      session_id: payload.sessionId,
      otp: payload.otp,
    }),
  });
  const data = await parseJson(res);
  if (res.ok) {
    await persistDeviceToken(data);
  }
  return { res, data };
}

export async function trustedStationCheckIn(stationToken: string) {
  const headers = await stationHeaders();
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/public/station-check-in/check-in`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, ...headers },
    body: JSON.stringify({ station: stationToken }),
  });
  const data = await parseJson(res);
  if (!res.ok && data.code === 'DEVICE_NOT_TRUSTED') {
    await clearStationDeviceToken();
  }
  return { res, data };
}
