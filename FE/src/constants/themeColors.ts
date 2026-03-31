export type ThemePalette = {
    background: string;
    backgroundCard: string;
    backgroundProfileCard: string;
    backgroundEmpty: string;
    text: string;               
    textSecondary: string;       
    textMuted: string;
    primary: string;
    accentBlue: string;
    calendarSaturdayText: string;
    cardBorder: string;
    sectionTitleBar: string;    
    buttonTextOnPrimary?: string;
    reportCtaGradientStart: string;
    reportCtaGradientEnd: string;
    reportCtaBorder: string;
    tabBarBackground: string;
    tabBarBorder: string;
    tabBarActive: string;
    tabBarInactive: string;
    iconDefault: string;          
    tagBg: string;             
    tagBorder: string;
    tagText: string;
};

export const lightTheme: ThemePalette = {
    background: '#FFFFFF',
    backgroundCard: '#FFFFFF',
    backgroundProfileCard: '#F1F5F9',
    backgroundEmpty: '#FFFFFF',
    text: '#0B1120',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    primary: '#FFD646',
    accentBlue: '#1D4ED8',
    calendarSaturdayText: '#1D4ED8',
    cardBorder: 'rgba(11, 17, 32, 0.1)',
    sectionTitleBar: '#FFD646',
    reportCtaGradientStart: '#243447',
    reportCtaGradientEnd: '#3e5066',
    reportCtaBorder: '#FFFFFF',
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#FFFFFF',
    tabBarActive: '#0B1120',
    tabBarInactive: '#94a3b8',                   
    iconDefault: '#cbd5e1',                    
    tagBg: '#FFFFFF',
    tagBorder: 'rgba(11, 17, 32, 0.2)',
    tagText: '#0B1120',
    buttonTextOnPrimary: '#0B1120'
};

export const darkTheme: ThemePalette = {
    background: '#0B1120',
    backgroundCard: '#293548',
    backgroundProfileCard: '#293548',
    backgroundEmpty: 'rgba(15, 23, 42, 0.5)',  
    text: '#f1f5f9',
    textSecondary: '#cbd5e1',
    textMuted: '#cbd5e1',
    primary: '#FFD646',
    accentBlue: '#FFD646',
    calendarSaturdayText: '#94a3b8',
    cardBorder: 'rgba(255, 214, 70, 0.2)', 
    sectionTitleBar: '#FFD646',
    reportCtaGradientStart: '#243447',
    reportCtaGradientEnd: '#3e5066',
    reportCtaBorder: 'rgba(255,255,255,0.1)',
    tabBarBackground: '#1E293B',
    tabBarBorder: '#1E293B',
    tabBarActive: '#FFD646',
    tabBarInactive: '#94a3b8',
    iconDefault: '#475569',
    tagBg: 'rgba(255, 214, 70, 0.1)',
    tagBorder: 'rgba(255, 214, 70, 0.3)',
    tagText: '#FFD646',
    buttonTextOnPrimary: '#0B1120'
  };

export function getTheme(isDark: boolean): ThemePalette {
  return isDark ? darkTheme : lightTheme;
}