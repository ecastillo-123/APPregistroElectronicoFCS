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

let cargandoUrl = false;

export async function aplicarUrlGuardada(): Promise<void> {
  if (cargandoUrl) {
    return;
  }
  cargandoUrl = true;
  try {
    const guardada = await storage.getApiUrl();
    if (guardada && guardada.trim().length > 0) {
      api.defaults.baseURL = guardada.trim().replace(/\/+$/, '');
    }
  } finally {
    cargandoUrl = false;
  }
}

export function getApiBaseURL(): string {
  return api.defaults.baseURL ?? API_URL;
}

export function setApiBaseURL(url: string): void {
  const limpia = url.trim().replace(/\/+$/, '');
  if (!limpia) {
    return;
  }
  api.defaults.baseURL = limpia;
  storage.setApiUrl(limpia);
}

export function resetApiBaseURL(): void {
  api.defaults.baseURL = API_URL;
  storage.clearApiUrl();
}

export function isNetworkError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED';
  }
  return false;
}

interface ErrorDetalle {
  mensaje: string;
  detalle: string;
}

export function mensajeDeError(error: unknown): string {
  return priorizarDetalle(error).mensaje;
}

export function detalleDeError(error: unknown): string {
  return priorizarDetalle(error).detalle;
}

function priorizarDetalle(error: unknown): ErrorDetalle {
  if (isErrorObvio(error)) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    return desglosarAxios(error);
  }

  if (error instanceof Error) {
    return {
      mensaje: 'Ocurrió un error inesperado.',
      detalle: `${error.name}: ${error.message}`,
    };
  }

  return {
    mensaje: 'Ocurrió un error inesperado.',
    detalle: 'Se recibió una respuesta sin formato conocido.',
  };
}

function isErrorObvio(error: unknown): error is ErrorDetalle {
  return (
    typeof error === 'object' &&
    error !== null &&
    'mensaje' in error &&
    'detalle' in error
  );
}

function desglosarAxios(error: import('axios').AxiosError): ErrorDetalle {
  const method = (error.config?.method ?? 'GET').toUpperCase();
  const urlRelativa = error.config?.url ?? '';
  const base = error.config?.baseURL ?? API_URL;
  const urlCompleta = `${base}${urlRelativa}`;

  const data = error.response?.data as ApiError | undefined;

  const primeraValidacion = data?.errors
    ? Object.values(data.errors).flat()[0]
    : undefined;

  if (primeraValidacion) {
    return {
      mensaje: primeraValidacion,
      detalle: construirDetalle(error, method, urlCompleta, data),
    };
  }

  if (data?.message) {
    return {
      mensaje: data.message,
      detalle: construirDetalle(error, method, urlCompleta, data),
    };
  }

  if (error.response) {
    const status = error.response.status;
    const texto = `${method} ${urlCompleta}`;
    const server = data ? extraerTextoServer(data) : '';
    return {
      mensaje: `Error ${status} en la petición.`,
      detalle: [
        `Método: ${method}`,
        `URL: ${urlCompleta}`,
        `Status HTTP: ${status}`,
        `Respuesta del servidor: ${server || 'vacía'}`,
      ].join('\n'),
    };
  }

  if (error.code === 'ECONNABORTED') {
    return {
      mensaje: 'La conexión tardó demasiado. Verifica tu red y que el servidor esté encendido.',
      detalle: [
        `Método: ${method}`,
        `URL: ${urlCompleta}`,
        `Código: ${error.code ?? 'ECONNABORTED'}`,
        'La petición superó el tiempo de espera (15 s).',
      ].join('\n'),
    };
  }

  if (error.code === 'ERR_NETWORK' || error.request) {
    return {
      mensaje:
        'No se pudo conectar con el servidor. Revisa que el sistema esté en línea y que el teléfono alcance esta dirección.',
      detalle: [
        `Método: ${method}`,
        `URL de destino: ${urlCompleta}`,
        `Código: ${error.code ?? 'sin código'}`,
        `Mensaje: ${error.message}`,
        '',
        'Consejos:',
        '• Verifica que el servidor esté levantado en ese puerto.',
        '• Confirma que el teléfono esté en la MISMA red del servidor.',
        '• Abre el puerto en el firewall de Windows (perfil de red actual).',
      ].join('\n'),
    };
  }

  return {
    mensaje: 'Ocurrió un error inesperado del cliente.',
    detalle: `${method} ${urlCompleta}\nCódigo: ${error.code ?? 'n/d'}\nMensaje: ${error.message}`,
  };
}

function construirDetalle(
  error: import('axios').AxiosError,
  method: string,
  url: string,
  data: ApiError | undefined,
): string {
  const status = error.response?.status;
  const server = data ? extraerTextoServer(data) : '';
  return [
    `Método: ${method}`,
    `URL: ${url}`,
    `Status HTTP: ${status ?? 'n/d'}`,
    `Respuesta del servidor: ${server || 'vacía'}`,
  ].join('\n');
}

function extraerTextoServer(data: ApiError): string {
  const partes: string[] = [];
  if (data.message) {
    partes.push(data.message);
  }
  if (data.errors) {
    for (const [campo, msgs] of Object.entries(data.errors)) {
      partes.push(`${campo}: ${msgs.join(', ')}`);
    }
  }
  return partes.join(' | ');
}