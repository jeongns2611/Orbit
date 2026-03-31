import { Text } from '@/components/common';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { COLORS, ROUTES, SIZES } from '@/constants';
import { useTheme } from '@/context/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import type { RootStackParamList } from '@/navigation/types';
import { authApi } from '@/services';
import { useAuthStore } from '@/store';
import {
  createResponsiveStyles,
  flex1,
  fontSize,
  mb,
} from '@/utils/styles';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PasswordReconfirmNavigationProp = StackNavigationProp<
  RootStackParamList,
  'PasswordReconfirm'
>;

export function PasswordReconfirmScreen() {
  const navigation = useNavigation<PasswordReconfirmNavigationProp>();
  const { theme } = useTheme();
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshTokens = useAuthStore((s) => s.refreshTokens);
  const insets = useSafeAreaInsets();
  const { scale, verticalScale, fontScale } = useResponsive();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const styles = createResponsiveStyles(
    {
      container: [flex1, { backgroundColor: theme.background }],
      scrollContent: [
        {
          flexGrow: 1,
          paddingTop: verticalScale(SIZES.spacing.md),
          paddingHorizontal: scale(SIZES.spacing.lg),
        },
      ],
      headerWrapper: [{ marginHorizontal: -scale(SIZES.spacing.lg) }],
      headerSpacer: [{ marginBottom: scale(16) }],
      subtitle: [
        fontSize(fontScale(SIZES.fontSize.small)),
        { color: theme.textSecondary, textAlign: 'center' as const, paddingHorizontal: scale(24), marginTop: scale(6) },
        mb(scale(SIZES.spacing.xl)),
      ],
      form: [{ paddingHorizontal: scale(16) }],
      inputGroup: [{ marginBottom: scale(24) }],
      label: [
        fontSize(fontScale(SIZES.fontSize.normal)),
        { color: theme.text },
        mb(scale(SIZES.spacing.xs)),
      ],
      passwordContainer: [
        {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          borderBottomWidth: 1,
          borderBottomColor: theme.text,
          paddingVertical: scale(6),
        },
      ],
      passwordInput: [
        flex1,
        fontSize(fontScale(SIZES.fontSize.normal)),
        { color: theme.text, paddingRight: scale(8) },
      ],
      eyeIcon: [{ padding: scale(4) }],
      underlineError: [{ borderBottomColor: COLORS.error }],
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

  const handleSubmit = async () => {
    setError('');
    if (!password.trim()) {
      setError('비밀번호를 입력해주세요.');
      return;
    }
    let token = accessToken;
    if (!token) {
      const refreshed = await refreshTokens();
      if (!refreshed) {
        setError('로그인이 만료되었습니다. 다시 로그인해주세요.');
        return;
      }
      token = useAuthStore.getState().accessToken;
    }
    if (!token) {
      setError('로그인이 만료되었습니다. 다시 로그인해주세요.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.verifyPassword(password, token);
      if (res.ok) {
        navigation.navigate(ROUTES.MY_PAGE as never);
      } else {
        setError('비밀번호가 일치하지 않습니다. 다시 입력해주세요.');
      }
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status;
      if (status === 401) {
        setError('비밀번호가 일치하지 않습니다. 다시 입력해주세요.');
      } else {
        setError('확인에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.headerWrapper, styles.headerSpacer]}>
            <ScreenHeader
              title="비밀번호 재확인"
              onBack={() => navigation.goBack()}
              insetByParent
            />
          </View>
          <Text style={styles.subtitle} fontWeight="regular">
            소중한 개인정보 보호를 위해 비밀번호를 다시 한 번 확인해요.
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label} fontWeight="medium">
                비밀번호
              </Text>
              <View
                style={[
                  styles.passwordContainer,
                  error ? styles.underlineError : undefined,
                ]}
              >
                <TextInput
                  style={styles.passwordInput}
                  placeholder="비밀번호를 입력해주세요"
                  placeholderTextColor={theme.textMuted}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) setError('');
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={theme.textMuted}
                  />
                </TouchableOpacity>
              </View>
              {error ? (
                <Text style={styles.errorText} fontWeight="regular">
                  {error}
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.submitButtonText}>
                {loading ? '확인 중...' : '입력 완료'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
