import axios from 'axios';
import { API_URL, storage } from './config';
import type { ApiError } from './types';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await storage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function mensajeDeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;

    if (data?.errors) {
      const first = Object.values(data.errors).flat()[0];
      if (first) {
        return first;
      }
    }

    if (data?.message) {
      return data.message;
    }

    if (error.response) {
      return `Error ${error.response.status}: no se pudo completar la petición.`;
    }

    if (error.code === 'ECONNABORTED') {
      return 'La conexión tardó demasiado. Verifica tu red.';
    }

    return 'No se pudo conectar con el servidor. Verifica que el sistema esté en línea y la URL sea correcta.';
  }

  return 'Ocurrió un error inesperado.';
}
