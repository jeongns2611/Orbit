import { Text } from '@/components/common';
import { SIZES } from '@/constants';
import { useTheme } from '@/context/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import {
    center,
    createResponsiveStyles,
    flexRow,
    fontSize,
    mb,
    mt,
} from '@/utils/styles';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

interface RegistrationButtonsProps {
  deviceRegistered: boolean;
  profileRegistered: boolean;
  onDevicePress: () => void;
  onProfilePress: () => void;
}

export function RegistrationButtons({
  deviceRegistered,
  profileRegistered,
  onDevicePress,
  onProfilePress,
}: RegistrationButtonsProps) {
  const { scale, verticalScale, fontScale } = useResponsive();
  const { theme } = useTheme();

  if (deviceRegistered && profileRegistered) {
    return null;
  }

  const styles = createResponsiveStyles(
    {
      container: [mb(verticalScale(SIZES.spacing.xl))],
      deviceButton: [
        center,
        {
          height: scale(64),
          borderRadius: scale(SIZES.borderRadius.md),
          flexDirection: 'row' as const,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: deviceRegistered ? 0 : 0.15,
          shadowRadius: 8,
          elevation: deviceRegistered ? 0 : 4,
        },
        mb(scale(SIZES.spacing.sm)),
      ],
      deviceButtonCompleted: {
        backgroundColor: '#4CAF50',
      },
      deviceButtonActive: {
        backgroundColor: theme.primary,
      },
      requirementText: [
        flexRow,
        { alignItems: 'center', gap: scale(8) },
        mt(scale(SIZES.spacing.sm)),
        mb(scale(SIZES.spacing.sm)),
      ],
      requiredBadge: [
        {
          backgroundColor: '#FF5252' + '15',
          paddingHorizontal: scale(8),
          paddingVertical: scale(4),
          borderRadius: scale(4),
        },
      ],
      requiredBadgeText: [
        fontSize(fontScale(SIZES.fontSize.small - 2)),
        { color: '#FF5252' },
      ],
      requirementDescription: [
        fontSize(fontScale(SIZES.fontSize.small - 1)),
        { color: theme.textSecondary },
      ],
      profileButton: [
        center,
        {
          height: scale(56),
          borderRadius: scale(SIZES.borderRadius.md),
          borderWidth: 2,
          flexDirection: 'row' as const,
        },
      ],
      profileButtonDisabled: {
        borderColor: theme.cardBorder,
        backgroundColor: 'transparent',
      },
      profileButtonActive: {
        borderColor: theme.primary,
        backgroundColor: 'transparent',
      },
      profileButtonCompleted: {
        borderColor: '#4CAF50',
        backgroundColor: '#4CAF50',
      },
      buttonText: [
        fontSize(fontScale(SIZES.fontSize.large)),
        { marginLeft: scale(8) },
      ],
      buttonTextWhite: { color: '#FFFFFF' },
      buttonTextOnPrimary: { color: theme.buttonTextOnPrimary ?? '#FFFFFF' },
      buttonTextPrimary: { color: theme.primary },
      buttonTextDisabled: { color: theme.textSecondary },
    },
    { scale, verticalScale, fontScale }
  );

  return (
    <View style={styles.container}>
      {!deviceRegistered && (
        <>
          <TouchableOpacity
            style={[
              styles.deviceButton,
              deviceRegistered ? styles.deviceButtonCompleted : styles.deviceButtonActive,
            ]}
            onPress={onDevicePress}
            activeOpacity={0.8}
          >
            <Text>🚀</Text>
            <Text
              style={[
                styles.buttonText,
                deviceRegistered ? styles.buttonTextWhite : styles.buttonTextOnPrimary,
              ]}
              fontWeight="semibold"
            >
              {deviceRegistered ? '기기 등록 완료' : '기기 등록'}
            </Text>
            {!deviceRegistered && (
              <Ionicons
                name="arrow-forward"
                size={scale(20)}
                color={theme.buttonTextOnPrimary ?? '#FFFFFF'}
                style={{ marginLeft: scale(8) }}
              />
            )}
          </TouchableOpacity>

          <View style={styles.requirementText}>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredBadgeText} fontWeight="semibold">필수</Text>
            </View>
            <Text style={styles.requirementDescription}>
              기기를 먼저 등록해야 아이 프로필 설정이 가능해요
            </Text>
          </View>
        </>
      )}

      {!profileRegistered && deviceRegistered && (
        <TouchableOpacity
          style={[
            styles.profileButton,
            profileRegistered
              ? styles.profileButtonCompleted
              : styles.profileButtonActive,
          ]}
          onPress={onProfilePress}
          activeOpacity={0.8}
        >
          <Ionicons
            name="person"
            size={scale(20)}
            color={
              profileRegistered
                ? '#FFFFFF'
                : theme.primary
            }
          />
          <Text
            style={[
              styles.buttonText,
              profileRegistered
                ? styles.buttonTextWhite
                : styles.buttonTextPrimary,
            ]}
            fontWeight="semibold"
          >
            {profileRegistered ? '아이 프로필 설정 완료' : '아이 프로필 설정'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}