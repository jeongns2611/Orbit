import { Text } from '@/components/common';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { COLORS, SIZES } from '@/constants';
import { ASYNC_STORAGE_KEYS } from '@/constants/keys';
import { useTheme } from '@/context/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import type { RootStackParamList } from '@/navigation/types';
import { childrenApi, devicesApi, usersApi } from '@/services';
import { useAuthStore } from '@/store';
import type { ChildProfile, DeviceStatus } from '@/store/registrationStore';
import { useRegistrationStore } from '@/store/registrationStore';
import {
  createResponsiveStyles,
  flex1,
  fontSize,
  mb,
} from '@/utils/styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DeviceRegistrationNavigationProp =
  StackNavigationProp<RootStackParamList, 'DeviceRegistration'>;

export function DeviceRegistrationScreen() {
  const navigation = useNavigation<DeviceRegistrationNavigationProp>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { scale, verticalScale, fontScale } = useResponsive();
  const [serialNumber, setSerialNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { accessToken, refreshTokens } = useAuthStore();

  const styles = createResponsiveStyles(
    {
      container: [flex1, { backgroundColor: theme.background }],
      scrollContent: [
        {
          flexGrow: 1,
          paddingTop: verticalScale(SIZES.spacing.md),
          paddingBottom: scale(100),
          paddingHorizontal: scale(SIZES.spacing.lg),
        },
      ],
      headerWrapper: [{ marginHorizontal: -scale(SIZES.spacing.lg) }],
      headerSpacer: [{ marginBottom: scale(16) }],
      form: [{ paddingHorizontal: scale(4) }],
      label: [
        fontSize(fontScale(SIZES.fontSize.large)),
        { color: theme.text },
        mb(scale(SIZES.spacing.xs)),
      ],
      description: [
        fontSize(fontScale(SIZES.fontSize.normal)),
        { color: theme.textSecondary },
        mb(scale(SIZES.spacing.lg)),
      ],
      inputContainer: [
        {
          borderBottomWidth: 1,
          borderBottomColor: theme.cardBorder,
          paddingBottom: scale(8),
        },
      ],
      input: [
        fontSize(fontScale(SIZES.fontSize.normal)),
        { color: theme.text, paddingVertical: scale(10) },
      ],
      errorText: [
        fontSize(fontScale(SIZES.fontSize.small)),
        { color: COLORS.error, marginTop: scale(8) },
      ],
      submitButton: [
        {
          backgroundColor: theme.primary,
          borderRadius: scale(SIZES.borderRadius.lg),
          height: scale(SIZES.buttonHeight),
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
          marginTop: scale(24),
        },
      ],
      submitButtonDisabled: [{ opacity: 0.6 }],
      submitButtonText: [
        fontSize(fontScale(SIZES.fontSize.large)),
        { color: theme.buttonTextOnPrimary ?? theme.text, fontWeight: '600' as const },
      ],
    },
    { scale, verticalScale, fontScale }
  );

  const parseNotes = (notes: string | null | undefined): string[] | undefined => {
    if (!notes) return undefined;
    const parsed = notes
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    return parsed.length > 0 ? parsed : undefined;
  };

  const getAgeInMonthsFromDateString = (dateStr: string): number => {
    const normalized = dateStr.replace(/-/g, '');
    const y = parseInt(normalized.slice(0, 4), 10);
    const m = parseInt(normalized.slice(4, 6), 10);
    const d = parseInt(normalized.slice(6, 8), 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return 0;
    const birth = new Date(y, m - 1, d);
    const today = new Date();
    return (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
  };

  const handleRegister = async () => {
    const trimmedSerial = serialNumber.trim();
    if (!trimmedSerial) {
      setErrorMessage('시리얼 넘버를 입력해주세요.');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    let token = accessToken;
    if (!token) {
      const refreshed = await refreshTokens();
      if (refreshed) {
        token = useAuthStore.getState().accessToken;
      }
    }

    if (!token) {
      setIsSubmitting(false);
      setErrorMessage('로그인이 필요합니다.');
      return;
    }

    try {
      setErrorMessage('');

      try {
        await devicesApi.createDevice(token, {
          serial_no: trimmedSerial,
          model_name: 'OrbitCare-V1',
          firmware_version: 'v1.0',
        });
      } catch (createErr: unknown) {
        const createError = createErr as { status?: number };
        if (createError?.status !== 409) {
          throw createErr;
        }
      }

      const linkResponse = await usersApi.linkDevice(token, trimmedSerial);
      useRegistrationStore.getState().setDeviceRegistered(true);

      const deviceDetails = await devicesApi.getDevice(token, linkResponse.device_id);
      const deviceInfo: DeviceStatus = {
        batteryPercent: 100,
        isOnline: true,
        serial_no: linkResponse.serial_no,
        model_name: deviceDetails.model_name,
        firmware_version: deviceDetails.firmware_version,
      };
      useRegistrationStore.getState().setDeviceInfo(deviceInfo);

      try {
        await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.DEVICE_REGISTERED, 'true');
        await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.DEVICE_INFO, JSON.stringify(deviceInfo));
      } catch (error) {
        console.error('기기 등록 상태 저장 실패:', error);
      }

      try {
        const child = await childrenApi.getChild(token);
        const childProfile: ChildProfile = {
          childId: String(child.id),
          name: child.name,
          ageInMonths: getAgeInMonthsFromDateString(child.birth),
          gender: child.gender,
          notes: parseNotes(child.notes),
        };
        useRegistrationStore.getState().setChildProfileRegistered(true);
        useRegistrationStore.getState().setChildProfile(childProfile);
        try {
          await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.CHILD_PROFILE_REGISTERED, 'true');
          await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.CHILD_PROFILE_DATA, JSON.stringify(childProfile));
        } catch (_) {}
        navigation.navigate('MainTabs' as never);
        return;
      } catch (error) {
        const err = error as { status?: number; data?: unknown };
        const detail =
          err?.data && typeof err.data === 'object' && 'detail' in err.data
            ? (err.data as { detail?: string }).detail
            : null;
        if (err?.status === 404 || detail === 'Child not found') {
          navigation.navigate('ChildProfile' as never);
          return;
        }
        navigation.navigate('ChildProfile' as never);
        return;
      }
    } catch (error) {
      const err = error as { status?: number; data?: unknown };
      const detail =
        err?.data && typeof err.data === 'object' && 'detail' in err.data
          ? (err.data as { detail?: string }).detail
          : null;


      if (err?.status === 400 && detail === 'INVALID_SERIAL') {
        setErrorMessage('시리얼 넘버가 올바르지 않습니다.');
        return;
      }
      if (err?.status === 404 && detail === 'DEVICE_NOT_FOUND') {
        setErrorMessage('해당 기기를 찾을 수 없습니다.');
        return;
      }
      setErrorMessage('기기 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={flex1}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.headerWrapper, styles.headerSpacer]}>
            <ScreenHeader
              title="기기 등록"
              onBack={() => navigation.goBack()}
              insetByParent
            />
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>시리얼 넘버</Text>
            <Text style={styles.description}>
              보유하신 기기의 시리얼 넘버를 입력해주세요.
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="시리얼 넘버를 입력해주세요"
                placeholderTextColor={theme.textMuted}
                value={serialNumber}
                onChangeText={(value) => {
                  setSerialNumber(value);
                  if (errorMessage) setErrorMessage('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {!!errorMessage && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleRegister}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? '등록 중...' : '기기 등록'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
