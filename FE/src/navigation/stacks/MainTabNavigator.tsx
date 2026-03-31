import { ROUTES } from '@/constants';
import { useTheme } from '@/context/ThemeContext';
import { HomeScreen, ReportScreen, SettingsScreen } from '@/screens';
import { useRegistrationStore } from '@/store/registrationStore';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainTabParamList } from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { deviceRegistered, childProfileRegistered } = useRegistrationStore();
  const isFullyRegistered = deviceRegistered && childProfileRegistered;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: theme.tabBarBackground,
          borderTopColor: theme.tabBarBorder,
          borderTopWidth: 1,
          paddingHorizontal: 32,
          paddingTop: Platform.OS === 'android' ? 6 : 4,
          paddingBottom: insets.bottom + 16,
          height: (Platform.OS === 'android' ? 70 : 80) + insets.bottom,
        },
        tabBarItemStyle: {
          paddingTop: 2,
          paddingBottom: 20,
        },
      }}
    >
      <Tab.Screen
        name={ROUTES.HOME}
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={ROUTES.REPORT}
        component={ReportScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            if (!isFullyRegistered) {
              e.preventDefault();
              navigation.navigate(ROUTES.DEVICE_REGISTRATION);
            }
          },
        }}
      />
      <Tab.Screen
        name={ROUTES.SETTINGS}
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}