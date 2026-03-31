import { Text } from '@/components/common';
import { SIZES } from '@/constants';
import { useTheme } from '@/context/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import {
  createResponsiveStyles,
  flex1,
  flexRow,
  fontSize,
  mb,
} from '@/utils/styles';
import React from 'react';
import { Image, View } from 'react-native';
import { SectionTitle } from './SectionTitle';

interface ChildProfile {
  childId: string;
  name: string;
  ageInMonths: number;
  gender?: 'M' | 'F';
  profileImage?: string;
  notes?: string[];
}

interface ChildProfileCardProps {
  profile: ChildProfile;
}

export function ChildProfileCard({ profile }: ChildProfileCardProps) {
  const { scale, verticalScale, fontScale } = useResponsive();
  const { theme } = useTheme();

  const styles = createResponsiveStyles(
    {
      container: [mb(verticalScale(SIZES.spacing.lg))],
      card: [
        {
          backgroundColor: theme.backgroundProfileCard,
          borderWidth: 1,
          borderColor: theme.cardBorder,
          borderRadius: scale(32),
          padding: scale(20),
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 2,
        },
      ],
      cardContent: [flexRow, { gap: scale(32) }, { alignItems: 'center' as const }],
      profileImage: [
        {
          width: scale(88), 
          height: scale(88), 
          borderRadius: scale(44),
          backgroundColor: theme.backgroundCard,
          borderWidth: 2,
          borderColor: theme.primary,
          overflow: 'hidden' as const,
        },
      ],
      profileInfo: [flex1],
      childName: [
        fontSize(fontScale(20)),
        { color: theme.text },
        mb(scale(8)),
      ],
      notesContainer: [
        flexRow,
        {
          flexWrap: 'wrap' as const,
          gap: scale(8),
        },
      ],
      noteChip: [
        {
          backgroundColor: theme.tagBg,
          borderWidth: 1,
          borderColor: theme.tagBorder,
          borderRadius: 999,
          paddingHorizontal: scale(10),
          paddingVertical: scale(4),
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 1,
          elevation: 1,
        },
      ],
      noteText: [
        fontSize(fontScale(10)),
        { color: theme.tagText },
      ],
    },
    { scale, verticalScale, fontScale }
  );

  return (
    <View style={styles.container}>
      <SectionTitle title="우리 아이 프로필" />
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Image
            source={require('@/assets/kids_profile.png')}
            style={styles.profileImage}
            resizeMode="cover"
          />
          <View style={styles.profileInfo}>
            <Text style={styles.childName} fontWeight="bold">
              {profile.name}{' '}({profile.ageInMonths}개월){' '}
              {profile.gender === 'M' ? '♂' : profile.gender === 'F' ? '♀' : ''}
            </Text>
            {profile.notes && profile.notes.length > 0 && (
              <View style={styles.notesContainer}>
                {profile.notes.map((note, index) => (
                  <View key={index} style={styles.noteChip}>
                    <Text style={styles.noteText} fontWeight="bold">{note}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}