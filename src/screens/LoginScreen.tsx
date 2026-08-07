import { api, mensajeDeError } from '../api';
import { Button, Field, Input } from '../components/ui';
import { getDeviceId, getDeviceInfo, storage } from '../config';
import { colors, radii, shadow } from '../theme';
import type { LoginResponse } from '../types';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface Props {
  onLogin: (token: string) => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const deviceId = await getDeviceId();
      const info = getDeviceInfo();

      const { data } = await api.post<LoginResponse>('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
        device: { ...info, uuid: deviceId },
      });

      await storage.setToken(data.token);
      onLogin(data.token);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.wrap}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.mark}>
            <Text style={styles.markText}>✓</Text>
          </View>
          <Text style={styles.title}>Checador</Text>
          <Text style={styles.subtitle}>
            Registra tu entrada y salida del centro de trabajo desde tu
            dispositivo.
          </Text>
        </View>

        <View style={styles.card}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Field label="Correo electrónico">
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="tucorreo@empresa.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </Field>

          <Field label="Contraseña">
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
            />
          </Field>

          <Button
            label="Ingresar"
            onPress={handleLogin}
            loading={loading}
            style={styles.button}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  wrap: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 28,
  },
  hero: {
    alignItems: 'center',
    gap: 12,
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    color: colors.white,
    fontSize: 34,
    fontWeight: '800',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 22,
    gap: 16,
    ...shadow,
  },
  button: {
    marginTop: 6,
  },
  error: {
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.sm,
    fontSize: 14,
    fontWeight: '600',
  },
});
