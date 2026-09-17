import * as LocalAuthentication from 'expo-local-authentication';
import { AuthenticationType } from 'expo-local-authentication';
import type { CheckinType } from './types';

export interface BiometricAvailability {
  available: boolean;
  types: CheckinType[];
  reason?: string;
}

export const CHECKIN_TYPE_LABELS: Record<CheckinType, string> = {
  huella: 'Huella dactilar',
  facial: 'Reconocimiento facial',
};

function toCheckinType(authType: AuthenticationType): CheckinType | null {
  if (authType === AuthenticationType.FINGERPRINT) {
    return 'huella';
  }
  if (authType === AuthenticationType.FACIAL_RECOGNITION) {
    return 'facial';
  }
  return null;
}

/**
 * Checks which biometric authentication methods are available on this device.
 */
export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  try {
    const hardware = await LocalAuthentication.hasHardwareAsync();
    if (!hardware) {
      return {
        available: false,
        types: [],
        reason: 'Tu dispositivo no soporta autenticación biométrica.',
      };
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      return {
        available: false,
        types: [],
        reason: 'Configura huella o reconocimiento facial en tu dispositivo.',
      };
    }

    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const types: CheckinType[] = [];

    for (const authType of supportedTypes) {
      const checkinType = toCheckinType(authType);
      if (checkinType && !types.includes(checkinType)) {
        types.push(checkinType);
      }
    }

    if (types.length === 0) {
      return {
        available: false,
        types: [],
        reason: 'No se detectó un método biométrico usable en este dispositivo.',
      };
    }

    return { available: true, types };
  } catch {
    return {
      available: false,
      types: [],
      reason: 'No se pudo verificar la disponibilidad biométrica.',
    };
  }
}

/**
 * Performs biometric authentication using the selected checkin type.
 * Returns true when the user successfully authenticates.
 */
export async function authenticateWithType(checkinType: CheckinType): Promise<boolean> {
  try {
    const methodLabel = CHECKIN_TYPE_LABELS[checkinType];
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Verifica tu ${methodLabel.toLowerCase()} para registrar la checada`,
      disableDeviceFallback: true,
      cancelLabel: 'Cancelar',
    });

    return result.success;
  } catch {
    return false;
  }
}
