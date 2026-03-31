# 📘 FE (React Native) 코드 컨벤션

본 문서는 **React Native + TypeScript 기반** 모바일 앱 개발을 위한  
코드 스타일, 구조, 협업 규칙을 정의합니다.

---

## 1. 네이밍 규칙

### 기본 규칙

| 대상 | 규칙 | 예시 |
|---|---|---|
| 컴포넌트 / 스크린 | PascalCase | `HomeScreen.tsx`, `StatusCard.tsx` |
| 훅 | `use` + camelCase | `useDeviceStatus.ts` |
| 함수 | verb + noun | `fetchDeviceStatus`, `formatSlope` |
| Boolean | `is / has / can` | `isConnected`, `hasWarning` |
| 상수 | UPPER_SNAKE_CASE | `MAX_SLOPE`, `API_BASE_URL` |
| enum | PascalCase | `DeviceStatus`, `EmotionType` |
| Interface / Type | PascalCase | `ButtonProps`, `UserData` |

```tsx
// Good
const isConnected = true;
const MAX_RETRY = 3;

export function StatusCard() {}

// Bad
const connected = true;
const maxRetry = 3;
```

---

## 2. 폴더 및 파일 구조

```
src/
├── screens/
├── components/
├── services/
├── hooks/
├── store/
├── navigation/
├── constants/
├── types/
├── utils/
├── assets/
└── config/
```

---

## 3. import 순서 규칙

```tsx
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusCard } from '@/components/dashboard';
import { useDeviceStatus } from '@/hooks';
import { deviceApi } from '@/services/api';
import type { DeviceStatus } from '@/types';
```

---

## 4. 컴포넌트 작성 규칙

```tsx
interface StatusCardProps {
  title: string;
  value: string;
}

export function StatusCard({ title, value }: StatusCardProps) {
  if (!title) return null;

  return (
    <View>
      <Text>{title}</Text>
      <Text>{value}</Text>
    </View>
  );
}
```

---

## 5. 스타일링 규칙

- 인라인 스타일 최소화
- 색상/사이즈 상수화

---

## 6. 상태 관리 (Zustand)

```tsx
interface DeviceStore {
  isConnected: boolean;
  setConnected: (value: boolean) => void;
}
```

---

## 7. 환경 변수

```tsx
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
};
```

---

## 8. ESLint & Prettier

- ESLint + Prettier 기반 자동 포맷
- 저장 시 자동 수정

---
