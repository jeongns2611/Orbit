import { Text } from '@/components/common';
import { COLORS, SIZES } from '@/constants';
import { useResponsive } from '@/hooks/useResponsive';
import type { RootStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/store';
import { loginSchema, type LoginFormData } from '@/utils/validation';
import { Ionicons } from '@expo/vector-icons';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const PLACEHOLDER_GRAY = '#999999';

export function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const topInset = insets.top || (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0);

  const { scale, verticalScale, fontScale } = useResponsive();
  const { login } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      navigation.navigate('MainTabs', undefined);
    } catch (error) {
      setApiError('로그인에 실패했습니다. 이메일/비밀번호를 확인해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: COLORS.background,
        },
        keyboardView: {
          flex: 1,
        },
        scrollContent: {
          flexGrow: 1,
        },
        headerContainer: {
          paddingTop: Platform.OS === 'ios' ? verticalScale(40) : verticalScale(16),
          paddingBottom: scale(16),
          marginBottom: scale(32),
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: scale(16),
        },
        title: {
          fontSize: fontScale(20),
          color: '#000000',
          textAlign: 'center',
        },
        inputGroup: {
          marginBottom: scale(32),
        },
        label: {
          fontSize: fontScale(14),
          color: '#000000',
          marginBottom: scale(8),
        },
        input: {
          fontSize: fontScale(16),
          color: COLORS.text,
          paddingVertical: scale(8),
          paddingHorizontal: 0,
        },
        passwordContainer: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        passwordInput: {
          flex: 1,
          marginRight: 8,
        },
        eyeIcon: {
          padding: 4,
          marginLeft: 4,
        },
        underline: {
          height: 1,
          backgroundColor: '#000000',
          marginTop: 4,
        },
        underlineError: {
          backgroundColor: COLORS.error,
        },
        errorText: {
          fontSize: fontScale(12),
          color: COLORS.error,
          marginTop: scale(4),
        },
        apiErrorContainer: {
          minHeight: scale(20),
          marginTop: scale(8),
        },
        loginButton: {
          backgroundColor: COLORS.moreAccent,
          borderRadius: scale(SIZES.borderRadius.lg),
          height: scale(SIZES.buttonHeight),
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: scale(24),
        },
        loginButtonDisabled: {
          opacity: 0.6,
        },
        loginButtonText: {
          color: '#000000',
          fontSize: fontScale(SIZES.fontSize.large),
          fontWeight: '600',
        },
        footer: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: scale(24),
          marginBottom: scale(40),
        },
        footerText: {
          fontSize: fontScale(SIZES.fontSize.normal),
          color: '#000000',
        },
        linkText: {
          fontSize: fontScale(SIZES.fontSize.normal),
          color: '#000000',
          textDecorationLine: 'underline',
        },
        form: {
          paddingHorizontal: scale(16),
        },
      }),
    [scale, verticalScale, fontScale]
  );

  return (
    <View style={[styles.container, { paddingTop: topInset, paddingLeft: insets.left, paddingRight: insets.right, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.headerContainer}>
            <View style={styles.header}>
              <Text style={styles.title} fontWeight="bold">로그인</Text>
            </View>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label} fontWeight="medium">이메일</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="이메일을 입력해주세요."
                      placeholderTextColor={PLACEHOLDER_GRAY}
                      value={value}
                      onChangeText={onChange}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                    <View style={[styles.underline, errors.email && styles.underlineError]} />
                  </>
                )}
              />
              {errors.email?.message && <Text style={styles.errorText} fontWeight="regular">{errors.email.message}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label} fontWeight="medium">비밀번호</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={[styles.input, styles.passwordInput]}
                        placeholder="비밀번호를 입력해주세요."
                        placeholderTextColor={PLACEHOLDER_GRAY}
                        value={value}
                        onChangeText={onChange}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color={PLACEHOLDER_GRAY}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.underline, errors.password && styles.underlineError]} />
                  </>
                )}
              />
              {errors.password?.message && <Text style={styles.errorText} fontWeight="regular">{errors.password.message}</Text>}
            </View>

            <View style={styles.apiErrorContainer}>
              {apiError ? (
                <Text style={styles.errorText} fontWeight="regular">{apiError}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={[styles.loginButton, isSubmitting && styles.loginButtonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={styles.loginButtonText}>로그인</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText} fontWeight="regular">아직 계정이 없으신가요? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.linkText} fontWeight="medium">회원가입</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}


