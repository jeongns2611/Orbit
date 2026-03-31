import { Text } from '@/components/common';
import { SIZES } from '@/constants';
import { useTheme } from '@/context/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import {
    center,
    createResponsiveStyles,
    flex1,
    flexRow,
    fontSize,
    mb,
} from '@/utils/styles';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

interface RegistrationProgressProps {
  deviceRegistered: boolean;
  profileRegistered: boolean;
}

export function RegistrationProgress({
  deviceRegistered,
  profileRegistered,
}: RegistrationProgressProps) {
  const { scale, verticalScale, fontScale } = useResponsive();
  const { theme } = useTheme();

  const styles = createResponsiveStyles(
    {
      container: [mb(verticalScale(SIZES.spacing.md))],
      label: [
        fontSize(fontScale(SIZES.fontSize.small)),
        { color: theme.textSecondary },
        mb(scale(SIZES.spacing.sm)),
      ],
      progressContainer: [
        flexRow,
        { alignItems: 'center', gap: scale(8) },
      ],
      stepCircle: [
        center,
        {
          width: scale(24),
          height: scale(24),
          borderRadius: scale(12),
        },
      ],
      stepNumber: [
        fontSize(fontScale(SIZES.fontSize.small)),
      ],
      progressBar: [
        flex1,
        {
          height: scale(4),
          borderRadius: scale(2),
        },
      ],
    },
    { scale, verticalScale, fontScale }
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label} fontWeight="medium">등록 단계</Text>
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.stepCircle,
            {
              backgroundColor: deviceRegistered ? '#4CAF50' : theme.primary,
            },
          ]}
        >
          {deviceRegistered ? (
            <Ionicons name="checkmark" size={scale(16)} color="#FFFFFF" />
          ) : (
            <Text style={[styles.stepNumber, { color: theme.buttonTextOnPrimary ?? '#FFFFFF' }]} fontWeight="bold">1</Text>
          )}
        </View>

        <View
          style={[
            styles.progressBar,
            {
              backgroundColor: deviceRegistered ? '#4CAF50' : theme.textSecondary + '30',
            },
          ]}
        />

        <View
          style={[
            styles.stepCircle,
            {
              backgroundColor: profileRegistered
                ? '#4CAF50'
                : deviceRegistered
                ? theme.primary
                : theme.textSecondary + '30',
            },
          ]}
        >
          {profileRegistered ? (
            <Ionicons name="checkmark" size={scale(16)} color="#FFFFFF" />
          ) : (
            <Text
              style={[
                styles.stepNumber,
                {
                  color: deviceRegistered ? (theme.buttonTextOnPrimary ?? '#FFFFFF') : theme.textSecondary,
                },
              ]}
              fontWeight="bold"
            >
              2
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}