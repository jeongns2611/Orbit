import { Text } from '@/components/common';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { COLORS, ROUTES, SIZES } from '@/constants';
import { ASYNC_STORAGE_KEYS } from '@/constants/keys';
import { useTheme } from '@/context/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import { childrenApi } from '@/services';
import { useAuthStore } from '@/store';
import type { ChildProfile } from '@/store/registrationStore';
import { useRegistrationStore } from '@/store/registrationStore';
import {
  createResponsiveStyles,
  flex1,
  flexRow,
  fontSize,
  mb,
} from '@/utils/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatBirthDateDisplay(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd || '-';
  const y = yyyymmdd.slice(0, 4);
  const m = parseInt(yyyymmdd.slice(4, 6), 10);
  const d = parseInt(yyyymmdd.slice(6, 8), 10);
  return `${y}. ${m}. ${d}`;
}

function getAgeDisplay(ageInMonths: number): string {
  if (ageInMonths < 12) return `${ageInMonths}개월`;
  const years = Math.floor(ageInMonths / 12);
  return `${years}세`;
}

export function ChildProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { scale, verticalScale, fontScale } = useResponsive();
  const childProfileRegistered = useRegistrationStore((s) => s.childProfileRegistered);
  const storedProfile = useRegistrationStore((s) => s.childProfile);
  const setChildProfile = useRegistrationStore((s) => s.setChildProfile);
  const syncChildProfileFromServer = useRegistrationStore((s) => s.syncChildProfileFromServer);

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | null>(null);
  const [specialNotes, setSpecialNotes] = useState('');
  const [notesTags, setNotesTags] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdateSubmitting, setIsUpdateSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const { accessToken, refreshTokens } = useAuthStore();

  const isEditMode = !!storedProfile;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let token = accessToken;
      if (!token) {
        const ok = await refreshTokens();
        if (!ok || cancelled) {
          if (!cancelled) setLoading(false);
          return;
        }
        token = useAuthStore.getState().accessToken;
      }
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      setFetchError('');
      try {
        await syncChildProfileFromServer(token);
      } catch (e) {
        if (cancelled) return;
        const err = e as { status?: number; data?: unknown };
        const detail =
          err?.data && typeof err.data === 'object' && 'detail' in err.data
            ? (err.data as { detail?: string }).detail
            : null;
        if (err?.status === 404 || detail === 'Child not found') {
          setFetchError('');
        } else {
          setFetchError('아이 프로필을 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [accessToken, refreshTokens, syncChildProfileFromServer]);

  useEffect(() => {
    if (loading) return;
    if (storedProfile) {
      setNotesTags(storedProfile.notes ?? []);
      return;
    }
    if (!childProfileRegistered) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEYS.CHILD_PROFILE_DATA);
        if (cancelled || !raw) return;
        const loaded = JSON.parse(raw) as ChildProfile;
        setChildProfile(loaded);
        setNotesTags(loaded.notes ?? []);
      } catch (e) {
        if (!cancelled) console.error('아이 프로필 불러오기 실패:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [loading, childProfileRegistered, storedProfile, setChildProfile]);

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
      profileCard: [
        {
          backgroundColor: theme.backgroundProfileCard ?? theme.backgroundCard,
          borderRadius: scale(24),
          padding: scale(24),
          marginBottom: scale(24),
          borderWidth: 1,
          borderColor: theme.cardBorder,
        },
      ],
      avatarWrap: [
        {
          alignSelf: 'center' as const,
          marginBottom: scale(16),
          position: 'relative' as const,
        },
      ],
      avatarCircle: [
        {
          width: scale(112),
          height: scale(112),
          borderRadius: scale(56),
          backgroundColor: theme.backgroundCard,
          borderWidth: 4,
          borderColor: theme.background,
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
          overflow: 'hidden' as const,
        },
      ],
      avatarIcon: {},
      avatarImage: [
        { width: '100%' as const, height: '100%' as const },
      ],
      profileName: [
        fontSize(fontScale(22)),
        { color: theme.text, fontWeight: 'bold' as const, textAlign: 'center' as const },
        mb(scale(4)),
      ],
      profileMeta: [
        flexRow,
        {
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
          flexWrap: 'wrap' as const,
          gap: scale(8),
        },
      ],
      profileMetaItem: [
        fontSize(fontScale(SIZES.fontSize.medium)),
        { color: theme.textSecondary },
      ],
      metaDot: [
        { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.textMuted },
      ],
      notesCard: [
        {
          backgroundColor: theme.backgroundCard,
          borderRadius: scale(24),
          padding: scale(24),
          marginBottom: scale(24),
          borderWidth: 1,
          borderColor: theme.cardBorder,
        },
      ],
      notesSectionTitle: [
        flexRow,
        {
          alignItems: 'center' as const,
          gap: scale(8),
          marginBottom: scale(16),
        },
      ],
      notesSectionTitleText: [
        fontSize(fontScale(SIZES.fontSize.small)),
        { color: theme.text, fontWeight: 'bold' as const, letterSpacing: 1 },
      ],
      tagsWrap: [
        {
          flexDirection: 'row' as const,
          flexWrap: 'wrap' as const,
          gap: scale(8),
          marginBottom: scale(12),
        },
      ],
      tag: [
        {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          gap: scale(8),
          backgroundColor: theme.tagBg ?? theme.backgroundProfileCard,
          borderWidth: 1,
          borderColor: theme.tagBorder ?? theme.cardBorder,
          paddingHorizontal: scale(12),
          paddingVertical: scale(8),
          borderRadius: scale(12),
        },
      ],
      tagText: [
        fontSize(fontScale(SIZES.fontSize.small)),
        { color: theme.tagText ?? theme.text },
      ],
      notesInputRow: [
        {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          borderBottomWidth: 1,
          borderBottomColor: theme.cardBorder,
          paddingVertical: scale(8),
          gap: scale(12),
        },
      ],
      notesInput: [
        flex1,
        fontSize(fontScale(SIZES.fontSize.normal)),
        { color: theme.text, paddingVertical: scale(4) },
      ],
      addTagButton: [
        {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          gap: scale(2),
          paddingHorizontal: scale(10),
          paddingVertical: scale(6),
          borderRadius: scale(8),
          borderWidth: 2,
          borderStyle: 'dashed' as const,
          borderColor: theme.primary + '66',
          backgroundColor: theme.primary + '1A',
        },
      ],
      addTagButtonText: [
        fontSize(fontScale(SIZES.fontSize.xsmall)),
        { color: theme.text, fontWeight: 'bold' as const },
      ],
      notesHint: [
        fontSize(fontScale(11)),
        { color: theme.textMuted, marginTop: scale(8) },
      ],
      form: [{ paddingHorizontal: scale(4) }],
      label: [
        fontSize(fontScale(SIZES.fontSize.normal)),
        { color: theme.text },
        mb(scale(SIZES.spacing.xs)),
      ],
      inputUnderline: [
        {
          borderBottomWidth: 1,
          borderBottomColor: theme.cardBorder,
          paddingVertical: scale(8),
        },
      ],
      input: [
        fontSize(fontScale(SIZES.fontSize.normal)),
        { color: theme.text, paddingVertical: scale(4) },
      ],
      genderRow: [
        flexRow,
        { gap: scale(16), marginTop: scale(8) },
      ],
      genderOption: [
        flexRow,
        { alignItems: 'center' as const, gap: scale(8) },
      ],
      radioOuter: [
        {
          width: scale(20),
          height: scale(20),
          borderRadius: scale(10),
          borderWidth: 2,
          borderColor: theme.primary,
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
        },
      ],
      radioInner: [
        {
          width: scale(12),
          height: scale(12),
          borderRadius: scale(6),
          backgroundColor: theme.primary,
        },
      ],
      genderText: [fontSize(fontScale(SIZES.fontSize.medium)), { color: theme.text }],
      footer: [{ paddingHorizontal: scale(4), paddingBottom: scale(24) }],
      saveButton: [
        {
          backgroundColor: theme.primary,
          borderRadius: scale(16),
          height: scale(56),
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
          flexDirection: 'row' as const,
          gap: scale(8),
        },
      ],
      saveButtonDisabled: [{ opacity: 0.6 }],
      saveButtonText: [
        fontSize(fontScale(SIZES.fontSize.large)),
        { color: theme.buttonTextOnPrimary ?? theme.text, fontWeight: 'bold' as const },
      ],
      errorText: [
        fontSize(fontScale(SIZES.fontSize.small)),
        { color: COLORS.error, marginTop: scale(8), textAlign: 'center' as const },
      ],
      loadingText: [fontSize(fontScale(SIZES.fontSize.normal)), { color: theme.textSecondary }],
    },
    { scale, verticalScale, fontScale }
  );

  const handleAddNote = () => {
    const trimmedNote = specialNotes.trim().slice(0, 20);
    if (trimmedNote && !notesTags.includes(trimmedNote)) {
      setNotesTags([...notesTags, trimmedNote]);
      setSpecialNotes('');
    }
  };

  const handleRemoveNote = (noteToRemove: string) => {
    setNotesTags(notesTags.filter((note) => note !== noteToRemove));
  };

  const _onCameraPress = () => {};

  function getAgeInMonths(birthDateStr: string): number {
    const normalized = birthDateStr.replace(/-/g, '');
    if (normalized.length !== 8) return 0;
    const y = parseInt(normalized.slice(0, 4), 10);
    const m = parseInt(normalized.slice(4, 6), 10);
    const d = parseInt(normalized.slice(6, 8), 10);
    const birth = new Date(y, m - 1, d);
    const today = new Date();
    return (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
  }

  const handleUpdateProfile = async () => {
    if (!storedProfile) return;
    let token = accessToken;
    if (!token) {
      const ok = await refreshTokens();
      if (ok) token = useAuthStore.getState().accessToken;
    }
    if (!token) {
      setErrorMessage('로그인이 필요합니다.');
      return;
    }
    const notesPayload = notesTags.length > 0 ? notesTags.join('\n') : null;
    setIsUpdateSubmitting(true);
    setErrorMessage('');
    try {
      const response = await childrenApi.updateChildNotes(token, { notes: notesPayload });
      const updated: ChildProfile = {
        ...storedProfile,
        notes: response.notes ? response.notes.split('\n').filter(Boolean) : undefined,
      };
      useRegistrationStore.getState().setChildProfile(updated);
      try {
        await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.CHILD_PROFILE_DATA, JSON.stringify(updated));
      } catch (error) {
        console.error('아이 프로필 수정 로컬 저장 실패:', error);
      }
      navigation.navigate(ROUTES.MAIN_TABS as never);
    } catch (error) {
      const err = error as { status?: number; data?: { detail?: string } };
      const message =
        err?.data && typeof err.data === 'object' && 'detail' in err.data
          ? String((err.data as { detail?: string }).detail)
          : '특이사항 수정에 실패했습니다.';
      setErrorMessage(message);
    } finally {
      setIsUpdateSubmitting(false);
    }
  };

  function formatBirthDate(yyyymmdd: string): string {
    return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
  }

  const handleSave = async () => {
    if (!name.trim() || !birthDate.trim() || !gender) {
      setErrorMessage('필수 정보를 모두 입력해주세요.');
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage('');
    const normalizedBirth = birthDate.replace(/\D/g, '');
    if (normalizedBirth.length !== 8) {
      setErrorMessage('생년월일은 8자리를 입력해주세요.');
      setIsSubmitting(false);
      return;
    }
    let token = accessToken;
    if (!token) {
      const refreshed = await refreshTokens();
      if (refreshed) token = useAuthStore.getState().accessToken;
    }
    if (!token) {
      setErrorMessage('로그인이 필요합니다.');
      setIsSubmitting(false);
      return;
    }
    const birthFormatted = formatBirthDate(normalizedBirth);
    const notesPayload = notesTags.length > 0 ? notesTags.join('\n') : null;
    try {
      const response = await childrenApi.createChild(token, {
        name: name.trim(),
        birth: birthFormatted,
        gender,
        notes: notesPayload,
      });
      const childProfile: ChildProfile = {
        childId: String(response.id),
        name: response.name,
        ageInMonths: getAgeInMonths(normalizedBirth),
        birthDate: normalizedBirth,
        gender: response.gender,
        notes: response.notes ? response.notes.split('\n').filter(Boolean) : undefined,
      };
      useRegistrationStore.getState().setChildProfileRegistered(true);
      useRegistrationStore.getState().setChildProfile(childProfile);
      try {
        await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.CHILD_PROFILE_REGISTERED, 'true');
        await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.CHILD_PROFILE_DATA, JSON.stringify(childProfile));
      } catch (error) {
        console.error('아이 프로필 등록 상태 저장 실패:', error);
      }
      navigation.navigate('MainTabs' as never);
    } catch (error) {
      const err = error as { status?: number; data?: unknown };
      const detail =
        err?.data && typeof err.data === 'object' && 'detail' in err.data
          ? (err.data as { detail?: string }).detail
          : null;
      if (err?.status === 400 && detail === 'Device not linked') {
        setErrorMessage('기기 등록이 필요합니다.');
      } else {
        setErrorMessage('아이 프로필 등록에 실패했습니다. 다시 시도해주세요.');
      }
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={flex1}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.headerWrapper, styles.headerSpacer]}>
            <ScreenHeader
              title={isEditMode ? '아이 프로필 수정' : '아이 프로필 등록'}
              onBack={() => navigation.navigate('MainTabs' as never)}
              insetByParent
            />
          </View>

          {loading ? (
            <View style={[styles.form, mb(scale(24))]}>
              <Text style={styles.loadingText}>아이 프로필 불러오는 중...</Text>
            </View>
          ) : fetchError ? (
            <View style={[styles.form, mb(scale(24))]}>
              <Text style={[styles.loadingText, styles.errorText]}>{fetchError}</Text>
            </View>
          ) : (
            <>
              <View style={styles.profileCard}>
                <View style={styles.avatarWrap}>
                  <View style={styles.avatarCircle}>
                    <Image source={require('@/assets/kids_profile.png')} style={styles.avatarImage} resizeMode="cover" />
                  </View>
                </View>
                {isEditMode ? (
                  <>
                    <Text style={styles.profileName}>{storedProfile!.name}</Text>
                    <View style={styles.profileMeta}>
                      <Text style={styles.profileMetaItem}>{getAgeDisplay(storedProfile!.ageInMonths)}</Text>
                      <View style={styles.metaDot} />
                      <Text style={styles.profileMetaItem}>{storedProfile!.gender === 'M' ? '남아' : '여아'}</Text>
                      <View style={styles.metaDot} />
                      <Text style={styles.profileMetaItem}>{formatBirthDateDisplay(storedProfile!.birthDate ?? '')}</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={mb(scale(12))}>
                      <Text style={styles.label}>이름</Text>
                      <View style={styles.inputUnderline}>
                        <TextInput
                          style={styles.input}
                          placeholder="자녀의 이름을 입력해주세요."
                          placeholderTextColor={theme.textMuted}
                          value={name}
                          onChangeText={setName}
                        />
                      </View>
                    </View>
                    <View style={mb(scale(12))}>
                      <Text style={styles.label}>생년월일 (8자리)</Text>
                      <View style={styles.inputUnderline}>
                        <TextInput
                          style={styles.input}
                          placeholder="ex) 20240101"
                          placeholderTextColor={theme.textMuted}
                          value={birthDate}
                          onChangeText={setBirthDate}
                          keyboardType="number-pad"
                          maxLength={8}
                        />
                      </View>
                    </View>
                    <View>
                      <Text style={styles.label}>성별</Text>
                      <View style={styles.genderRow}>
                        <TouchableOpacity style={styles.genderOption} onPress={() => setGender('M')} activeOpacity={0.7}>
                          <View style={styles.radioOuter}>
                            {gender === 'M' && <View style={styles.radioInner} />}
                          </View>
                          <Text style={styles.genderText}>남아</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.genderOption} onPress={() => setGender('F')} activeOpacity={0.7}>
                          <View style={styles.radioOuter}>
                            {gender === 'F' && <View style={styles.radioInner} />}
                          </View>
                          <Text style={styles.genderText}>여아</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )}
              </View>

              <View style={styles.notesCard}>
                <View style={styles.notesSectionTitle}>
                  <Ionicons name="star" size={scale(20)} color={theme.primary} />
                  <Text style={styles.notesSectionTitleText}>{isEditMode ? '특이사항 수정' : '특이사항 등록'}</Text>
                </View>
                <View style={styles.tagsWrap}>
                  {notesTags.map((note, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{note}</Text>
                      <TouchableOpacity onPress={() => handleRemoveNote(note)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close" size={scale(16)} color={theme.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <View style={styles.notesInputRow}>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="특이사항 입력 (20자 이내)"
                    placeholderTextColor={theme.textMuted}
                    value={specialNotes}
                    onChangeText={setSpecialNotes}
                    onSubmitEditing={handleAddNote}
                    returnKeyType="done"
                    maxLength={20}
                  />
                  <TouchableOpacity style={styles.addTagButton} onPress={handleAddNote} activeOpacity={0.7}>
                    <Ionicons name="add" size={scale(14)} color={theme.text} />
                    <Text style={styles.addTagButtonText}>추가</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.notesHint}>
                  * 아이의 특징을 입력해주세요.
                </Text>
              </View>

              <View style={styles.footer}>
                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
                {isEditMode ? (
                  <TouchableOpacity
                    style={[styles.saveButton, isUpdateSubmitting && styles.saveButtonDisabled]}
                    onPress={handleUpdateProfile}
                    disabled={isUpdateSubmitting}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.saveButtonText}>
                      {isUpdateSubmitting ? '저장 중...' : '아이 프로필 저장'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={isSubmitting}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.saveButtonText}>
                      {isSubmitting ? '저장 중...' : '아이 프로필 저장'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
