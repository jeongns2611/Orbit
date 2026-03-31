import { Text } from '@/components/common';
import { SIZES } from '@/constants';
import { useTheme } from '@/context/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import {
  createResponsiveStyles,
  fontSize,
  mb,
} from '@/utils/styles';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';
import { SectionTitle } from './SectionTitle';

interface DeviceStatus {
  batteryPercent: number;
  isOnline: boolean;
  driveState?: 'TRACKING' | 'HOLD_DECAY' | 'STOP';
}

interface DeviceStatusCardProps {
  status: DeviceStatus;
}

export function DeviceStatusCard({ status }: DeviceStatusCardProps) {
  const { scale, verticalScale, fontScale } = useResponsive();
  const { theme } = useTheme();
  const styles = createResponsiveStyles(
    {
      container: [mb(verticalScale(SIZES.spacing.xl))],
      statusContainer: [
        {
          flexDirection: 'row' as const,
          gap: scale(12),
          width: '100%',
        },
      ],
      statusChip: [
        {
          flex: 1,
          minWidth: 0,
          backgroundColor: theme.backgroundCard,
          borderWidth: 2,
          borderColor: theme.cardBorder,
          borderRadius: scale(16),
          padding: scale(16),
          flexDirection: 'column' as const,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          gap: scale(8),
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 2,
        },
      ],
      statusText: [
        fontSize(fontScale(SIZES.fontSize.xsmall)),
        { color: theme.text },
      ],
    },
    { scale, verticalScale, fontScale }
  );

  const iconSize = scale(28);
  const driveState = status.driveState;
  const driveStateText =
    driveState === 'TRACKING'
      ? '추적중'
      : driveState === 'HOLD_DECAY'
        ? '감속중'
        : driveState === 'STOP'
          ? '정지'
          : '정지';

  return (
    <View style={styles.container}>
      <SectionTitle title="오르비는 지금" />
      <View style={styles.statusContainer}>
        <View style={styles.statusChip}>
          {status.isOnline ? (
            <Ionicons name="wifi" size={iconSize} color={theme.primary} />
          ) : (
            <MaterialCommunityIcons name="wifi-off" size={iconSize} color={theme.primary} />
          )}
          <Text style={styles.statusText} fontWeight="black">
            {status.isOnline ? '연결됨' : '연결 끊김'}
          </Text>
        </View>
        <View style={styles.statusChip}>
          {driveState === 'TRACKING' ? (
            <MaterialCommunityIcons name="robot" size={iconSize} color={theme.primary} />
          ) : driveState === 'HOLD_DECAY' ? (
            <Ionicons name="pause-circle-outline" size={iconSize} color={theme.primary} />
          ) : driveState === 'STOP' ? (
            <MaterialCommunityIcons name="stop-circle-outline" size={iconSize} color={theme.primary} />
          ) : (
            <Ionicons name="pause-circle-outline" size={iconSize} color={theme.primary} />
          )}
          <Text style={styles.statusText} fontWeight="black">
            {driveStateText}
          </Text>
        </View>
      </View>
    </View>
  );
}
