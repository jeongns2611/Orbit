import { Text } from '@/components/common';
import { COLORS, SIZES } from '@/constants';
import { useResponsive } from '@/hooks/useResponsive';
import type { RootStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/store';
import { registerSchema, type RegisterFormData } from '@/utils/validation';
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

type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Register'>;

const PLACEHOLDER_GRAY = '#999999';

export function RegisterScreen() {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const topInset = insets.top || (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0);

  const { scale, verticalScale, fontScale } = useResponsive();
  const { register } = useAuthStore();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      name: '',
      nickname: '',
      birthDate: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    const birthRaw = (data.birthDate || '').trim();
    if (birthRaw.length > 0 && birthRaw.length !== 8) {
      setError('birthDate', { type: 'manual', message: '생년월일 8자리를 입력해주세요.' });
      return;
    }
    const birth =
      birthRaw.length === 8
        ? `${birthRaw.slice(0, 4)}-${birthRaw.slice(4, 6)}-${birthRaw.slice(6, 8)}`
        : null;
    const name = (data.name || '').trim();
    setApiError(null);
    setIsSubmitting(true);
    try {
      await register({
        email: data.email,
        password: data.password,
        nickname: data.nickname,
        name: name.length > 0 ? name : null,
        birth,
      });
      navigation.navigate('MainTabs', undefined);
    } catch (error) {
      const status =
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        typeof (error as { status?: number }).status === 'number'
          ? (error as { status: number }).status
          : null;
      if (status === 409) {
        setError('email', { type: 'manual', message: '이미 등록된 이메일입니다.' });
      } else {
        setApiError('회원가입에 실패했습니다. 입력값을 확인해주세요.');
      }
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
        backButton: {
          position: 'absolute',
          left: scale(8),
          width: scale(24),
          height: scale(24),
          justifyContent: 'center',
          alignItems: 'center',
        },
        title: {
          fontSize: fontScale(20),
          color: '#000000',
          textAlign: 'center',
        },
        form: {
          paddingHorizontal: scale(16),
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
        registerButton: {
          backgroundColor: COLORS.moreAccent,
          borderRadius: scale(SIZES.borderRadius.lg),
          height: scale(SIZES.buttonHeight),
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: scale(24),
        },
        registerButtonDisabled: {
          opacity: 0.6,
        },
        registerButtonText: {
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
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={24} color="#000000" />
              </TouchableOpacity>
              <Text style={styles.title} fontWeight="bold">회원가입</Text>
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
              {apiError && <Text style={styles.errorText} fontWeight="regular">{apiError}</Text>}
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
                        placeholder="비밀번호를 입력해주세요. (최소 8자리)"
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

            <View style={styles.inputGroup}>
              <Text style={styles.label} fontWeight="medium">이름</Text>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="이름을 입력해주세요."
                      placeholderTextColor={PLACEHOLDER_GRAY}
                      value={value}
                      onChangeText={onChange}
                      autoCapitalize="words"
                    />
                    <View style={[styles.underline, errors.name && styles.underlineError]} />
                  </>
                )}
              />
              {errors.name?.message && <Text style={styles.errorText} fontWeight="regular">{errors.name.message}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label} fontWeight="medium">닉네임</Text>
              <Controller
                control={control}
                name="nickname"
                render={({ field: { onChange, value } }) => (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="닉네임을 입력해주세요."
                      placeholderTextColor={PLACEHOLDER_GRAY}
                      value={value}
                      onChangeText={onChange}
                      autoCapitalize="none"
                    />
                    <View style={[styles.underline, errors.nickname && styles.underlineError]} />
                  </>
                )}
              />
              {errors.nickname?.message && <Text style={styles.errorText} fontWeight="regular">{errors.nickname.message}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label} fontWeight="medium">생년월일</Text>
              <Controller
                control={control}
                name="birthDate"
                render={({ field: { onChange, value } }) => (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="생년월일 8자리를 입력해주세요. ex)19000101"
                      placeholderTextColor={PLACEHOLDER_GRAY}
                      value={value}
                      onChangeText={onChange}
                      keyboardType="number-pad"
                      maxLength={8}
                    />
                    <View style={[styles.underline, errors.birthDate && styles.underlineError]} />
                  </>
                )}
              />
              {errors.birthDate?.message && (
                <Text style={styles.errorText} fontWeight="regular">{errors.birthDate.message}</Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.registerButton, isSubmitting && styles.registerButtonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={styles.registerButtonText}>회원가입</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText} fontWeight="regular">이미 계정이 있으신가요? </Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.linkText} fontWeight="medium">로그인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
