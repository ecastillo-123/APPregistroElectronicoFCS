import {
  aplicarUrlGuardada,
  api,
  detalleDeError,
  getApiBaseURL,
  mensajeDeError,
  resetApiBaseURL,
  setApiBaseURL,
} from '../api';
import { Button, Field, Input } from '../components/ui';
import { getDeviceId, getDeviceInfo, storage } from '../config';
import {
  radii,
  type Theme,
  type ThemeColors,
  useTheme,
  useThemedStyles,
} from '../theme';
import type { LoginResponse } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

interface Props {
  onLogin: (token: string) => void;
}

export function LoginScreen({ onLogin }: Props) {
  const { theme, toggle } = useTheme();
  const styles = useThemedStyles(hacerEstilos);
  const { colors } = theme;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ mensaje: string; detalle: string } | null>(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  const [servidor, setServidor] = useState(getApiBaseURL());
  const [editandoServidor, setEditandoServidor] = useState(false);
  const [borradorServidor, setBorradorServidor] = useState('');
  const [guardandoServidor, setGuardandoServidor] = useState(false);

  useEffect(() => {
    aplicarUrlGuardada().then(() => setServidor(getApiBaseURL()));
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError({
        mensaje: 'Ingresa tu correo y contraseña.',
        detalle: 'Los campos de correo y contraseña son obligatorios.',
      });
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
      setError({ mensaje: mensajeDeError(err), detalle: detalleDeError(err) });
    } finally {
      setLoading(false);
    }
  };

  const guardarServidor = useCallback(async () => {
    const url = borradorServidor.trim();
    if (!url) {
      return;
    }
    setGuardandoServidor(true);
    try {
      setApiBaseURL(url);
      setServidor(url);
      setEditandoServidor(false);
    } finally {
      setGuardandoServidor(false);
    }
  }, [borradorServidor]);

  const restaurarServidor = useCallback(() => {
    resetApiBaseURL();
    setServidor(getApiBaseURL());
    setEditandoServidor(false);
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.wrap}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>
            {theme.isDark ? 'Tema oscuro' : 'Tema claro'}
          </Text>
          <Switch
            value={theme.isDark}
            onValueChange={toggle}
            trackColor={{ false: colors.line, true: colors.blueSoft }}
            thumbColor={theme.isDark ? colors.blue : colors.white}
          />
        </View>

        <View style={styles.hero}>
          <LinearGradient
            colors={
              theme.isDark
                ? [colors.navy, colors.blueDeep, colors.blue]
                : [colors.navy, '#16318A', colors.blue]
            }
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={styles.mark}
          >
            <Text style={styles.markText}>✓</Text>
          </LinearGradient>
          <Text style={styles.title}>Checador</Text>
          <Text style={styles.subtitle}>
            Registra tu entrada y salida del centro de trabajo desde tu
            dispositivo.
          </Text>
        </View>

        <View style={styles.card}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error.mensaje}</Text>
              {error.detalle ? (
                <View style={styles.detalleWrap}>
                  <Button
                    label={mostrarDetalle ? 'Ocultar detalles' : 'Ver detalles técnicos'}
                    variant="ghost"
                    onPress={() => setMostrarDetalle((v) => !v)}
                    style={styles.detalleToggle}
                  />
                  {mostrarDetalle ? (
                    <Text selectable style={styles.detalleText}>
                      {error.detalle}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

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

        <View style={styles.serverCard}>
          <View style={styles.serverHeader}>
            <Text style={styles.serverLabel}>Servidor</Text>
            <Button
              label={editandoServidor ? 'Cancelar' : 'Cambiar'}
              variant="ghost"
              onPress={() => {
                setBorradorServidor(servidor);
                setEditandoServidor((v) => !v);
              }}
              style={styles.serverEdit}
            />
          </View>

          <Text selectable style={styles.serverUrl}>
            {servidor || 'Sin URL'}
          </Text>

          {editandoServidor ? (
            <View style={styles.serverEditor}>
              <Input
                value={borradorServidor}
                onChangeText={setBorradorServidor}
                placeholder="http://IP:puerto/api/v1"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <View style={styles.serverActions}>
                <Button
                  label="Guardar"
                  onPress={guardarServidor}
                  loading={guardandoServidor}
                  style={styles.serverButton}
                />
                <Button
                  label="Restaurar"
                  variant="ghost"
                  onPress={restaurarServidor}
                  style={styles.serverButton}
                />
              </View>
            </View>
          ) : null}

          <Text style={styles.serverHint}>
            Usa la IP del equipo que tiene el servidor en la misma red del
            teléfono. Ej: http://192.168.137.1:8000/api/v1
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function hacerEstilos(colors: ThemeColors, theme: Theme) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    wrap: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
      gap: 24,
      paddingVertical: 32,
    },
    toggleRow: {
      position: 'absolute',
      top: 28,
      right: 24,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      zIndex: 10,
    },
    toggleLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.inkSoft,
    },
    hero: {
      alignItems: 'center',
      gap: 12,
      marginTop: 24,
    },
    mark: {
      width: 72,
      height: 72,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    markText: {
      color: colors.white,
      fontSize: 38,
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
      borderWidth: 1,
      borderColor: colors.line,
      ...theme.shadow,
    },
    button: {
      marginTop: 6,
    },
    errorBox: {
      backgroundColor: colors.dangerSoft,
      borderRadius: radii.sm,
      padding: 14,
      gap: 6,
    },
    errorText: {
      color: colors.danger,
      fontSize: 14,
      fontWeight: '700',
    },
    detalleWrap: {
      gap: 8,
    },
    detalleToggle: {
      minHeight: 36,
      paddingVertical: 4,
      alignSelf: 'flex-start',
    },
    detalleText: {
      color: colors.danger,
      fontSize: 12,
      lineHeight: 18,
      fontFamily: Platform.select({
        ios: 'Menlo',
        android: 'monospace',
        default: 'monospace',
      }),
    },
    serverCard: {
      backgroundColor: colors.cardAlt,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.line,
      padding: 14,
      gap: 8,
    },
    serverHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    serverLabel: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      color: colors.muted,
    },
    serverEdit: {
      minHeight: 30,
      paddingVertical: 2,
      paddingHorizontal: 10,
    },
    serverUrl: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.blueDeep,
    },
    serverEditor: {
      gap: 10,
    },
    serverActions: {
      flexDirection: 'row',
      gap: 10,
    },
    serverButton: {
      flex: 1,
      minHeight: 44,
      paddingVertical: 8,
    },
    serverHint: {
      fontSize: 12,
      color: colors.muted,
      lineHeight: 17,
    },
  });
}