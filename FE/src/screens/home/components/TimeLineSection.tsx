import { Text } from '@/components/common';
import { FONTS, SIZES } from '@/constants';
import { useTheme } from '@/context/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import {
  alignCenter,
  cardShadow,
  center,
  createResponsiveStyles,
  flexRow,
  fontSize,
  justifyBetween,
  mb,
  py,
} from '@/utils/styles';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SectionTitle } from './SectionTitle';

/** 홈 타임라인 섹션 내부 스크롤 최대 높이(px). 이 높이 초과 시 섹션 안에서만 스크롤 */
export const TIMELINE_MAX_SCROLL_HEIGHT = 520;

export interface TimelineEvent {
  hour: string;
  text: string;
}

interface TimelineSectionProps {
  isFullyRegistered: boolean;
  /** 리포트 탭 등에서 해당 날짜 타임라인 이벤트 전달 시 표시 */
  events?: TimelineEvent[];
  /** 기준 시간 캡션 표시 여부. 홈: true(오늘 기준 몇 개 생겼는지), 리포트 탭: false(이미 지난 일) */
  showTimeCaption?: boolean;
  /** 지정 시 이벤트 목록을 이 높이로 제한하고 내부 스크롤 사용(홈에서 50개 쌓일 때) */
  maxScrollHeight?: number;
}

export function TimelineSection({
  isFullyRegistered,
  events,
  showTimeCaption = true,
  maxScrollHeight,
}: TimelineSectionProps) {
  const { scale, verticalScale, fontScale } = useResponsive();
  const { theme } = useTheme();
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    if (!showTimeCaption) return;
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const period = hours < 12 ? 'AM' : 'PM';
      const displayHours = hours % 12 || 12;
      setCurrentTime(`(${period} ${displayHours}시 ${minutes}분 기준)`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [showTimeCaption]);

  const styles = createResponsiveStyles(
    {
      container: [],
      header: [
        flexRow,
        justifyBetween,
        { alignItems: 'flex-end' as const },
        mb(scale(SIZES.spacing.md)),
      ],
      headerNoCaption: [mb(scale(SIZES.spacing.md))],
      timeText: [
        fontSize(fontScale(10)),
        { color: theme.textMuted, fontWeight: '700' as const },
      ],
      emptyTimeline: [
        center,
        {
          backgroundColor: theme.backgroundCard,
          borderWidth: 2,
          borderStyle: 'dashed' as const,
          borderColor: '#e2e8f0',
          borderRadius: scale(32),
          paddingVertical: verticalScale(56),
          paddingHorizontal: scale(24),
        },
      ],
      emptyText: [
        fontSize(fontScale(SIZES.fontSize.small)),
        { color: theme.textMuted, textAlign: 'center' as const },
      ],
      lockedOverlay: [
        center,
        py(scale(SIZES.spacing.xl)),
        {
          backgroundColor: theme.textSecondary + '15',
          borderRadius: scale(SIZES.borderRadius.lg),
        },
      ],
      timelineCard: [
        {
          backgroundColor: theme.backgroundCard,
          borderRadius: scale(20),
          padding: scale(SIZES.spacing.md),
          marginBottom: scale(SIZES.spacing.md),
          borderWidth: 2,
          borderColor: theme.cardBorder,
        },
        cardShadow,
      ],
      timelineCardContent: [
        flexRow,
        alignCenter,
        {
          gap: scale(12),
        },
      ],
      timelineTextContainer: [
        {
          flex: 1,
        },
      ],
      timelineEventTime: [
        fontSize(fontScale(SIZES.fontSize.normal)),
        {
          color: theme.textSecondary,
          marginBottom: scale(4),
          fontFamily: FONTS.reportHandwriting,
          fontWeight: '600' as const,
        },
      ],
      timelineEventText: [
        fontSize(fontScale(SIZES.fontSize.large)),
        {
          color: theme.text,
          lineHeight: fontScale(SIZES.fontSize.large) * 1.4,
          fontFamily: FONTS.reportHandwriting,
          fontWeight: '600' as const,
        },
      ],
    },
    { scale, verticalScale, fontScale }
  );

  const hasEvents = events != null && events.length > 0;

  return (
    <View style={styles.container}>
      <View style={showTimeCaption ? styles.header : styles.headerNoCaption}>
        <SectionTitle title="타임라인" noMargin />
        {showTimeCaption && <Text style={styles.timeText}>{currentTime}</Text>}
      </View>
      {!isFullyRegistered ? (
        <View style={styles.lockedOverlay}>
          <Ionicons name="lock-closed" size={scale(24)} color={theme.textSecondary} />
        </View>
      ) : hasEvents ? (
        maxScrollHeight != null && maxScrollHeight > 0 ? (
          <ScrollView
            style={{ maxHeight: maxScrollHeight }}
            contentContainerStyle={{ paddingBottom: scale(SIZES.spacing.md) }}
            showsVerticalScrollIndicator
            nestedScrollEnabled
          >
            {events.map((evt, index) => (
              <View key={`${evt.hour}-${index}`} style={styles.timelineCard}>
                <View style={styles.timelineCardContent}>
                  <View style={styles.timelineTextContainer}>
                    <Text style={styles.timelineEventTime}>{evt.hour}</Text>
                    <Text style={styles.timelineEventText}>{evt.text}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          events.map((evt, index) => (
            <View key={`${evt.hour}-${index}`} style={styles.timelineCard}>
              <View style={styles.timelineCardContent}>
                <View style={styles.timelineTextContainer}>
                  <Text style={styles.timelineEventTime}>{evt.hour}</Text>
                  <Text style={styles.timelineEventText}>{evt.text}</Text>
                </View>
              </View>
            </View>
          ))
        )
      ) : (
        <View style={styles.emptyTimeline}>
          <Ionicons name="calendar-outline" size={scale(60)} color={theme.textMuted} style={{ opacity: 0.2, marginBottom: scale(12) }} />
          <Text style={styles.emptyText}>아직 생성된 타임라인이 없습니다.</Text>
        </View>
      )}
    </View>
  );
}