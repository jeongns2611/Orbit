import { ROUTES, SIZES } from '@/constants';
import { useTheme } from '@/context/ThemeContext';
import { formatDateKey } from '@/data/mockReports';
import { useResponsive } from '@/hooks/useResponsive';
import type { RootStackParamList } from '@/navigation/types';
import { reportsApi } from '@/services';
import { useAuthStore, useSSEStore, useTimelineByDateStore } from '@/store';
import { useRegistrationStore } from '@/store/registrationStore';
import { useTodayReportStore } from '@/store/todayReportStore';
import { createResponsiveStyles, flex1, px } from '@/utils/styles';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChildProfileCard } from './components/ChildProfileCard';
import { DailyReportSection } from './components/DailyReportSection';
import { DeviceStatusCard } from './components/DeviceStatusCard';
import { HomeHeader } from './components/HomeHeader';
import { RegistrationButtons } from './components/RegistrationButtons';
import { RegistrationProgress } from './components/RegistrationProgress';
import { ServiceGuideCard } from './components/ServiceGuideCard';
import { TIMELINE_MAX_SCROLL_HEIGHT, TimelineSection } from './components/TimeLineSection';


interface HomeScreenProps {
  nickname?: string;
  onDeviceRegister?: () => void;
  onProfileRegister?: () => void;
}

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export function HomeScreen({
  nickname = '사용자',
  onDeviceRegister,
  onProfileRegister,
}: HomeScreenProps) {

  const { nickname: storedNickname, refreshTokens, accessToken, tokenIssuedAt, expiresIn } = useAuthStore();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const topInset = insets.top || (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0);
  const { scale, verticalScale, fontScale } = useResponsive();
  const { deviceRegistered, childProfileRegistered, deviceInfo, childProfile, initializeRegistrationState, syncDeviceRegisteredFromServer, syncChildProfileFromServer } = useRegistrationStore();
  const [dailyReport, setDailyReport] = useState<string | null>(null);
  const timelineEvents = useSSEStore((s) => s.timelineEvents);
  const setTimelineForDate = useTimelineByDateStore((s) => s.setTimelineForDate);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [dailyReportImageUrl, setDailyReportImageUrl] = useState<string | null>(null);
  const reportToShow = dailyReport;
  const { theme } = useTheme();
  const isFullyRegistered = deviceRegistered && childProfileRegistered;
  const todayReportFetchedRef = useRef(false);
  const setTodayReport = useTodayReportStore((s) => s.setTodayReport);

  useEffect(() => {
    const todayKey = formatDateKey(new Date());
    setTimelineForDate(todayKey, timelineEvents.slice(0, 10));
  }, [timelineEvents, setTimelineForDate]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function run() {
        initializeRegistrationState();
        let token = accessToken;
        const needsRefresh =
          tokenIssuedAt != null &&
          expiresIn != null &&
          Date.now() >= tokenIssuedAt + Math.max(expiresIn - 60, 0) * 1000;

        if (!token || needsRefresh) {
          const refreshed = await refreshTokens();
          if (cancelled) return;
          if (!refreshed) return;
          token = useAuthStore.getState().accessToken;
        }
        if (token) {
          await syncDeviceRegisteredFromServer(token);
          await syncChildProfileFromServer(token);
        }
        const { deviceRegistered: devReg, childProfileRegistered: childReg } = useRegistrationStore.getState();
        if (cancelled || !token || !devReg || !childReg) return;

        const todayKey = formatDateKey(new Date());
        const shouldFetchTodayReport = !todayReportFetchedRef.current;
        if (shouldFetchTodayReport) {
          todayReportFetchedRef.current = true;
          try {
            const [reportRes, imageRes] = await Promise.allSettled([
              reportsApi.getReport(token, todayKey),
              reportsApi.getLatestImage(token, todayKey),
            ]);
            if (!cancelled) {
              const reportText = reportRes.status === 'fulfilled' ? reportRes.value.report_text : null;
              const imageUrl = imageRes.status === 'fulfilled' ? imageRes.value.url : null;
              setDailyReport(reportText);
              setDailyReportImageUrl(imageUrl);
              setTodayReport(reportText, imageUrl);
            }
          } catch (err) {
            if (!cancelled) {
              setDailyReport(null);
              setDailyReportImageUrl(null);
              setTodayReport(null, null);
            }
          }
        }
      }
      run();
      return () => {
        cancelled = true;
      };
    }, [initializeRegistrationState, syncDeviceRegisteredFromServer, syncChildProfileFromServer, refreshTokens, setTodayReport, accessToken, tokenIssuedAt, expiresIn])
  );

  const styles = createResponsiveStyles(
    {
      container: [flex1, { backgroundColor: theme.background }],
      scrollContent: [
        px(scale(SIZES.spacing.lg)),
        { paddingTop: verticalScale(SIZES.spacing.lg), paddingBottom: scale(100) },
      ],
    },
    { scale, verticalScale, fontScale }
  );

  const handleDeviceRegistration = () => {
    if (onDeviceRegister) {
      onDeviceRegister();
    } else {
      navigation.navigate(ROUTES.DEVICE_REGISTRATION);
    }
  };

  const handleChildProfileSetup = () => {
    if (!deviceRegistered) return;
    if (onProfileRegister) {
      onProfileRegister();
    } else {
      navigation.navigate(ROUTES.CHILD_PROFILE);
    }
  };

  const handleCreateDailyReport = async () => {
    if (!isFullyRegistered) return;
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    setIsLoadingReport(true);
    try {
      const date = formatDateKey(new Date());
      const res = await reportsApi.createReport(token, date);
      setDailyReport(res.report_text);
      try {
        const imageRes = await reportsApi.getLatestImage(token, date);
        setDailyReportImageUrl(imageRes.url);
        setTodayReport(res.report_text, imageRes.url);
      } catch {
        setDailyReportImageUrl(null);
        setTodayReport(res.report_text, null);
      }
    } catch (error) {
      const apiErr = error as import('@/services/api/client').ApiError;
      console.error('리포트 생성 실패:', apiErr?.data ?? apiErr);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const timelineEventsToShow = timelineEvents;

  return (
    <View style={[styles.container, { paddingTop: topInset, paddingLeft: insets.left, paddingRight: insets.right}]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <HomeHeader
          nickname={storedNickname || nickname}
          hasDevice={deviceRegistered}
          hasChildProfile={childProfileRegistered}
        />

        {!isFullyRegistered && <ServiceGuideCard />}

        {!isFullyRegistered && (
          <RegistrationProgress
            deviceRegistered={deviceRegistered}
            profileRegistered={childProfileRegistered}
          />
        )}

        <RegistrationButtons
          deviceRegistered={deviceRegistered}
          profileRegistered={childProfileRegistered}
          onDevicePress={handleDeviceRegistration}
          onProfilePress={handleChildProfileSetup}
        />

        {deviceRegistered && deviceInfo && <DeviceStatusCard status={deviceInfo} />}
        {childProfileRegistered && childProfile && <ChildProfileCard profile={childProfile} />}

        <DailyReportSection
          isFullyRegistered={isFullyRegistered}
          isLoading={isLoadingReport}
          report={reportToShow}
          reportImageUrl={dailyReportImageUrl}
          onGenerate={handleCreateDailyReport}
        />
        

        <TimelineSection
          isFullyRegistered={isFullyRegistered}
          events={timelineEventsToShow}
          maxScrollHeight={TIMELINE_MAX_SCROLL_HEIGHT}
        />
      </ScrollView>
    </View>
  );
}
