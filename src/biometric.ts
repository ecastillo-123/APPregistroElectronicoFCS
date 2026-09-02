import * as LocalAuthentication from 'expo-local-authentication';
import type { CheckinType } from './types';

export interface BiometricAvailability {
  available: boolean;
  types: CheckinType[];
  reason?: string;
}

/**
 * Checks if biometric authentication is available on this device.
 */
export async function isBiometricAvailable(): Promise<BiometricAvailability> {
  try {
    const hardware = await LocalAuthentication.hasHardwareAsync();
    if (!hardware) {
      return { available: false, types: [], reason: 'Tu dispositivo no soporta autenticación biométrica.' };
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

    if (supportedTypes.includes(LocalAuthentication.LocalAuthenticationType.FACIAL)) {
      types.push('facial');
    }
    if (supportedTypes.includes(LocalAuthentication.LocalAuthenticationType.FINGERPRINT)) {
      types.push('huella');
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
 * Performs biometric authentication and returns the type used, or null if cancelled/failed.
 */
export async function authenticateForCheckin(): Promise<CheckinType | null> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Verifica tu identidad para registrar la checada',
      disableDeviceFallback: true,
      cancelLabel: 'Cancelar',
    });

    if (result.success) {
      // Determine which type was used based on available hardware
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (supportedTypes.includes(LocalAuthentication.LocalAuthenticationType.FACIAL)) {
        return 'facial';
      }
      if (supportedTypes.includes(LocalAuthentication.LocalAuthenticationType.FINGERPRINT)) {
        return 'huella';
      }
      // Fallback to huella if we can't determine
      return 'huella';
    }

    return null;
  } catch {
    return null;
  }
}
