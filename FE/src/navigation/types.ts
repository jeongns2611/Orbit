export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  DeviceRegistration: undefined;
  ChildProfile: undefined;
  MainTabs: { screen: keyof MainTabParamList } | undefined;
  PasswordReconfirm: undefined;
  MyPage: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Report: undefined;
  Settings: undefined;
};

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
/* eslint-enable @typescript-eslint/no-namespace */
