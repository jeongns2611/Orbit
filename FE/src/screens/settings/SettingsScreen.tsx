import { Text } from '@/components/common';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ROUTES, SIZES } from '@/constants';
import { useTheme } from '@/context/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import { resetToLogin } from '@/navigation/rootNavigation';
import { useAuthStore } from '@/store';
import { useRegistrationStore } from '@/store/registrationStore';
import {
  createResponsiveStyles,
  flex1,
  fontSize,
  px
} from '@/utils/styles';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ConfirmType = 'logout' | 'withdrawal' | null;

export function SettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { scale, verticalScale, fontScale } = useResponsive();
  const { theme, isDark, setTheme } = useTheme();

  const [confirmModal, setConfirmModal] = useState<ConfirmType>(null);

  const { deviceInfo, syncChildProfileFromServer } = useRegistrationStore();
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshTokens = useAuthStore((s) => s.refreshTokens);

  const styles = createResponsiveStyles(
    {
      container: [flex1, { backgroundColor: theme.background }],
      scrollContent: [
        px(scale(SIZES.spacing.lg)),
        { paddingTop: verticalScale(SIZES.spacing.md), paddingBottom: scale(120) },
      ],
      scrollView: [flex1],
      themeCard: [
        {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'space-between' as const,
          backgroundColor: theme.backgroundProfileCard ?? theme.backgroundCard,
          padding: scale(20),
          borderRadius: scale(24),
          marginTop: scale(16),
          marginBottom: scale(32),
        },
      ],
      themeLeft: [
        { flexDirection: 'row' as const, alignItems: 'center' as const, gap: scale(12) },
      ],
      themeIconWrap: [
        {
          width: scale(40),
          height: scale(40),
          borderRadius: scale(20),
          backgroundColor: theme.backgroundCard,
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
        },
      ],
      themeTitle: [
        fontSize(fontScale(SIZES.fontSize.medium)),
        { color: theme.text, fontWeight: '600' as const },
      ],
      themeSub: [
        fontSize(fontScale(10)),
        { color: theme.textMuted, marginTop: 2 },
      ],
      sectionTitle: [
        fontSize(fontScale(SIZES.fontSize.normal)),
        {
          color: theme.textMuted,
          fontWeight: 'bold' as const,
          marginBottom: scale(16),
          paddingHorizontal: scale(4),
          letterSpacing: 1,
          textTransform: 'uppercase' as const,
        },
      ],
      profileCard: [
        {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'space-between' as const,
          backgroundColor: theme.backgroundCard,
          padding: scale(20),
          borderRadius: scale(16),
          borderWidth: 1,
          borderColor: theme.cardBorder,
          marginBottom: scale(12),
        },
      ],
      profileCardLeft: [
        { flexDirection: 'row' as const, alignItems: 'center' as const, gap: scale(16) },
      ],
      profileCardText: [
        fontSize(fontScale(SIZES.fontSize.medium)),
        { color: theme.text, fontWeight: '500' as const },
      ],
      robotSectionTitle: [{ marginTop: scale(40) }],
      robotCard: [
        {
          backgroundColor: theme.backgroundCard,
          paddingHorizontal: scale(SIZES.spacing.lg),
          paddingVertical: scale(SIZES.spacing.lg),
          borderRadius: scale(24),
          borderWidth: 1,
          borderColor: theme.cardBorder,
          marginTop: scale(4),
        },
      ],
      robotRowWrap: [
        {
          width: '100%' as const,
          alignItems: 'center' as const,
        },
      ],
      robotRow: [
        {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'space-around' as const,
          width: '100%' as const,
          alignSelf: 'center' as const,
          marginLeft: scale(SIZES.spacing.md),
        },
      ],
      robotColumn: [
        {
          flex: 1,
          minWidth: 0,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          paddingHorizontal: 0,
        },
      ],
      robotLabel: [
        fontSize(fontScale(10)),
        { color: theme.text, fontWeight: 'bold' as const, marginBottom: scale(4), textAlign: 'center' as const },
      ],
      robotValue: [
        fontSize(fontScale(SIZES.fontSize.xsmall)),
        { color: theme.text, fontWeight: '600' as const, textAlign: 'center' as const },
      ],
      bottomSection: [
        {
          paddingHorizontal: scale(SIZES.spacing.lg),
          paddingTop: scale(32),
          paddingBottom: insets.bottom || scale(24),
          alignItems: 'center' as const,
        },
      ],
      actions: [
        {
          flexDirection: 'row' as const,
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
          gap: scale(24),
        },
      ],
      actionDivider: [
        { width: 1, height: scale(16), backgroundColor: theme.cardBorder },
      ],
      logoutButton: [
        fontSize(fontScale(SIZES.fontSize.small)),
        { color: theme.textMuted, textAlign: 'center' as const },
      ],
      withdrawalButton: [
        fontSize(fontScale(SIZES.fontSize.small)),
        { color: '#F87171', textAlign: 'center' as const },
      ],
      versionText: [
        fontSize(fontScale(11)),
        { color: theme.textMuted, marginTop: scale(16) },
      ],
      debugSection: [{ marginTop: scale(12) }],
      debugButton: [
        fontSize(fontScale(SIZES.fontSize.small)),
        { color: theme.textMuted, textAlign: 'center' as const },
      ],
      modalOverlay: [
        flex1,
        { justifyContent: 'center' as const, alignItems: 'center' as const, backgroundColor: 'rgba(0,0,0,0.4)' },
      ],
      modalBox: [
        {
          backgroundColor: theme.backgroundCard,
          borderRadius: scale(SIZES.borderRadius.lg),
          padding: scale(SIZES.spacing.xl),
          marginHorizontal: scale(SIZES.spacing.xl),
          minWidth: 280,
        },
      ],
      modalMessage: [
        fontSize(fontScale(SIZES.fontSize.medium)),
        { color: theme.text, textAlign: 'center' as const },
        { marginBottom: scale(SIZES.spacing.xl) },
      ],
      modalRow: [
        {
          flexDirection: 'row' as const,
          gap: scale(SIZES.spacing.md),
          justifyContent: 'center' as const,
        },
      ],
      modalButton: [
        {
          paddingVertical: scale(SIZES.spacing.md),
          paddingHorizontal: scale(SIZES.spacing.xl),
          borderRadius: scale(SIZES.borderRadius.md),
          minWidth: 100,
          alignItems: 'center' as const,
        },
      ],
      modalButtonCancel: [{ backgroundColor: theme.textMuted + '25' }],
      modalButtonConfirm: [{ backgroundColor: theme.primary }],
      modalButtonTextCancel: [
        fontSize(fontScale(SIZES.fontSize.medium)),
        { color: theme.text },
      ],
      modalButtonTextConfirm: [
        fontSize(fontScale(SIZES.fontSize.medium)),
        { color: theme.background },
      ],
    },
    { scale, verticalScale, fontScale }
  );

  const handleLogoutPress = () => setConfirmModal('logout');
  const handleWithdrawalPress = () => setConfirmModal('withdrawal');
  const closeModal = () => setConfirmModal(null);

  const handleConfirm = async () => {
    if (confirmModal !== 'logout' && confirmModal !== 'withdrawal') return;
    const action = confirmModal;
    closeModal();
    try {
      if (action === 'logout') {
        await useAuthStore.getState().logout();
      }
      if (action === 'withdrawal') {
        await useAuthStore.getState().withdraw();
      }
    } catch (e) {
      console.error(action === 'logout' ? '로그아웃 처리 실패' : '회원탈퇴 처리 실패', e);
    }
    setTimeout(() => resetToLogin(), 0);
  };

  const handleMyPage = () => {
    navigation.dispatch(
      CommonActions.navigate({ name: ROUTES.PASSWORD_RECONFIRM })
    );
  };

  const handleChildProfile = async () => {
    let token = accessToken;
    if (!token) {
      const ok = await refreshTokens();
      if (ok) token = useAuthStore.getState().accessToken;
    }
    if (token) {
      try {
        await syncChildProfileFromServer(token);
      } catch (_) {}
    }
    navigation.navigate(ROUTES.CHILD_PROFILE as never);
  };

  const handleResetRegistration = async () => {
    await useRegistrationStore.getState().resetRegistrationState();
    navigation.navigate(ROUTES.HOME as never);
  };

  const modalMessage =
    confirmModal === 'logout'
      ? '로그아웃 하시겠습니까?'
      : confirmModal === 'withdrawal'
        ? '정말 탈퇴하시겠습니까?'
        : '';

  return (
    <View
      style={[
        styles.container,
        { paddingLeft: insets.left, paddingRight: insets.right },
      ]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginHorizontal: -scale(SIZES.spacing.lg) }}>
          <ScreenHeader
            title="프로필 및 설정"
            onBack={() => navigation.goBack()}
            insetByParent
          />
        </View>

        <View style={styles.themeCard}>
          <View style={styles.themeLeft}>
            <View style={styles.themeIconWrap}>
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={scale(22)}
                color={theme.primary}
              />
            </View>
            <View>
              <Text style={styles.themeTitle}>테마 설정</Text>
              <Text style={styles.themeSub}>지구 / 우주 모드 전환</Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={(v) => setTheme(v ? 'dark' : 'light')}
            trackColor={{ false: theme.cardBorder, true: theme.primary }}
            thumbColor="#fff"
          />
        </View>

        <Text style={styles.sectionTitle}>프로필</Text>
        <TouchableOpacity style={styles.profileCard} onPress={handleMyPage} activeOpacity={0.7}>
          <View style={styles.profileCardLeft}>
            <Ionicons name="person-outline" size={scale(24)} color={theme.text} />
            <Text style={styles.profileCardText}>마이 페이지</Text>
          </View>
          <Ionicons name="chevron-forward" size={scale(22)} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.profileCard} onPress={handleChildProfile} activeOpacity={0.7}>
          <View style={styles.profileCardLeft}>
            <Ionicons name="person-circle-outline" size={scale(24)} color={theme.text} />
            <Text style={styles.profileCardText}>아이 프로필</Text>
          </View>
          <Ionicons name="chevron-forward" size={scale(22)} color={theme.primary} />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, styles.robotSectionTitle]}>로봇 정보</Text>
        <View style={styles.robotCard}>
          <View style={styles.robotRowWrap}>
            <View style={styles.robotRow}>
            <View style={styles.robotColumn}>
              <Text style={styles.robotLabel} numberOfLines={1} ellipsizeMode="tail">시리얼 넘버</Text>
              <Text style={styles.robotValue} numberOfLines={1} ellipsizeMode="tail">
                {deviceInfo?.serial_no ?? '-'}
              </Text>
            </View>
            <View style={[styles.robotColumn, { marginLeft: scale(SIZES.spacing.md) }]}>
              <Text style={styles.robotLabel} numberOfLines={1} ellipsizeMode="tail">이름</Text>
              <Text style={styles.robotValue} numberOfLines={1} ellipsizeMode="tail">
                {deviceInfo?.model_name ?? '-'}
              </Text>
            </View>
            <View style={styles.robotColumn}>
              <Text style={styles.robotLabel} numberOfLines={1} ellipsizeMode="tail">버전</Text>
              <Text style={styles.robotValue} numberOfLines={1} ellipsizeMode="tail">
                {deviceInfo?.firmware_version ?? '-'}
              </Text>
            </View>
          </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomSection}>
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleLogoutPress} activeOpacity={0.7}>
            <Text style={styles.logoutButton} fontWeight="medium">
              로그아웃
            </Text>
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity onPress={handleWithdrawalPress} activeOpacity={0.7}>
            <Text style={styles.withdrawalButton} fontWeight="medium">
              회원탈퇴
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.versionText}>OrbitCare System v1.0.2</Text>
        <View style={styles.debugSection}>
          <TouchableOpacity onPress={handleResetRegistration} activeOpacity={0.7}>
            <Text style={styles.debugButton}>등록 초기화 (시연용)</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={confirmModal !== null}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <View style={styles.modalRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={closeModal}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonTextCancel}>아니오</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleConfirm}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonTextConfirm}>예</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}