import { Text } from '@/components/common';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { COLORS, SIZES } from '@/constants';
import { useTheme } from '@/context/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import type { RootStackParamList } from '@/navigation/types';
import { usersApi } from '@/services';
import type { UserMeResponse } from '@/services/api/users';
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
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type MyPageNavigationProp = StackNavigationProp<RootStackParamList, 'MyPage'>;

function formatBirth(birth: string | null | undefined): string {
  if (birth == null || birth === '') return '-';
  return String(birth);
}

export function MyPageScreen() {
  const { theme } = useTheme();
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshTokens = useAuthStore((s) => s.refreshTokens);
  const [profile, setProfile] = useState<UserMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const navigation = useNavigation<MyPageNavigationProp>();
  const passwordLength = useAuthStore((s) => s.passwordLength);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let token = accessToken;
      if (!token) {
        const ok = await refreshTokens();
        if (!ok || cancelled) return;
        token = useAuthStore.getState().accessToken;
      }
      if (!token) {
        if (!cancelled) setLoadError('로그인이 만료되었습니다.');
        return;
      }
      try {
        const data = await usersApi.getMe(token);
        if (!cancelled) setProfile(data);
      } catch {
        if (!cancelled) setLoadError('정보를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [accessToken, refreshTokens]);
  const insets = useSafeAreaInsets();
  const { scale, verticalScale, fontScale } = useResponsive();
  const [isPasswordEditMode, setIsPasswordEditMode] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPwConfirm, setNewPwConfirm] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showNewPwConfirm, setShowNewPwConfirm] = useState(false);
  const [pwMatch, setPwMatch] = useState(false);
  const [pwError, setPwError] = useState('');
  
  const [isNicknameEditing, setIsNicknameEditing] = useState(false);
  const [nicknameValue, setNicknameValue] = useState(profile?.nickname ?? '');
  const [nicknameEditValue, setNicknameEditValue] = useState(profile?.nickname ?? '');
  const [nicknameError, setNicknameError] = useState('');
  const [saveAllSaving, setSaveAllSaving] = useState(false);
  const [saveAllError, setSaveAllError] = useState('');
  const updateNickname = useAuthStore((s) => s.updateNickname);
  useEffect(() => {
    if (profile?.nickname != null) {
      setNicknameValue(profile.nickname);
      setNicknameEditValue(profile.nickname);
    }
  }, [profile?.nickname]);
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
      form: [{ paddingHorizontal: scale(16) }],
      fieldGroup: [{ marginBottom: scale(16) }],
      label: [
        fontSize(fontScale(SIZES.fontSize.normal)),
        { color: theme.text },
        mb(scale(SIZES.spacing.xs)),
      ],
      fieldRow: [
        {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          borderBottomWidth: 1,
          borderBottomColor: theme.cardBorder,
          paddingVertical: scale(6),
        },
      ],
      fieldValue: [
        flex1,
        fontSize(fontScale(SIZES.fontSize.normal)),
        { color: theme.text },
      ],
      eyeIcon: [{ padding: scale(4) }],
      smallButton: [
        {
          backgroundColor: theme.primary,
          paddingVertical: scale(8),
          paddingHorizontal: scale(16),
          borderRadius: scale(SIZES.borderRadius.md),
        },
      ],
      smallButtonText: [
        fontSize(fontScale(SIZES.fontSize.small)),
        { color: theme.buttonTextOnPrimary ?? theme.text, fontWeight: '600' as const },
      ],
      input: [
        flex1,
        fontSize(fontScale(SIZES.fontSize.normal)),
        { color: theme.text, paddingRight: scale(8) },
      ],
      hint: [
        fontSize(fontScale(SIZES.fontSize.small)),
        { color: theme.textSecondary, marginTop: scale(4) },
      ],
      hintOk: [{ color: COLORS.success }],
      hintError: [{ color: COLORS.error }],
      cancelButton: [
        {
          backgroundColor: theme.textMuted + '30',
          paddingVertical: scale(6),
          paddingHorizontal: scale(12),
          borderRadius: scale(SIZES.borderRadius.md),
        },
      ],
      cancelButtonText: [
        fontSize(fontScale(SIZES.fontSize.small)),
        { color: theme.text },
      ],
      passwordActionWrap: [
        { marginTop: scale(8), flexDirection: 'row' as const, alignItems: 'center' as const, gap: scale(SIZES.spacing.sm) },
      ],
      passwordActionButton: [
        {
          backgroundColor: theme.primary,
          paddingVertical: scale(6),
          paddingHorizontal: scale(12),
          borderRadius: scale(SIZES.borderRadius.md),
        },
      ],
      passwordBlock: [{ marginBottom: scale(16) }],
      saveNotice: [
        fontSize(fontScale(SIZES.fontSize.small)),
        { color: theme.textSecondary, textAlign: 'center' as const },
        { marginBottom: scale(SIZES.spacing.sm), marginTop: verticalScale(SIZES.spacing.lg) },
      ],
      saveAllButton: [
        {
          backgroundColor: theme.primary,
          borderRadius: scale(SIZES.borderRadius.lg),
          height: scale(SIZES.buttonHeight),
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
          marginTop: verticalScale(SIZES.spacing.sm),
        },
      ],
      saveAllButtonDisabled: [{ opacity: 0.6 }],
      saveAllButtonText: [
        fontSize(fontScale(SIZES.fontSize.large)),
        { color: theme.buttonTextOnPrimary ?? theme.text, fontWeight: '600' as const },
      ],
    },
    { scale, verticalScale, fontScale }
  );

  const togglePasswordEditMode = () => {
    setIsPasswordEditMode((prev) => !prev);
    if (isPasswordEditMode) {
      setCurrentPw('');
      setNewPw('');
      setNewPwConfirm('');
      setPwError('');
      setPwMatch(false);
    }
  };
  
  const onNewPwChange = (text: string) => {
    setNewPw(text);
    setPwMatch(newPwConfirm.length > 0 && text === newPwConfirm);
  };
  
  const onNewPwConfirmChange = (text: string) => {
    setNewPwConfirm(text);
    setPwMatch(text.length > 0 && text === newPw);
  };
  
  const startNicknameEdit = () => {
    setNicknameEditValue(nicknameValue);
    setNicknameError('');
    setIsNicknameEditing(true);
  };

  const saveNickname = () => {
    const trimmed = nicknameEditValue.trim();
    setNicknameValue(trimmed || nicknameValue);
    setNicknameError('');
    setIsNicknameEditing(false);
  };

  const savePassword = () => {
    setPwError('');
    if (!currentPw.trim() || !newPw.trim() || !newPwConfirm.trim()) {
      setPwError('비밀번호 변경 시 세 칸 모두 입력해주세요.');
      return;
    }
    if (newPw !== newPwConfirm) {
      setPwError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    setCurrentPw('');
    setNewPw('');
    setNewPwConfirm('');
    setPwMatch(false);
    setIsPasswordEditMode(false);
  };

  const saveAllInfo = async () => {
    setPwError('');
    setNicknameError('');
    setSaveAllError('');
    if (isPasswordEditMode && (currentPw || newPw || newPwConfirm)) {
      if (!currentPw.trim() || !newPw.trim() || !newPwConfirm.trim()) {
        setPwError('비밀번호 변경 시 세 칸 모두 입력해주세요.');
        return;
      }
      if (newPw !== newPwConfirm) {
        setPwError('새 비밀번호가 일치하지 않습니다.');
        return;
      }
    }
    const newNickname = (isNicknameEditing ? nicknameEditValue.trim() : nicknameValue).trim();
    if (!newNickname) {
      setNicknameError('닉네임을 입력해주세요.');
      return;
    }
    if (newNickname.length > 50) {
      setNicknameError('닉네임은 50자 이내로 입력해주세요.');
      return;
    }
    const hasNicknameChange = newNickname !== (profile?.nickname ?? '');
    if (!hasNicknameChange) {
      navigation.navigate('MainTabs', { screen: 'Home' });
      return;
    }
    let token = accessToken;
    if (!token) {
      const ok = await refreshTokens();
      if (!ok) {
        setSaveAllError('로그인이 만료되었습니다.');
        return;
      }
      token = useAuthStore.getState().accessToken;
    }
    if (!token) {
      setSaveAllError('로그인이 만료되었습니다.');
      return;
    }
    setSaveAllSaving(true);
    try {
      await usersApi.updateMe(token, { nickname: newNickname });
      setNicknameValue(newNickname);
      setProfile((prev) => (prev ? { ...prev, nickname: newNickname } : null));
      await updateNickname(newNickname);
      if (isNicknameEditing) setIsNicknameEditing(false);
      navigation.navigate('MainTabs', { screen: 'Home' });
    } catch (err) {
      const apiErr = err as { status?: number; data?: { detail?: string } };
      const message =
        apiErr?.data && typeof apiErr.data === 'object' && 'detail' in apiErr.data
          ? String((apiErr.data as { detail?: string }).detail)
          : '저장에 실패했습니다.';
      setSaveAllError(message);
    } finally {
      setSaveAllSaving(false);
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.headerWrapper, styles.headerSpacer]}>
          <ScreenHeader
            title="마이 페이지"
            onBack={() => navigation.goBack()}
            insetByParent
          />
        </View>

        <View style={styles.form}>
          {loading && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label} fontWeight="regular">정보 불러오는 중...</Text>
            </View>
          )}
          {!loading && loadError ? (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, styles.hintError]} fontWeight="regular">{loadError}</Text>
            </View>
          ) : null}
          {!loading && !loadError && profile != null ? (
            <>
          <View style={styles.fieldGroup}>
            <Text style={styles.label} fontWeight="medium">이메일</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldValue}>{profile.email ?? '-'}</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            {!isPasswordEditMode ? (
              <>
                <Text style={styles.label} fontWeight="medium">비밀번호</Text>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldValue}>{'*'.repeat(Math.max(0, passwordLength ?? 8))}</Text>
                </View>
                <View style={styles.passwordActionWrap}>
  <TouchableOpacity style={styles.passwordActionButton} onPress={togglePasswordEditMode} activeOpacity={0.7}>
    <Text style={styles.smallButtonText} fontWeight="medium">비밀번호 변경</Text>
  </TouchableOpacity>
</View>
              </>
            ) : (
              <>
                <View style={styles.passwordBlock}>
                  <Text style={styles.label} fontWeight="medium">현재 비밀번호</Text>
                  <View style={styles.fieldRow}>
                    <TextInput
                      style={styles.input}
                      placeholder="현재 비밀번호"
                      placeholderTextColor={theme.textMuted}
                      value={currentPw}
                      onChangeText={setCurrentPw}
                      secureTextEntry={!showCurrentPw}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowCurrentPw(!showCurrentPw)} activeOpacity={0.7}>
                      <Ionicons name={showCurrentPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.passwordBlock}>
                  <Text style={styles.label} fontWeight="medium">새 비밀번호</Text>
                  <View style={styles.fieldRow}>
                    <TextInput
                      style={styles.input}
                      placeholder="새 비밀번호"
                      placeholderTextColor={theme.textMuted}
                      value={newPw}
                      onChangeText={onNewPwChange}
                      secureTextEntry={!showNewPw}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowNewPw(!showNewPw)} activeOpacity={0.7}>
                      <Ionicons name={showNewPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.passwordBlock}>
                  <Text style={styles.label} fontWeight="medium">새 비밀번호 확인</Text>
                  <View style={styles.fieldRow}>
                    <TextInput
                      style={styles.input}
                      placeholder="새 비밀번호 확인"
                      placeholderTextColor={theme.textMuted}
                      value={newPwConfirm}
                      onChangeText={onNewPwConfirmChange}
                      secureTextEntry={!showNewPwConfirm}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowNewPwConfirm(!showNewPwConfirm)} activeOpacity={0.7}>
                      <Ionicons name={showNewPwConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
                {newPwConfirm.length > 0 && (
                  <Text style={[styles.hint, pwMatch ? styles.hintOk : styles.hintError]}>
                    {pwMatch ? '비밀번호가 일치합니다.' : '비밀번호가 일치하지 않습니다.'}
                  </Text>
                )}
                {pwError ? <Text style={[styles.hint, styles.hintError]}>{pwError}</Text> : null}
                <View style={styles.passwordActionWrap}>
                  <TouchableOpacity style={styles.passwordActionButton} onPress={savePassword} activeOpacity={0.7}>
                    <Text style={styles.smallButtonText} fontWeight="medium">비밀번호 저장</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={togglePasswordEditMode} activeOpacity={0.7}>
                    <Text style={styles.cancelButtonText} fontWeight="medium">취소</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label} fontWeight="medium">이름</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldValue}>{profile.name ?? '-'}</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label} fontWeight="medium">닉네임</Text>
            <View style={styles.fieldRow}>
              {!isNicknameEditing ? (
                <>
                  <Text style={styles.fieldValue}>{nicknameValue}</Text>
                  <TouchableOpacity style={styles.smallButton} onPress={startNicknameEdit} activeOpacity={0.7}>
                    <Text style={styles.smallButtonText} fontWeight="medium">수정</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    value={nicknameEditValue}
                    onChangeText={(text) => { setNicknameEditValue(text); setNicknameError(''); }}
                    placeholder="닉네임"
                    placeholderTextColor={theme.textMuted}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.smallButton} onPress={saveNickname} activeOpacity={0.7}>
                    <Text style={styles.smallButtonText} fontWeight="medium">저장</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
            {nicknameError ? (
              <Text style={[styles.hint, styles.hintError]}>{nicknameError}</Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label} fontWeight="medium">생년월일</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldValue}>{formatBirth(profile.birth)}</Text>
            </View>
          </View>

          <Text style={styles.saveNotice} fontWeight="regular">
            변경 사항을 반영하려면 아래 &quot;내 정보 저장&quot; 버튼을 꼭 눌러주세요.
          </Text>
          {saveAllError ? (
            <Text style={[styles.hint, styles.hintError, { marginBottom: scale(8) }]}>{saveAllError}</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.saveAllButton, saveAllSaving && styles.saveAllButtonDisabled]}
            onPress={saveAllInfo}
            disabled={saveAllSaving}
            activeOpacity={0.7}
          >
            <Text style={styles.saveAllButtonText}>
              {saveAllSaving ? '저장 중...' : '내 정보 저장'}
            </Text>
          </TouchableOpacity>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}