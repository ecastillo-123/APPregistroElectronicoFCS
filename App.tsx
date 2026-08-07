import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { storage } from './src/config';
import { colors } from './src/theme';
import {
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';

type RootStackParamList = {
  Login: undefined;
  Home: { token: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.paper,
    primary: colors.amber,
    text: colors.ink,
    border: colors.line,
  },
};

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
    <NavigationContainer theme={navTheme}>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <Stack.Screen name="Home">
            {() => <HomeScreen token={token} onLogout={handleLogout} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Login">
            {() => <LoginScreen onLogin={handleLogin} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
