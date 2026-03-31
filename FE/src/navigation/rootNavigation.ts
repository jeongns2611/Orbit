import { ROUTES } from '@/constants';
import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/** 로그인 화면으로 스택 리셋 (로그아웃/회원탈퇴 후 호출) */
export function resetToLogin() {
  navigationRef.current?.dispatch(
    CommonActions.reset({ index: 0, routes: [{ name: ROUTES.LOGIN }] })
  );
}
