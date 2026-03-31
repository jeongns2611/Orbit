import { Text } from '@/components/common';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { COLORS, FONTS, ROUTES, SIZES } from '@/constants';
import { useTheme } from '@/context/ThemeContext';
import { formatDateKey } from '@/data/mockReports';
import { useResponsive } from '@/hooks/useResponsive';
import { SectionTitle } from '@/screens/home/components/SectionTitle';
import { TimelineSection } from '@/screens/home/components/TimeLineSection';
import { reportsApi } from '@/services';
import type { ApiError } from '@/services/api/client';
import { useSSEStore, useTodayReportStore, useTimelineByDateStore } from '@/store';
import { useAuthStore } from '@/store/authStore';
import { useRegistrationStore } from '@/store/registrationStore';
import { isReportErrorMessage, parseReportSections } from '@/utils/reportParser';
import {
  cardShadow,
  center,
  createResponsiveStyles,
  flex1,
  fontSize,
  mb,
  px,
  py
} from '@/utils/styles';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { Image as ExpoImage } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatDisplayDate(date: Date): string {
  return format(date, 'yyyy년 M월 d일', { locale: ko });
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

function getCalendarDays(month: Date): (Date | null)[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const dayOfWeek = getDay(start);
  const days = eachDayOfInterval({ start, end });
  const padding: null[] = Array(dayOfWeek).fill(null);
  return [...padding, ...days];
}

export function ReportScreen() {
  const insets = useSafeAreaInsets();
  const { scale, verticalScale, fontScale } = useResponsive();
  const { deviceRegistered, childProfileRegistered } = useRegistrationStore();
  const isFullyRegistered = deviceRegistered && childProfileRegistered;
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const rocketAnim = useRef(new Animated.Value(0)).current;
  const star1 = useRef(new Animated.Value(0.3)).current;
  const star2 = useRef(new Animated.Value(0.3)).current;
  const star3 = useRef(new Animated.Value(0.3)).current;
  const star4 = useRef(new Animated.Value(0.3)).current;
  const star5 = useRef(new Animated.Value(0.3)).current;
  const cloudDrift1 = useRef(new Animated.Value(0)).current;
  const cloudDrift2 = useRef(new Animated.Value(0)).current;
  const cloudDrift3 = useRef(new Animated.Value(0)).current;
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [reportSlideIndex, setReportSlideIndex] = useState(0);
  const [reportText, setReportText] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportImageUrl, setReportImageUrl] = useState<string | null>(null);
  const [_reportNotFound, setReportNotFound] = useState(false);
  const storeReportText = useTodayReportStore((s) => s.reportText);
  const storeImageUrl = useTodayReportStore((s) => s.imageUrl);
  const storeTimelineEvents = useSSEStore((s) => s.timelineEvents);
  const timelineByDate = useTimelineByDateStore((s) => s.timelineByDate);

  const accessToken = useAuthStore((s) => s.accessToken);
  const selectedKey = formatDateKey(selectedDate);
  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);

  const fetchReport = useCallback(async () => {
    if (!accessToken) {
      setReportText(null);
      setReportImageUrl(null);
      setReportLoading(false);
      setReportNotFound(false);
      return;
    }
    setReportLoading(true);
    setReportNotFound(false);
    setReportImageUrl(null);
    try {
      const [reportSettled, imageSettled] = await Promise.allSettled([
        reportsApi.getReport(accessToken, selectedKey),
        reportsApi.getLatestImage(accessToken, selectedKey),
      ]);

      if (reportSettled.status === 'fulfilled') {
        setReportText(reportSettled.value.report_text);
        setReportNotFound(false);
      } else {
        const apiErr = reportSettled.reason as ApiError;
        if (apiErr?.status === 404) {
          setReportNotFound(true);
        }
        setReportText(null);
      }

      if (imageSettled.status === 'fulfilled') {
        setReportImageUrl(imageSettled.value.url);
      } else {
        setReportImageUrl(null);
      }
    } catch (_err) {
      setReportText(null);
      setReportImageUrl(null);
    } finally {
      setReportLoading(false);
    }
  }, [accessToken, selectedKey]);

  useEffect(() => {
    const todayKey = formatDateKey(new Date());
    if (selectedKey === todayKey) {
      setReportText(storeReportText);
      setReportImageUrl(storeImageUrl);
      setReportLoading(false);
      setReportNotFound(false);
      return;
    }
    fetchReport();
  }, [fetchReport, selectedKey, storeReportText, storeImageUrl]);

  useEffect(() => {
    setReportSlideIndex(0);
  }, [selectedKey]);

  useEffect(() => {
    const rocketLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(rocketAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(rocketAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    );
    rocketLoop.start();
    return () => rocketLoop.stop();
  }, [rocketAnim]);

  useEffect(() => {
    const twinkle = (anim: Animated.Value, delay: number, duration = 800) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.25,
            duration,
            useNativeDriver: true,
          }),
        ])
      );
    const loop1 = twinkle(star1, 0);
    const loop2 = twinkle(star2, 400);
    const loop3 = twinkle(star3, 800);
    const loop4 = twinkle(star4, 200, 1400);
    const loop5 = twinkle(star5, 500);
    loop1.start();
    loop2.start();
    loop3.start();
    loop4.start();
    loop5.start();
    return () => {
      loop1.stop();
      loop2.stop();
      loop3.stop();
      loop4.stop();
      loop5.stop();
    };
  }, [star1, star2, star3, star4, star5]);

  useEffect(() => {
    if (isDark) {
      cloudDrift1.setValue(0);
      cloudDrift2.setValue(0);
      cloudDrift3.setValue(0);
      return undefined;
    }
    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(cloudDrift1, { toValue: 1, duration: 22000, useNativeDriver: true }),
        Animated.timing(cloudDrift1, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.timing(cloudDrift2, { toValue: 1, duration: 38000, useNativeDriver: true }),
        Animated.timing(cloudDrift2, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    const loop3 = Animated.loop(
      Animated.sequence([
        Animated.timing(cloudDrift3, { toValue: 1, duration: 46000, useNativeDriver: true }),
        Animated.timing(cloudDrift3, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop1.start();
    loop2.start();
    loop3.start();
    return () => {
      loop1.stop();
      loop2.stop();
      loop3.stop();
    };
  }, [cloudDrift1, cloudDrift2, cloudDrift3, isDark]);

  const reportSections = useMemo(
    () => (reportText ? parseReportSections(reportText) : []),
    [reportText]
  );
  const timelineEvents = useMemo(() => {
    const todayKey = formatDateKey(new Date());
    if (selectedKey === todayKey) {
      const live = storeTimelineEvents.slice(0, 10);
      return live.length > 0 ? live : (timelineByDate[todayKey] ?? []);
    }
    return timelineByDate[selectedKey] ?? [];
  }, [selectedKey, storeTimelineEvents, timelineByDate]);
  const goPrevSlide = () => {
    setReportSlideIndex((i) => Math.max(0, i - 1));
  };
  const goNextSlide = () => {
    setReportSlideIndex((i) => Math.min(reportSections.length - 1, i + 1));
  };

  const styles = createResponsiveStyles(
    {
      container: [flex1, { backgroundColor: theme.background }],
      scrollContent: [
        px(scale(SIZES.spacing.lg)),
        { paddingTop: verticalScale(SIZES.spacing.md), paddingBottom: scale(100) },
      ],
      heroBlock: [
        {
          marginHorizontal: -scale(SIZES.spacing.lg),
          height: verticalScale(128),
          marginBottom: verticalScale(SIZES.spacing.xl),
          backgroundColor: isDark ? '#1E293B' : 'rgba(228, 249, 255, 0.9)',
          overflow: 'hidden' as const,
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
        },
      ],
      heroRocketWrap: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
      datePickerButton: [
        {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'space-between' as const,
          backgroundColor: theme.backgroundCard,
          borderRadius: scale(16),
          paddingVertical: scale(SIZES.spacing.md),
          paddingHorizontal: scale(SIZES.spacing.lg),
          marginBottom: scale(SIZES.spacing.lg),
          borderWidth: 2,
          borderColor: theme.primary,
          shadowColor: theme.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 4,
        },
        cardShadow,
      ],
      datePickerText: [
        fontSize(fontScale(SIZES.fontSize.medium)),
        { color: theme.text, fontWeight: '600' as const },
      ],
      imageBlock: [
        {
          width: '100%',
          aspectRatio: 16 / 9,
          backgroundColor: theme.backgroundCard,
          borderRadius: scale(SIZES.borderRadius.lg),
          overflow: 'hidden' as const,
          marginBottom: scale(SIZES.spacing.lg),
          borderWidth: 2,
          borderColor: theme.cardBorder,
        },
        cardShadow,
      ],
      imagePlaceholder: [
        center,
        {
          position: 'absolute' as const,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        },
      ],
      imagePlaceholderText: [
        fontSize(fontScale(SIZES.fontSize.small)),
        { color: theme.textSecondary },
      ],
      reportSliderWrapper: {
        position: 'relative' as const,
        marginBottom: scale(SIZES.spacing.md),
      },
      reportSlideArrow: {
        position: 'absolute' as const,
        top: 0,
        bottom: 0,
        justifyContent: 'center' as const,
        paddingHorizontal: scale(SIZES.spacing.sm),
        zIndex: 10,
        opacity: 0.75,
      },
      reportSlideArrowLeft: {
        left: 0,
      },
      reportSlideArrowRight: {
        right: 0,
      },
      reportSlideArrowDisabled: {
        opacity: 0.3,
      },
      reportSlideContainer: {
        width: '100%' as const,
      },
      reportSlideCard: [
        {
          backgroundColor: theme.backgroundCard,
          borderRadius: scale(20),
          padding: scale(SIZES.spacing.md),
          paddingLeft: scale(44),
          paddingRight: scale(44),
          minHeight: scale(200),
          borderWidth: 3,
          borderColor: theme.cardBorder,
          overflow: 'hidden' as const,
          flexDirection: 'column' as const,
        },
        cardShadow,
      ],
      reportCardLines: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.08,
      },
      reportCardLine: {
        height: verticalScale(26),
        borderBottomWidth: 1,
        borderBottomColor: theme.textMuted,
      },
      reportCardDecorationIcon: {
        position: 'absolute' as const,
        top: scale(16),
        right: scale(16),
        opacity: 0.12,
        zIndex: 5,
      },
      reportSlideHeader: {
        alignItems: 'center' as const,
        marginBottom: scale(SIZES.spacing.sm),
        zIndex: 10,
      },
      reportSlideTitle: [
        fontSize(fontScale(SIZES.fontSize.xlarge)),
        {
          fontFamily: FONTS.reportHandwriting,
          color: theme.accentBlue,
          fontWeight: 'bold' as const,
          textAlign: 'center' as const,
        },
      ],
      reportSlideUnderline: {
        width: scale(60),
        height: 3,
        backgroundColor: theme.sectionTitleBar,
        borderRadius: 2,
        marginTop: scale(6),
      },
      reportSlideHeaderWrap: {
        alignItems: 'center' as const,
        marginBottom: scale(SIZES.spacing.sm),
        zIndex: 10,
      },
      reportSlideContentScroll: {
        zIndex: 10,
        flex: 1,
      },
      reportSlideContentInner: {
        paddingTop: scale(SIZES.spacing.md),
        paddingBottom: scale(SIZES.spacing.sm),
      },
      reportLineContainer: {
        flexDirection: 'row' as const,
        alignItems: 'flex-start' as const,
        marginBottom: scale(6),
      },
      reportBullet: [
        fontSize(fontScale(SIZES.fontSize.xlarge)),
        {
          fontFamily: FONTS.reportHandwriting,
          color: theme.primary,
          marginRight: scale(6),
          lineHeight: fontScale(SIZES.fontSize.large) * 1.4,
        },
      ],
      reportContent: [
        fontSize(fontScale(SIZES.fontSize.xlarge)),
        {
          fontFamily: FONTS.reportHandwriting,
          color: theme.text,
          lineHeight: fontScale(SIZES.fontSize.large) * 1.4,
          flex: 1,
        },
      ],
      reportPagination: {
        flexDirection: 'row' as const,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        gap: scale(8),
        marginTop: 'auto' as const,
        paddingTop: scale(SIZES.spacing.sm),
        zIndex: 10,
      },
      reportDot: {
        width: scale(10),
        height: scale(10),
        borderRadius: scale(5),
        backgroundColor: theme.sectionTitleBar,
      },
      reportDotActive: {
        backgroundColor: theme.primary,
        width: scale(28),
      },
      reportEmpty: [
        {
          backgroundColor: theme.backgroundCard,
          borderRadius: scale(20),
          marginBottom: scale(SIZES.spacing.xl),
          borderWidth: 3,
          borderColor: theme.cardBorder,
          minHeight: scale(200),
          overflow: 'hidden' as const,
          padding: scale(SIZES.spacing.md),
          paddingLeft: scale(44),
          paddingRight: scale(44),
        },
        cardShadow,
      ],
      reportEmptyInner: [
        center,
        py(scale(SIZES.spacing.xl)),
        { zIndex: 10 },
      ],
      reportEmptyIcon: {
        marginBottom: scale(SIZES.spacing.sm),
      },
      reportEmptyText: [
        fontSize(fontScale(SIZES.fontSize.medium)),
        {
          fontFamily: FONTS.reportHandwriting,
          color: theme.textSecondary,
          textAlign: 'center' as const,
        },
      ],
      reportSimpleCard: [
        {
          backgroundColor: theme.backgroundCard,
          borderRadius: scale(SIZES.borderRadius.lg),
          borderWidth: 1,
          borderColor: theme.cardBorder,
          minHeight: scale(200),
          padding: scale(SIZES.spacing.lg),
          paddingLeft: scale(44),
          paddingRight: scale(44),
          marginBottom: scale(SIZES.spacing.xl),
          position: 'relative' as const,
          overflow: 'hidden' as const,
        },
      ],
      reportSimpleCardLines: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.08,
      },
      reportSimpleCardLine: {
        height: verticalScale(26),
        borderBottomWidth: 1,
        borderBottomColor: theme.textMuted,
      },
      reportSimpleCardText: [
        fontSize(fontScale(SIZES.fontSize.medium)),
        {
          fontFamily: FONTS.reportHandwriting,
          color: theme.textSecondary,
          textAlign: 'center' as const,
          zIndex: 10,
        },
      ],
      timelineSectionWrapper: [
        mb(scale(SIZES.spacing.lg)),
        { marginTop: verticalScale(SIZES.spacing.xl) },
      ],
      modalOverlay: [
        flex1,
        { justifyContent: 'flex-end' as const, backgroundColor: 'rgba(0,0,0,0.45)' },
      ],
      modalSheet: [
        {
          backgroundColor: theme.backgroundCard,
          borderTopLeftRadius: scale(20),
          borderTopRightRadius: scale(20),
          paddingBottom: insets.bottom + scale(SIZES.spacing.lg),
          maxHeight: '80%',
          borderTopWidth: 2,
          borderLeftWidth: 2,
          borderRightWidth: 2,
          borderColor: theme.primary,
        },
        cardShadow,
      ],
      modalHeader: [
        {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'space-between' as const,
          paddingHorizontal: scale(SIZES.spacing.lg),
          paddingVertical: scale(SIZES.spacing.md),
          borderBottomWidth: 2,
          borderBottomColor: theme.primary + '40',
        },
      ],
      modalTitle: [
        fontSize(fontScale(SIZES.fontSize.large)),
        { color: theme.text, fontWeight: 'bold' as const },
      ],
      monthNavRow: [
        {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'space-between' as const,
          paddingHorizontal: scale(SIZES.spacing.lg),
          paddingVertical: scale(SIZES.spacing.sm),
        },
      ],
      monthNavText: [
        fontSize(fontScale(SIZES.fontSize.medium)),
        { color: theme.text, fontWeight: '600' as const },
      ],
      weekdayRow: [
        {
          flexDirection: 'row' as const,
          paddingHorizontal: scale(SIZES.spacing.lg),
          marginBottom: scale(6),
        },
      ],
      weekdayCell: [
        center,
        { flex: 1, minWidth: 0, paddingVertical: scale(4) },
      ],
      weekdayLabelText: [
        fontSize(fontScale(SIZES.fontSize.small)),
        { color: theme.textSecondary },
      ],
      calendarGrid: [
        {
          paddingHorizontal: scale(SIZES.spacing.lg),
        },
      ],
      calendarRow: [
        {
          flexDirection: 'row' as const,
          marginBottom: scale(2),
        },
      ],
      calendarDayCell: [
        center,
        {
          flex: 1,
          minWidth: 0,
          paddingVertical: scale(8),
        },
      ],
      calendarDayInner: [
        center,
        {
          width: scale(36),
          height: scale(36),
          borderRadius: scale(18),
          backgroundColor: theme.backgroundCard,
          borderWidth: 2,
          borderColor: theme.primary,
        },
        cardShadow,
      ],
      calendarDayInnerSelected: {
        backgroundColor: theme.primary,
        borderColor: theme.primary,
      },
      calendarDayInnerToday: {
        borderWidth: 2,
        borderColor: theme.primary,
      },
      calendarDayText: [fontSize(fontScale(SIZES.fontSize.small)), { color: theme.text }],
      calendarDayTextSelected: { color: '#0B1120' },
      calendarDayTextSunday: { color: COLORS.error },
      calendarDayTextSaturday: { color: theme.calendarSaturdayText },
    },
    { scale, verticalScale, fontScale }
  );

  const todayKey = formatDateKey(new Date());
  const isSelectedToday = selectedKey === todayKey;
  const hasValidReport = Boolean(reportText?.trim() && !isReportErrorMessage(reportText));

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setCalendarVisible(false);
  };

  const isNextMonthDisabled =
    format(calendarMonth, 'yyyy-MM') >= format(new Date(), 'yyyy-MM');


  const rocketTranslateY = rocketAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -2, 0],
  });

  const rocketTranslateX = rocketAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 2, 0],
  });

  const rocketRotate = rocketAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['0deg', '6deg', '0deg', '-6deg', '0deg'],
  });

  const screenWidth = Dimensions.get('window').width;
  const cloudFlowDistance = screenWidth + scale(250);
  const cloudTranslate1 = cloudDrift1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, cloudFlowDistance],
  });
  const cloudTranslate1Trail = cloudDrift1.interpolate({
    inputRange: [0, 1],
    outputRange: [-cloudFlowDistance, 0],
  });
  const cloudTranslate2 = cloudDrift2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -cloudFlowDistance],
  });
  const cloudTranslate2Trail = cloudDrift2.interpolate({
    inputRange: [0, 1],
    outputRange: [cloudFlowDistance, 0],
  });
  const cloudTranslate3 = cloudDrift3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, cloudFlowDistance],
  });
  const cloudTranslate3Trail = cloudDrift3.interpolate({
    inputRange: [0, 1],
    outputRange: [-cloudFlowDistance, 0],
  });

  return (
    <View
      style={[
        styles.container,
        { paddingLeft: insets.left, paddingRight: insets.right },
      ]}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginHorizontal: -scale(SIZES.spacing.lg) }}>
          <ScreenHeader
            title="탐사 일지 모음집"
            onBack={() => navigation.navigate(ROUTES.HOME as never)}
            insetByParent
          />
        </View>

        <View style={styles.heroBlock}>
          {isDark && (
            <>
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    top: verticalScale(16),
                    left: scale(40),
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: '#fff',
                  },
                  { opacity: star1 },
                ]}
              />
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    top: verticalScale(38),
                    right: scale(80),
                    width: 2,
                    height: 2,
                    borderRadius: 1,
                    backgroundColor: '#fff',
                  },
                  { opacity: star5 },
                ]}
              />
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    top: verticalScale(40),
                    left: '25%',
                    width: 2,
                    height: 2,
                    borderRadius: 1,
                    backgroundColor: theme.primary,
                  },
                  { opacity: star2 },
                ]}
              />
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    top: verticalScale(72),
                    left: '28%',
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: '#fff',
                  },
                  { opacity: star3 },
                ]}
              />
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    top: verticalScale(56),
                    right: scale(48),
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.primary,
                  },
                  { opacity: star4 },
                ]}
              />
            </>
          )}
          {!isDark && (
            <>
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    left: -scale(115),
                    top: verticalScale(-48),
                    width: scale(220),
                    height: scale(110),
                    zIndex: 0,
                  },
                  { transform: [{ translateX: cloudTranslate1 }] },
                ]}
              >
                <Animated.Image
                  source={require('../../assets/cloud.png')}
                  style={{ width: '100%', height: '100%', resizeMode: 'contain', opacity: 0.72 }}
                />
              </Animated.View>
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    left: -scale(115),
                    top: verticalScale(-48),
                    width: scale(220),
                    height: scale(110),
                    zIndex: 0,
                  },
                  { transform: [{ translateX: cloudTranslate1Trail }] },
                ]}
              >
                <Animated.Image
                  source={require('../../assets/cloud.png')}
                  style={{ width: '100%', height: '100%', resizeMode: 'contain', opacity: 0.72 }}
                />
              </Animated.View>
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    right: -scale(60),
                    top: verticalScale(36),
                    width: scale(120),
                    height: scale(60),
                    zIndex: 0,
                  },
                  { transform: [{ translateX: cloudTranslate2 }] },
                ]}
              >
                <Animated.Image
                  source={require('../../assets/cloud1.png')}
                  style={{ width: '100%', height: '100%', resizeMode: 'contain', opacity: 0.68 }}
                />
              </Animated.View>
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    right: -scale(60),
                    top: verticalScale(36),
                    width: scale(120),
                    height: scale(60),
                    zIndex: 0,
                  },
                  { transform: [{ translateX: cloudTranslate2Trail }] },
                ]}
              >
                <Animated.Image
                  source={require('../../assets/cloud1.png')}
                  style={{ width: '100%', height: '100%', resizeMode: 'contain', opacity: 0.68 }}
                />
              </Animated.View>
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    left: scale(-30),
                    top: verticalScale(72),
                    width: scale(210),
                    height: scale(105),
                    zIndex: 0,
                  },
                  { transform: [{ translateX: cloudTranslate3 }] },
                ]}
              >
                <Animated.Image
                  source={require('../../assets/cloud2.png')}
                  style={{ width: '100%', height: '100%', resizeMode: 'contain', opacity: 0.7 }}
                />
              </Animated.View>
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    left: scale(-30),
                    top: verticalScale(72),
                    width: scale(210),
                    height: scale(105),
                    zIndex: 0,
                  },
                  { transform: [{ translateX: cloudTranslate3Trail }] },
                ]}
              >
                <Animated.Image
                  source={require('../../assets/cloud2.png')}
                  style={{ width: '100%', height: '100%', resizeMode: 'contain', opacity: 0.7 }}
                />
              </Animated.View>
            </>
          )}
          <Animated.View
            style={[
              styles.heroRocketWrap,
              {
                zIndex: 10,
                transform: [
                  { rotate: '30deg' },
                  { rotate: rocketRotate },
                  { translateY: rocketTranslateY },
                  { translateX: rocketTranslateX },
                ],
              },
            ]}
          >
            <Animated.Image
              source={isDark ? require('../../assets/rocket.png') : require('../../assets/rocket_light.png')}
              style={{
                width: scale(56), 
                height: scale(56),
                resizeMode: 'contain',
              }}
            />
          </Animated.View>
        </View>

        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setCalendarVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.datePickerText}>
            {formatDisplayDate(selectedDate)}
          </Text>
          <Ionicons name="calendar-outline" size={scale(22)} color={theme.primary} />
        </TouchableOpacity>

        <SectionTitle
          title={`${format(selectedDate, 'M월 d일', { locale: ko })}의 탐사일지`}
        />

        {isFullyRegistered && hasValidReport && (
          <View style={styles.imageBlock}>
            {reportImageUrl ? (
              <ExpoImage
                source={{ uri: reportImageUrl }}
                cachePolicy="disk"
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={scale(36)} color={theme.textSecondary} />
                <Text style={[styles.imagePlaceholderText, { marginTop: scale(6) }]}>
                  대표 이미지
                </Text>
              </View>
            )}
          </View>
        )}

        
        {reportLoading ? (
          <View style={styles.reportEmpty}>
            <View style={styles.reportCardLines}>
              {[...Array(12)].map((_, i) => (
                <View key={i} style={styles.reportCardLine} />
              ))}
            </View>
            <View style={styles.reportCardDecorationIcon}>
              <Ionicons name="planet-outline" size={scale(28)} color={theme.accentBlue} />
            </View>
            <View style={styles.reportEmptyInner}>
              <ActivityIndicator size="large" color={theme.primary} style={styles.reportEmptyIcon} />
              <Text style={styles.reportEmptyText}>불러오는 중...</Text>
            </View>
          </View>
        ) : hasValidReport && reportSections.length > 0 ? (
            <View style={styles.reportSliderWrapper}>
              <View style={styles.reportSlideContainer}>
                {(() => {
                  const section = reportSections[reportSlideIndex];
                  if (!section) return null;
                  return (
                    <View style={styles.reportSlideCard}>
                      <View style={styles.reportCardLines}>
                        {[...Array(12)].map((_, i) => (
                          <View key={i} style={styles.reportCardLine} />
                        ))}
                      </View>
                      <View style={styles.reportCardDecorationIcon}>
                        <Ionicons name="planet-outline" size={scale(28)} color={theme.accentBlue} />
                      </View>
                      <View style={styles.reportSlideHeaderWrap}>
                        <View style={styles.reportSlideHeader}>
                          <Text style={styles.reportSlideTitle}>{section.title}</Text>
                        </View>
                        <View style={styles.reportSlideUnderline} />
                      </View>
                      <View style={styles.reportSlideContentScroll}>
                        <View style={styles.reportSlideContentInner}>
                          {section.content
                            .trim()
                            .split(/\n/)
                            .filter(Boolean)
                            .map((line, i) => {
                              const isBullet = line.trim().startsWith('- ');
                              const text = isBullet ? line.trim().slice(2) : line.trim();
                              return (
                                <View key={i} style={styles.reportLineContainer}>
                                  {isBullet && (
                                    <Text style={styles.reportBullet}>•</Text>
                                  )}
                                  <Text style={styles.reportContent}>{text}</Text>
                                </View>
                              );
                            })}
                        </View>
                      </View>
                      <View style={styles.reportPagination}>
                        {reportSections.map((_, idx) => (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => setReportSlideIndex(idx)}
                            style={[
                              styles.reportDot,
                              idx === reportSlideIndex && styles.reportDotActive,
                            ]}
                          />
                        ))}
                      </View>
                    </View>
                  );
                })()}
              </View>

              <TouchableOpacity
                style={[
                  styles.reportSlideArrow,
                  styles.reportSlideArrowLeft,
                  reportSlideIndex === 0 && styles.reportSlideArrowDisabled,
                ]}
                onPress={goPrevSlide}
                disabled={reportSlideIndex === 0}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chevron-back"
                  size={scale(22)}
                  color={reportSlideIndex === 0 ? theme.textSecondary + '99' : theme.primary + '99'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.reportSlideArrow,
                  styles.reportSlideArrowRight,
                  reportSlideIndex >= reportSections.length - 1 && styles.reportSlideArrowDisabled,
                ]}
                onPress={goNextSlide}
                disabled={reportSlideIndex >= reportSections.length - 1}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chevron-forward"
                  size={scale(22)}
                  color={
                    reportSlideIndex >= reportSections.length - 1
                      ? theme.textSecondary + '99'
                      : theme.primary + '99'
                  }
                />
              </TouchableOpacity>
            </View>
          ) : hasValidReport && reportSections.length === 0 ? (
            <View style={styles.reportEmpty}>
              <View style={styles.reportCardLines}>
                {[...Array(12)].map((_, i) => (
                  <View key={i} style={styles.reportCardLine} />
                ))}
              </View>
              <View style={styles.reportCardDecorationIcon}>
                <Ionicons name="planet" size={scale(28)} color={theme.accentBlue} />
              </View>
              <View style={styles.reportEmptyInner}>
                <Ionicons name="document-text-outline" size={scale(48)} color={theme.textMuted} style={styles.reportEmptyIcon} />
                <Text style={styles.reportEmptyText}>
                  리포트 형식이 올바르지 않습니다.
                </Text>
              </View>
            </View>
          ) : isSelectedToday ? (
            <View style={styles.reportSimpleCard}>
              <View style={styles.reportSimpleCardLines}>
                {[...Array(12)].map((_, i) => (
                  <View key={i} style={styles.reportSimpleCardLine} />
                ))}
              </View>
              <Text style={[styles.reportSimpleCardText, { paddingVertical: scale(SIZES.spacing.xl) }]}>
                오늘 리포트를 불러올 수 없어요.{'\n'}홈에서 탐사 리포트를 생성해보세요.
              </Text>
            </View>
          ) : (
            <View style={styles.reportSimpleCard}>
              <View style={styles.reportSimpleCardLines}>
                {[...Array(12)].map((_, i) => (
                  <View key={i} style={styles.reportSimpleCardLine} />
                ))}
              </View>
              <Text style={[styles.reportSimpleCardText, { paddingVertical: scale(SIZES.spacing.xl) }]}>
                해당 날짜에 리포트가 없습니다.
              </Text>
            </View>
          )}

        <View style={styles.timelineSectionWrapper}>
          <TimelineSection
            isFullyRegistered={isFullyRegistered}
            events={timelineEvents}
            showTimeCaption={false}
          />
        </View>
      </ScrollView>

      <Modal
        visible={calendarVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCalendarVisible(false)}
        >
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>날짜 선택</Text>
              <TouchableOpacity
                onPress={() => setCalendarVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={scale(24)} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.monthNavRow}>
              <TouchableOpacity
                onPress={() => setCalendarMonth((m) => subMonths(m, 1))}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="chevron-back" size={scale(24)} color={theme.primary} />
              </TouchableOpacity>
              <Text style={styles.monthNavText}>
                {format(calendarMonth, 'yyyy년 M월', { locale: ko })}
              </Text>
              <TouchableOpacity
                onPress={() => setCalendarMonth((m) => addMonths(m, 1))}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                disabled={isNextMonthDisabled}
                style={{ opacity: isNextMonthDisabled ? 0.4 : 1 }}
              >
                <Ionicons
                  name="chevron-forward"
                  size={scale(24)}
                  color={theme.primary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((label) => (
                <View key={label} style={styles.weekdayCell}>
                  <Text style={styles.weekdayLabelText}>{label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {(() => {
                const rows: (Date | null)[][] = [];
                for (let i = 0; i < calendarDays.length; i += 7) {
                  const row = calendarDays.slice(i, i + 7);
                  rows.push(
                    row.length < 7 ? [...row, ...Array(7 - row.length).fill(null)] : row
                  );
                }
                return rows.map((row, rowIndex) => (
                  <View key={`row-${rowIndex}`} style={styles.calendarRow}>
                    {row.map((day, colIndex) => {
                      if (day === null) {
                        return (
                          <View key={`empty-${rowIndex}-${colIndex}`} style={styles.calendarDayCell} />
                        );
                      }
                      const key = formatDateKey(day);
                      const isSelected = key === selectedKey;
                      const isToday = key === todayKey;
                      const dayOfWeek = getDay(day);
                      const isSunday = dayOfWeek === 0;
                      const isSaturday = dayOfWeek === 6;
                      return (
                        <View key={key} style={styles.calendarDayCell}>
                          <TouchableOpacity
                            style={[
                              styles.calendarDayInner,
                              isSelected && styles.calendarDayInnerSelected,
                              !isSelected && isToday && styles.calendarDayInnerToday,
                            ]}
                            onPress={() => handleSelectDate(day)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.calendarDayText,
                                isSelected && styles.calendarDayTextSelected,
                                !isSelected && isSunday && styles.calendarDayTextSunday,
                                !isSelected && isSaturday && styles.calendarDayTextSaturday,
                              ]}
                            >
                              {format(day, 'd')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                ));
              })()}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}