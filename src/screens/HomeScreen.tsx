import { api, detalleDeError, isNetworkError, mensajeDeError } from '../api';
import { Badge, Button } from '../components/ui';
import { getDeviceId, getDeviceInfo, storage } from '../config';
import { authenticateForCheckin, isBiometricAvailable } from '../biometric';
import { getPendingCheckins, savePendingCheckin } from '../pendingQueue';
import {
  radii,
  type Theme,
  type ThemeColors,
  useTheme,
  useThemedStyles,
} from '../theme';
import type {
  CheckInResponse,
  CheckinType,
  EstadoResponse,
  PendingCheckIn,
  UserProfile,
} from '../types';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import * as Crypto from 'expo-crypto';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  token: string;
  onLogout: () => void;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Geo {
  lat: number;
  lng: number;
  precision?: number;
}

function distanciaMetros(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function HomeScreen({ token, onLogout }: Props) {
  const { theme, toggle } = useTheme();
  const styles = useThemedStyles(hacerEstilos);
  const { colors } = theme;
  const navigation = useNavigation<NavigationProp>();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingEstado, setLoadingEstado] = useState(true);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [geoStatus, setGeoStatus] = useState<'buscando' | 'activo' | 'error'>(
    'buscando',
  );
  const [checando, setChecando] = useState<'entrada' | 'salida' | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [resultado, setResultado] = useState<{
    ok: boolean;
    mensaje: string;
    distancia: number | null;
    tipo: string;
    checkin_type?: CheckinType;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const centro = profile?.work_center ?? null;
  const distancia = geo && centro ? distanciaMetros(geo.lat, geo.lng, centro.lat, centro.lng) : null;
  const dentro = distancia !== null && centro ? distancia <= centro.radio_metros : null;

  const cargarEstado = useCallback(async () => {
    try {
      const { data } = await api.get<EstadoResponse>('/estado');
      setProfile(data.user);
    } catch (err) {
      const msg = mensajeDeError(err);
      if (msg.includes('conectar') || msg.includes('401') || msg.includes('Credenciales')) {
        await storage.clearToken();
        onLogout();
      }
    } finally {
      setLoadingEstado(false);
    }
  }, [onLogout]);

  const cargarPendientes = useCallback(async () => {
    const pending = await getPendingCheckins();
    setPendingCount(pending.length);
  }, []);

  useEffect(() => {
    cargarEstado();
    cargarPendientes();
  }, [cargarEstado, cargarPendientes]);
  useEffect(() => {
    let activo = true;

    const iniciar = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!activo) {
        return;
      }
      if (status !== 'granted') {
        setGeoStatus('error');
        return;
      }

      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (!activo) {
          return;
        }
        setGeo({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precision: pos.coords.accuracy ?? undefined,
        });
        setGeoStatus('activo');
      } catch {
        if (activo) {
          setGeoStatus('error');
        }
      }

      if (!activo) {
        return;
      }

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
        },
        (pos) => {
          if (!activo) {
            return;
          }
          setGeo({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            precision: pos.coords.accuracy ?? undefined,
          });
          setGeoStatus('activo');
        },
      );
    };

    iniciar();

    return () => {
      activo = false;
      watchRef.current?.remove();
    };
  }, []);

  const checar = async (tipo: 'entrada' | 'salida') => {
    if (!geo) {
      Alert.alert('Sin ubicación', 'Espera a que se obtenga tu ubicación antes de checar.');
      return;
    }

    // Check biometric availability
    const biometric = await isBiometricAvailable();
    if (!biometric.available) {
      Alert.alert('Biométrico no disponible', biometric.reason ?? 'No se puede usar autenticación biométrica en este dispositivo.');
      return;
    }

    // Authenticate
    const checkinType = await authenticateForCheckin();
    if (!checkinType) {
      // User cancelled or failed
      return;
    }

    setChecando(tipo);
    setResultado(null);

    const deviceId = await getDeviceId();
    const info = getDeviceInfo();
    const clientUuid = Crypto.randomUUID();
    const now = new Date();
    const dentroRango = centro
      ? distanciaMetros(geo.lat, geo.lng, centro.lat, centro.lng) <= centro.radio_metros
      : false;

    try {
      const { data } = await api.post<CheckInResponse>('/checar', {
        tipo,
        lat: geo.lat,
        lng: geo.lng,
        precision_metros: geo.precision ?? null,
        fecha_dispositivo: now.toISOString(),
        checkin_type: checkinType,
        client_uuid: clientUuid,
        device: { ...info, uuid: deviceId },
      });

      setResultado({
        ok: data.check_in.dentro_rango,
        mensaje: data.mensaje,
        distancia: data.check_in.distancia_metros ?? null,
        tipo: data.check_in.tipo,
        checkin_type: checkinType,
      });

      cargarEstado();
      cargarPendientes();
    } catch (err) {
      if (isNetworkError(err)) {
        // Save to pending queue
        const pending: PendingCheckIn = {
          client_uuid: clientUuid,
          checkin_type: checkinType,
          tipo,
          lat: geo.lat,
          lng: geo.lng,
          precision_metros: geo.precision ?? null,
          fecha_dispositivo: now.toISOString(),
          pending_checkin_datetime: now.toISOString(),
          device: { ...info, uuid: deviceId },
          dentro_rango: dentroRango,
        };
        await savePendingCheckin(pending);
        Alert.alert(
          'Checada guardada',
          'Tu checada fue guardada y se enviará automáticamente cuando haya conexión a internet.',
        );
      } else {
        Alert.alert(
          'Error al checar',
          `${mensajeDeError(err)}\n\nDetalle técnico:\n${detalleDeError(err)}`,
        );
      }
    } finally {
      setChecando(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([cargarEstado(), cargarPendientes()]);
    setRefreshing(false);
  };

  if (loadingEstado) {
    return (
      <View style={[styles.flex, styles.center]}>
        <Text style={styles.loadingText}>Cargando…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.wrap}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.muted}
          colors={[colors.blue]}
          progressBackgroundColor={colors.card}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text style={styles.greeting}>Hola,</Text>
            <Text style={styles.name}>{profile?.employee?.nombre_completo ?? profile?.name}</Text>
            <Text style={styles.badgeNum}>
              No. {profile?.employee?.numero_empleado}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {pendingCount > 0 && (
              <TouchableOpacity
                style={[styles.pendingBadge, { backgroundColor: colors.danger }]}
                onPress={() => navigation.navigate('PendingCheckIns', { token })}
              >
                <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
              </TouchableOpacity>
            )}
            <View style={styles.themeRow}>
              <Switch
                value={theme.isDark}
                onValueChange={toggle}
                trackColor={{ false: colors.line, true: colors.blueSoft }}
                thumbColor={theme.isDark ? colors.blue : colors.white}
              />
            </View>
            <Button
              label="Salir"
              variant="ghost"
              onPress={async () => {
                await storage.clearToken();
                onLogout();
              }}
              style={styles.logout}
            />
          </View>
        </View>
      </View>

      {centro ? (
        <View style={[styles.card, styles.centerCard]}>
          <Text style={styles.centroName}>{centro.nombre}</Text>
          <Text style={styles.centroDir}>
            {centro.direccion ?? 'Sin dirección registrada'}
          </Text>
          <View style={styles.radioRow}>
            <Badge
              tone="neutral"
              text={`Radio de geocerca: ${centro.radio_metros} m`}
            />
          </View>
        </View>
      ) : (
        <View style={[styles.card, styles.alertCard]}>
          <Text style={styles.alertTitle}>Sin centro asignado</Text>
          <Text style={styles.alertText}>
            Tu usuario no tiene un centro de trabajo asignado. Contacta al
            administrador.
          </Text>
        </View>
      )}

      <View style={[styles.card]}>
        <Text style={styles.sectionTitle}>Ubicación actual</Text>

        {geoStatus === 'buscando' && (
          <Text style={styles.geoText}>Obteniendo ubicación…</Text>
        )}
        {geoStatus === 'error' && (
          <Text style={styles.geoError}>
            No se pudo obtener tu ubicación. Verifica el permiso de GPS.
          </Text>
        )}

        {geo && (
          <>
            <View style={styles.coordRow}>
              <View style={styles.coordBox}>
                <Text style={styles.coordLabel}>Latitud</Text>
                <Text style={styles.coordValue}>{geo.lat.toFixed(6)}</Text>
              </View>
              <View style={styles.coordBox}>
                <Text style={styles.coordLabel}>Longitud</Text>
                <Text style={styles.coordValue}>{geo.lng.toFixed(6)}</Text>
              </View>
            </View>

            <View style={styles.rangeRow}>
              <Text style={styles.rangeText}>
                {distancia !== null
                  ? `${distancia.toFixed(0)} m del centro`
                  : '—'}
              </Text>
              {dentro !== null && (
                <Badge
                  text={dentro ? 'Dentro del área' : 'Fuera del área'}
                  tone={dentro ? 'ok' : 'bad'}
                />
              )}
            </View>
          </>
        )}
      </View>

      {resultado && (
        <View
          style={[
            styles.card,
            { backgroundColor: resultado.ok ? colors.successSoft : colors.dangerSoft },
          ]}
        >
          <View style={styles.resultHeader}>
            <Text
              style={[
                styles.resultTitle,
                { color: resultado.ok ? colors.success : colors.danger },
              ]}
            >
              Checada de {resultado.tipo}{' '}
              {resultado.ok ? 'registrada' : 'registrada fuera de área'}
            </Text>
            {resultado.checkin_type && (
              <Badge
                tone="neutral"
                text={resultado.checkin_type === 'huella' ? 'Huella' : 'Facial'}
              />
            )}
          </View>
          <Text
            style={[
              styles.resultMsg,
              { color: resultado.ok ? colors.success : colors.danger },
            ]}
          >
            {resultado.mensaje}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <Button
          label="Checar Entrada"
          variant="success"
          loading={checando === 'entrada'}
          disabled={checando !== null || !geo || !centro}
          onPress={() => checar('entrada')}
          style={styles.actionButton}
        />
        <Button
          label="Checar Salida"
          variant="danger"
          loading={checando === 'salida'}
          disabled={checando !== null || !geo || !centro}
          onPress={() => checar('salida')}
          style={styles.actionButton}
        />
      </View>
    </ScrollView>
  );
}

function hacerEstilos(colors: ThemeColors, theme: Theme) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: colors.paper,
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      color: colors.muted,
      fontSize: 16,
    },
    wrap: {
      padding: 20,
      gap: 16,
      paddingBottom: 40,
    },
    header: {
      marginBottom: 4,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headerInfo: {
      flex: 1,
      paddingRight: 12,
    },
    headerActions: {
      alignItems: 'flex-end',
      gap: 8,
    },
    themeRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    greeting: {
      fontSize: 14,
      color: colors.muted,
    },
    name: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.ink,
      letterSpacing: -0.4,
    },
    badgeNum: {
      marginTop: 4,
      fontSize: 13,
      color: colors.blueDeep,
      fontWeight: '700',
    },
    logout: {
      minHeight: 44,
      paddingVertical: 10,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: radii.lg,
      padding: 18,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.line,
      ...theme.shadow,
    },
    centerCard: {
      alignItems: 'center',
    },
    centroName: {
      fontSize: 19,
      fontWeight: '800',
      color: colors.ink,
    },
    centroDir: {
      fontSize: 13,
      color: colors.muted,
      textAlign: 'center',
    },
    radioRow: {
      marginTop: 2,
    },
    alertCard: {
      backgroundColor: colors.blueSoft,
    },
    alertTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.blueDeep,
    },
    alertText: {
      fontSize: 13,
      color: colors.inkSoft,
      lineHeight: 19,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    geoText: {
      color: colors.muted,
      fontSize: 14,
    },
    geoError: {
      color: colors.danger,
      fontSize: 14,
    },
    coordRow: {
      flexDirection: 'row',
      gap: 12,
    },
    coordBox: {
      flex: 1,
      backgroundColor: colors.cardAlt,
      borderRadius: radii.md,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.line,
    },
    coordLabel: {
      fontSize: 11,
      color: colors.muted,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    coordValue: {
      marginTop: 2,
      fontSize: 16,
      fontWeight: '700',
      color: colors.ink,
      fontVariant: ['tabular-nums'],
    },
    rangeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    rangeText: {
      fontSize: 14,
      color: colors.inkSoft,
      fontWeight: '600',
    },
    resultTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    resultHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8,
    },
    resultMsg: {
      fontSize: 13,
      lineHeight: 19,
    },
    actions: {
      gap: 12,
    },
    actionButton: {
      width: '100%',
    },
    pendingBadge: {
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    pendingBadgeText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '800',
    },
  });
}