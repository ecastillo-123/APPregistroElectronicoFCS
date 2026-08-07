export interface WorkCenter {
  id: number;
  nombre: string;
  direccion?: string | null;
  lat: number;
  lng: number;
  radio_metros: number;
}

export interface Employee {
  id: number;
  numero_empleado: string;
  nombre_completo: string;
  email?: string | null;
  telefono?: string | null;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  employee: Employee | null;
  work_center: WorkCenter | null;
}

export interface CheckInResult {
  id: number;
  tipo: 'entrada' | 'salida';
  fecha?: string | null;
  dentro_rango: boolean;
  distancia_metros?: number | null;
  lat: number;
  lng: number;
  work_center?: {
    id: number;
    nombre: string;
    radio_metros: number;
  } | null;
}

export interface UltimaChecada {
  id: number;
  tipo: 'entrada' | 'salida';
  lat: number;
  lng: number;
  precision_metros?: number | null;
  distancia_metros?: number | null;
  dentro_rango: boolean;
  fecha?: string | null;
  work_center?: string | null;
  device?: string | null;
}

export interface EstadoResponse {
  success: boolean;
  user: UserProfile;
  ultima_checada: UltimaChecada | null;
  server_time: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: UserProfile;
}

export interface CheckInResponse {
  success: boolean;
  registrada: boolean;
  check_in: CheckInResult;
  mensaje: string;
}

export interface ApiError {
  message?: string;
  errors?: Record<string, string[]>;
}
