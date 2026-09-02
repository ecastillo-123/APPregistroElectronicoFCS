import { api, detalleDeError, isNetworkError, mensajeDeError } from '../api';
import { Badge, Button } from '../components/ui';
import { getDeviceId, getDeviceInfo } from '../config';
import { useTheme, useThemedStyles } from '../theme';
import type { CheckinType, PendingCheckIn, SyncStatus } from '../types';
import { getPendingCheckins, removePendingCheckin } from '../pendingQueue';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface Props {
  token: string;
}

function formatFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PendingCheckInsScreen({ token }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(hacerEstilos);

  const [pending, setPending] = useState<PendingCheckIn[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const items = await getPendingCheckins();
    setPending(items);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const sincronizar = useCallback(
    async (item: PendingCheckIn): Promise<boolean> => {
      setSyncing(item.client_uuid);
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
          return true;
        }
        return false;
      } catch (err) {
        const msg = mensajeDeError(err);
        Alert.alert('Error al reenviar', msg);
        return false;
      } finally {
        setSyncing(null);
      }
    },
    [],
  );

  const sincronizarTodos = useCallback(async () => {
    setRefreshing(true);
    for (const item of pending) {
      await sincronizar(item);
    }
    await cargar();
    setRefreshing(false);
  }, [pending, sincronizar, cargar]);

  const eliminar = useCallback(
    async (clientUuid: string) => {
      Alert.alert(
        'Eliminar pendiente',
        '¿Seguro que quieres eliminar esta checada pendiente?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              await removePendingCheckin(clientUuid);
              setPending((prev) => prev.filter((p) => p.client_uuid !== clientUuid));
            },
          },
        ],
      );
    },
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: PendingCheckIn }) => {
      const isSyncingThis = syncing === item.client_uuid;
      return (
        <View style={styles.item}>
          <View style={styles.itemMain}>
            <View style={styles.itemHeader}>
              <Badge
                tone={item.tipo === 'entrada' ? 'ok' : 'bad'}
                text={item.tipo === 'entrada' ? 'Entrada' : 'Salida'}
              />
              <Badge
                tone="neutral"
                text={item.checkin_type === 'huella' ? 'Huella' : 'Facial'}
              />
            </View>
            <Text style={styles.itemFecha}>
              {formatFecha(item.pending_checkin_datetime)}
            </Text>
            <Text style={styles.itemCoords}>
              {item.lat.toFixed(6)}, {item.lng.toFixed(6)}
            </Text>
          </View>
          <View style={styles.itemActions}>
            <Button
              label="Reenviar"
              variant="primary"
              size="sm"
              loading={isSyncingThis}
              disabled={isSyncingThis}
              onPress={async () => {
                const ok = await sincronizar(item);
                if (ok) {
                  setPending((prev) =>
                    prev.filter((p) => p.client_uuid !== item.client_uuid),
                  );
                }
              }}
            />
            <Button
              label="Eliminar"
              variant="ghost"
              size="sm"
              onPress={() => eliminar(item.client_uuid)}
            />
          </View>
        </View>
      );
    },
    [syncing, sincronizar, eliminar, styles],
  );

  const pendingCount = pending.length;

  return (
    <View style={[styles.flex, styles.container]}>
      <View style={styles.header}>
        <Text style={styles.title}>Checadas Pendientes</Text>
        {pendingCount > 0 && (
          <Badge tone="bad" text={`${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''}`} />
        )}
      </View>

      {pendingCount === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No hay checadas pendientes</Text>
          <Text style={styles.emptySubtext}>
            Las checadas que no se puedan enviar se guardarán aquí
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={pending}
            keyExtractor={(item) => item.client_uuid}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={async () => {
                  setRefreshing(true);
                  for (const item of pending) {
                    await sincronizar(item);
                  }
                  await cargar();
                  setRefreshing(false);
                }}
                tintColor={colors.muted}
                colors={[colors.blue]}
                progressBackgroundColor={colors.card}
              />
            }
          />
          <View style={styles.footer}>
            <Button
              label={`Reenviar todos (${pendingCount})`}
              variant="primary"
              onPress={sincronizarTodos}
            />
          </View>
        </>
      )}
    </View>
  );
}

function hacerEstilos(colors: import('../theme').ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    container: { backgroundColor: colors.paper },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      paddingBottom: 8,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.ink,
    },
    list: { padding: 16, gap: 12 },
    item: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.line,
      gap: 12,
    },
    itemMain: { gap: 4 },
    itemHeader: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    itemFecha: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.ink,
      marginTop: 4,
    },
    itemCoords: {
      fontSize: 12,
      color: colors.muted,
      fontVariant: ['tabular-nums'],
    },
    itemActions: { flexDirection: 'row', gap: 8 },
    footer: { padding: 16, paddingTop: 8 },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      gap: 8,
    },
    emptyText: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.ink,
      textAlign: 'center',
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
    },
  });
}
