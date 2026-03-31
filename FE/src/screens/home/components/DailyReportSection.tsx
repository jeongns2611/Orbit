import { Text } from '@/components/common';
import { FONTS, SIZES } from '@/constants';
import { useTheme } from '@/context/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import { isReportErrorMessage, parseReportSections } from '@/utils/reportParser';
import {
  cardShadow,
  center,
  createResponsiveStyles,
  fontSize,
  mb,
  py,
} from '@/utils/styles';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SectionTitle } from './SectionTitle';

interface DailyReportSectionProps {
  isFullyRegistered: boolean;
  isLoading: boolean;
  report: string | null;
  reportImageUrl?: string | null;
  onGenerate: () => void;
}

export function DailyReportSection({
  isFullyRegistered,
  isLoading,
  report,
  reportImageUrl = null,
  onGenerate,
}: DailyReportSectionProps) {
  const { scale, verticalScale, fontScale } = useResponsive();
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  const reportSections = useMemo(() => parseReportSections(report ?? ''), [report]);
  const isReportSuccess = Boolean(report?.trim() && !isReportErrorMessage(report));

  const goPrevSlide = () => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  };
  const goNextSlide = () => {
    setCurrentIndex((i) => Math.min(reportSections.length - 1, i + 1));
  };

  const styles = useMemo(
    () =>
      createResponsiveStyles(
        {
          container: [
            mb(verticalScale(SIZES.spacing.xl)),
            { marginTop: verticalScale(SIZES.spacing.md) },
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
          reportArea: [mb(scale(SIZES.spacing.md))],
          sliderWrapper: {
            position: 'relative' as const,
            marginBottom: scale(SIZES.spacing.md),
          },
          slideArrow: {
            position: 'absolute' as const,
            top: 0,
            bottom: 0,
            justifyContent: 'center' as const,
            paddingHorizontal: scale(SIZES.spacing.sm),
            zIndex: 10,
            opacity: 0.75,
          },
          slideArrowLeft: { left: 0 },
          slideArrowRight: { right: 0 },
          slideArrowDisabled: { opacity: 0.3 },
          slideContainer: {
            width: '100%' as const,
          },
          card: [
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
          linesBackground: {
            position: 'absolute' as const,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.08,
          },
          line: {
            height: verticalScale(26),
            borderBottomWidth: 1,
            borderBottomColor: theme.textMuted,
          },
          decorationIcon: {
            position: 'absolute' as const,
            top: scale(16),
            right: scale(16),
            opacity: 0.12,
            zIndex: 5,
          },
          headerWrap: {
            alignItems: 'center' as const,
            marginBottom: scale(SIZES.spacing.sm),
            zIndex: 10,
          },
          header: {
            alignItems: 'center' as const,
            marginBottom: scale(SIZES.spacing.sm),
            zIndex: 10,
          },
          headerTitle: [
            fontSize(fontScale(SIZES.fontSize.xlarge)),
            {
              fontFamily: FONTS.reportHandwriting,
              color: theme.accentBlue,
              fontWeight: 'bold' as const,
              textAlign: 'center' as const,
            },
          ],
          underline: {
            width: scale(60),
            height: 3,
            backgroundColor: theme.sectionTitleBar,
            borderRadius: 2,
            marginTop: scale(6),
          },
          contentScroll: {
            zIndex: 10,
            flex: 1,
          },
          contentInner: {
            paddingTop: scale(SIZES.spacing.md),
            paddingBottom: scale(SIZES.spacing.sm),
          },
          lineContainer: {
            flexDirection: 'row' as const,
            alignItems: 'flex-start' as const,
            marginBottom: scale(6),
          },
          contentText: [
            fontSize(fontScale(SIZES.fontSize.xlarge)),
            {
              fontFamily: FONTS.reportHandwriting,
              color: theme.text,
              lineHeight: fontScale(SIZES.fontSize.large) * 1.4,
              flex: 1,
            },
          ],
          bullet: [
            fontSize(fontScale(SIZES.fontSize.xlarge)),
            {
              fontFamily: FONTS.reportHandwriting,
              color: theme.primary,
              marginRight: scale(6),
              lineHeight: fontScale(SIZES.fontSize.large) * 1.4,
            },
          ],
          pagination: {
            flexDirection: 'row' as const,
            justifyContent: 'center' as const,
            alignItems: 'center' as const,
            gap: scale(8),
            marginTop: 'auto' as const,
            zIndex: 10,
          },
          dot: {
            width: scale(10),
            height: scale(10),
            borderRadius: scale(5),
            backgroundColor: theme.sectionTitleBar,
          },
          dotActive: {
            backgroundColor: theme.primary,
            width: scale(28),
          },
          generateButton: [
            {
              borderRadius: scale(40),
              borderWidth: 4,
              borderColor: theme.reportCtaBorder,
              height: verticalScale(176),
              paddingVertical: verticalScale(SIZES.spacing.lg),
              paddingHorizontal: scale(SIZES.spacing.xl),
              alignItems: 'center' as const,
              justifyContent: 'center' as const,
              overflow: 'hidden' as const,
              shadowColor: theme.text,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 8,
            },
          ],
          generateButtonInner: [
            center,
            {
              width: scale(64),
              height: scale(64),
              borderRadius: scale(32),
              backgroundColor: theme.primary + '33',
              marginBottom: scale(16),
            },
          ],
          generateButtonText: [
            fontSize(fontScale(20)),
            { color: '#FFFFFF', fontWeight: 'bold' as const },
          ],
          lockedOverlay: [
            center,
            py(scale(SIZES.spacing.xl)),
            {
              backgroundColor: theme.textSecondary + '15',
              borderRadius: scale(SIZES.borderRadius.lg),
              marginTop: scale(SIZES.spacing.md),
            },
          ],
          lockedText: [
            fontSize(fontScale(SIZES.fontSize.medium)),
            { color: theme.textSecondary, textAlign: 'center' as const },
            { marginTop: scale(SIZES.spacing.sm) },
          ],
          loadingContainer: [center, py(scale(SIZES.spacing.xl))],
          recreateText: [
            fontSize(fontScale(SIZES.fontSize.small)),
            { color: theme.textMuted, textAlign: 'right' as const },
          ],
          recreateRow: [
            { flexDirection: 'row' as const, alignItems: 'center' as const, gap: scale(6) },
          ],
          reportFailureContainer: [
            {
              backgroundColor: theme.backgroundCard,
              borderRadius: scale(SIZES.borderRadius.lg),
              borderWidth: 1,
              borderColor: theme.cardBorder,
              minHeight: scale(200),
              padding: scale(SIZES.spacing.lg),
              paddingLeft: scale(44),
              paddingRight: scale(44),
            },
          ],
          reportFailureLines: {
            position: 'absolute' as const,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.08,
          },
          reportFailureLine: {
            height: verticalScale(26),
            borderBottomWidth: 1,
            borderBottomColor: theme.textMuted,
          },
          reportFailureText: [
            fontSize(fontScale(SIZES.fontSize.medium)),
            {
              fontFamily: FONTS.reportHandwriting,
              color: theme.textSecondary,
              textAlign: 'center' as const,
              zIndex: 10,
            },
          ],
        },
        { scale, verticalScale, fontScale }
      ),
    [scale, verticalScale, fontScale, theme]
  );

  return (
    <View style={styles.container}>
      <SectionTitle title="오늘의 탐사 일지" />

      {isFullyRegistered && isReportSuccess && (
        <View style={styles.imageBlock}>
          {reportImageUrl ? (
              <Image
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

      {!isFullyRegistered ? (
        <View style={styles.lockedOverlay}>
          <Ionicons name="lock-closed" size={scale(24)} color={theme.textSecondary} />
        </View>
      ) : !report ? (
        <View style={styles.reportArea}>
          <TouchableOpacity
            onPress={onGenerate}
            activeOpacity={0.98}
            style={{ borderRadius: scale(40), overflow: 'hidden' as const }}
          >
            <LinearGradient
              colors={[theme.reportCtaGradientStart, theme.reportCtaGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.generateButton}
            >
              <View style={styles.generateButtonInner}>
                <Ionicons name="rocket" size={scale(36)} color={theme.primary} />
              </View>
              <Text style={styles.generateButtonText}>탐사 리포트 생성</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : isReportErrorMessage(report) ? (
        <View style={styles.reportArea}>
          <View style={[styles.reportFailureContainer, { position: 'relative' as const, overflow: 'hidden' as const }]}>
            <View style={styles.reportFailureLines}>
              {[...Array(12)].map((_, i) => (
                <View key={i} style={styles.reportFailureLine} />
              ))}
            </View>
            <Text style={[styles.reportFailureText, { paddingTop: scale(SIZES.spacing.xl) + scale(28), paddingBottom: scale(SIZES.spacing.xl) }]}>
              {report}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onGenerate}
            activeOpacity={0.7}
            style={{ alignSelf: 'flex-end', marginTop: scale(SIZES.spacing.sm) }}
          >
            <View style={styles.recreateRow}>
              <Ionicons name="refresh" size={scale(14)} color={theme.textMuted} />
              <Text style={styles.recreateText}>리포트 재생성</Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : isLoading ? (
        <View style={[styles.reportArea, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.contentText, { marginTop: scale(SIZES.spacing.sm), color: theme.text }]}>
            리포트를 생성하고 있습니다...
          </Text>
        </View>
      ) : reportSections.length > 0 ? (
        <View style={styles.reportArea}>
          <View style={styles.sliderWrapper}>
            <View style={styles.slideContainer}>
              {(() => {
                const section = reportSections[currentIndex];
                if (!section) return null;
                return (
                  <View style={styles.card}>
                    <View style={styles.linesBackground}>
                      {[...Array(12)].map((_, i) => (
                        <View key={i} style={styles.line} />
                      ))}
                    </View>
                    <View style={styles.decorationIcon}>
                      <Ionicons name="planet-outline" size={scale(28)} color={theme.accentBlue} />
                    </View>
                      <View style={styles.headerWrap}>
                        <View style={styles.header}>
                          <Text style={styles.headerTitle}>{section.title}</Text>
                        </View>
                        <View style={styles.underline} />
                      </View>
                    <View style={styles.contentScroll}>
                      <View style={styles.contentInner}>
                        {section.content
                          .trim()
                          .split(/\n/)
                          .filter(Boolean)
                          .map((line, i) => {
                            const isBullet = line.trim().startsWith('- ');
                            const text = isBullet ? line.trim().slice(2) : line.trim();
                            return (
                              <View key={i} style={styles.lineContainer}>
                                {isBullet && (
                                  <Text style={styles.bullet}>•</Text>
                                )}
                                <Text style={styles.contentText}>{text}</Text>
                              </View>
                            );
                          })}
                      </View>
                    </View>
                    <View style={styles.pagination}>
                      {reportSections.map((_, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => setCurrentIndex(idx)}
                          style={[styles.dot, idx === currentIndex && styles.dotActive]}
                        />
                      ))}
                    </View>
                  </View>
                );
              })()}
            </View>

            <TouchableOpacity
              style={[
                styles.slideArrow,
                styles.slideArrowLeft,
                currentIndex === 0 && styles.slideArrowDisabled,
              ]}
              onPress={goPrevSlide}
              disabled={currentIndex === 0}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-back"
                size={scale(22)}
                color={currentIndex === 0 ? theme.textSecondary + '99' : theme.primary + '99'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.slideArrow,
                styles.slideArrowRight,
                currentIndex >= reportSections.length - 1 && styles.slideArrowDisabled,
              ]}
              onPress={goNextSlide}
              disabled={currentIndex >= reportSections.length - 1}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-forward"
                size={scale(22)}
                color={
                  currentIndex >= reportSections.length - 1
                    ? theme.textSecondary + '99'
                    : theme.primary + '99'
                }
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={onGenerate}
            activeOpacity={0.7}
            style={{ alignSelf: 'flex-end', marginTop: scale(SIZES.spacing.sm) }}
          >
                        <View style={styles.recreateRow}>
              <Ionicons name="refresh" size={scale(14)} color={theme.textMuted} />
              <Text style={styles.recreateText}>리포트 재생성</Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.reportArea}>
          <View style={styles.slideContainer}>
            <View style={styles.card}>
              <View style={styles.linesBackground}>
                {[...Array(12)].map((_, i) => (
                  <View key={i} style={styles.line} />
                ))}
              </View>
              <View style={styles.decorationIcon}>
                <Ionicons name="planet-outline" size={scale(28)} color={theme.primary} />
              </View>
              <View style={styles.contentScroll}>
                <View style={styles.contentInner}>
                <Text style={styles.contentText}>{report}</Text>
                </View>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={onGenerate}
            activeOpacity={0.7}
            style={{ alignSelf: 'flex-end', marginTop: scale(SIZES.spacing.sm) }}
          >
                        <View style={styles.recreateRow}>
              <Ionicons name="refresh" size={scale(14)} color={theme.textMuted} />
              <Text style={styles.recreateText}>리포트 재생성</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
