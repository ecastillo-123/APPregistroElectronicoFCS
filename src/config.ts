import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const STORAGE_UUID = 'checador.device.uuid';
const STORAGE_TOKEN = 'checador.auth.token';

export const API_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://10.0.2.2:8000/api/v1';

export async function getDeviceId(): Promise<string> {
  const stored = await SecureStore.getItemAsync(STORAGE_UUID);
  if (stored) {
    return stored;
  }

  let id: string | null = null;

  try {
    if (Platform.OS === 'android') {
      id = Application.getAndroidId();
    } else {
      id = await Application.getIosIdForVendorAsync();
    }
  } catch {
    id = null;
  }

  const uuid =
    id && id.length > 0
      ? `android-${id}`
      : `uuid-${Crypto.randomUUID()}`;

  await SecureStore.setItemAsync(STORAGE_UUID, uuid);

  return uuid;
}

export function getDeviceInfo() {
  return {
    uuid: '',
    nombre: Device.deviceName ?? undefined,
    marca: Device.brand ?? undefined,
    modelo: Device.modelName ?? undefined,
    plataforma: Platform.OS,
    version_so: Device.osVersion ?? Platform.Version,
    app_version: Application.nativeApplicationVersion ?? '1.0.0',
  };
}

export const storage = {
  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(STORAGE_TOKEN);
  },
  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(STORAGE_TOKEN, token);
  },
  async clearToken(): Promise<void> {
    await SecureStore.deleteItemAsync(STORAGE_TOKEN);
  },
};
