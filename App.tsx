import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { PendingCheckInsScreen } from './src/screens/PendingCheckInsScreen';
import { storage } from './src/config';
import { ThemeProvider, useTheme } from './src/theme';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { api } from './src/api';
import { getPendingCheckins, removePendingCheckin } from './src/pendingQueue';
import { getDeviceId, getDeviceInfo } from './src/config';
import type { PendingCheckIn } from './src/types';

export type RootStackParamList = {
  Login: undefined;
  Home: { token: string };
  PendingCheckIns: { token: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootProps {
  token: string | null;
  onLogin: (token: string) => void;
  onLogout: () => void;
}

function Root({ token, onLogin, onLogout }: RootProps) {
  const { theme } = useTheme();

  const navTheme = {
    ...(theme.isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.isDark ? DarkTheme : DefaultTheme).colors,
      background: theme.colors.paper,
      primary: theme.colors.blue,
      text: theme.colors.ink,
      border: theme.colors.line,
      card: theme.colors.card,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <>
            <Stack.Screen name="Home">
              {() => <HomeScreen token={token} onLogout={onLogout} />}
            </Stack.Screen>
            <Stack.Screen
              name="PendingCheckIns"
              options={{
                headerShown: true,
                title: 'Checadas Pendientes',
                headerBackTitle: 'Volver',
              }}
            >
              {() => <PendingCheckInsScreen token={token} />}
            </Stack.Screen>
          </>
        ) : (
          <Stack.Screen name="Login">
            {() => <LoginScreen onLogin={onLogin} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let activo = true;

    storage
      .getToken()
      .then((t) => {
        if (activo) {
          setToken(t);
        }
      })
      .finally(() => {
        if (activo) {
          setReady(true);
        }
      });

    return () => {
      activo = false;
    };
  }, []);

  // Auto-sync pending checkins on mount
  useEffect(() => {
    if (!token) return;

    const syncPending = async () => {
      const pending = await getPendingCheckins();
      if (pending.length === 0) return;

      let syncedCount = 0;
      for (const item of pending) {
        try {
          const deviceId = await getDeviceId();
          const info = getDeviceInfo();
          const { data } = await api.post('/checar/sync', {
            tipo: item.tipo,
            lat: item.lat,
            lng: item.lng,
            precision_metros: item.precision_metros,
            fecha_dispositivo: item.fecha_dispositivo,
            checkin_type: item.checkin_type,
            pending_checkin_datetime: item.pending_checkin_datetime,
            client_uuid: item.client_uuid,
            device: { ...info, uuid: deviceId },
          });
          if (data.success) {
            await removePendingCheckin(item.client_uuid);
            syncedCount++;
          }
        } catch {
          // Silently skip failed items — will retry next time
        }
      }

      if (syncedCount > 0) {
        Alert.alert(
          'Checadas sincronizadas',
          `${syncedCount} checada${syncedCount !== 1 ? 's' : ''} pendiente${syncedCount !== 1 ? 's' : ''} enviada${syncedCount !== 1 ? 's' : ''} automáticamente.`,
        );
      }
    };

    syncPending();
  }, [token]);

  const handleLogin = useCallback((t: string) => {
    setToken(t);
  }, []);

  const handleLogout = useCallback(() => {
    setToken(null);
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <ThemeProvider>
      <Root token={token} onLogin={handleLogin} onLogout={handleLogout} />
    </ThemeProvider>
  );
}