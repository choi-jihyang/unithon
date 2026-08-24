# 코드 컨벤션

> 단일 출처. ESLint·CI가 이 문서의 수치와 일치한다.  
> 규칙 = **반드시 지킨다**. 권장 = 지키되 합리적 예외 허용
> 
> **이 문서는 구조·계층·스타일**을 다룬다. 
---

## 목차
1. [폴더 경계](#1-폴더-경계)
2. [화면(Page) / 컴포넌트 / 피처 분리](#2-화면page--컴포넌트--피처-분리)
3. [컴포넌트 SRP](#3-컴포넌트-srp)
4. [로직은 훅으로](#4-로직은-훅으로)
5. [DIP / 계층 의존성](#5-dip--계층-의존성)
6. [타입](#6-타입)
7. [네이밍](#7-네이밍)
8. [Import 순서](#8-import-순서)
9. [백엔드(Kotlin) 컨벤션](#9-백엔드kotlin-컨벤션)
10. [파일 길이 상한](#10-파일-길이-상한)

---

## 1. 폴더 경계

```
app/src/
├── features/              # 도메인별 기능 단위
│   └── <도메인>/          # ex) auth, apptech
│       ├── screens/       # 라우트 단위 화면 (Screen)
│       ├── components/    # 도메인 내 재사용 UI (Component)
│       ├── hooks/         # 비즈니스 로직 훅
│       ├── api/           # 이 도메인의 API 호출 함수 (services/api 경유)
│       └── types/         # 이 도메인의 타입 정의
├── services/              # 공통 인프라 계층
│   ├── api.ts             # axios 인스턴스 + 인터셉터
│   ├── auth.ts            # 인증 API 함수
│   └── tokenStorage.ts    # 토큰 시크릿 스토리지 인터페이스
└── theme.ts               # 디자인 토큰 (단일 출처)
```

### 규칙
- **규칙**: 도메인 고유 코드는 반드시 `features/<도메인>/` 내에 둔다.
- **규칙**: 여러 도메인에서 공유하는 인프라(HTTP 클라이언트, 스토리지, 테마)는 `services/` 또는 루트에 둔다.
- **규칙**: `features/` 간 직접 import 금지. 공유 코드는 `services/`로 올린다.
- **권장**: 도메인이 커지면 `features/<도메인>/api/` 내에 도메인별 API 모듈을 추가하되, 반드시 `services/api.ts`(axios 인스턴스)를 경유한다.

---

## 2. 화면(Page) / 컴포넌트 / 피처 분리

### 역할 정의

| 파일 유형 | 위치 | 역할 | 금지 |
|---|---|---|---|
| **Screen** | `features/<도메인>/screens/` | 라우트 단위 진입점. 훅 조합, 레이아웃 배치 | 직접 HTTP 호출, 비즈니스 로직 본체 |
| **Component** | `features/<도메인>/components/` | 재사용 가능한 표현 단위 | 직접 HTTP 호출, 비즈니스 로직 |
| **Hook** | `features/<도메인>/hooks/` | 상태 + 비즈니스 로직 | JSX 반환 |

### 예시 — 올바른 구조

```tsx
// features/auth/hooks/useLogin.ts  ✅ 비즈니스 로직은 훅에
import { useState } from 'react';
import { login } from '../../../services/auth';

export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (userId: string, password: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await login(userId, password);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '로그인 실패');
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, handleLogin };
}
```

```tsx
// features/auth/screens/LoginScreen.tsx  ✅ Screen은 훅 사용 + 렌더링
import React from 'react';
import { useLogin } from '../hooks/useLogin';
import { LoginForm } from '../components/LoginForm';

export function LoginScreen(): React.JSX.Element {
  const { loading, error, handleLogin } = useLogin();
  return <LoginForm onSubmit={handleLogin} loading={loading} error={error} />;
}
```

```tsx
// features/auth/screens/LoginScreen.tsx  ❌ 잘못된 예 — Screen에 직접 API 호출
import axios from 'axios';  // ❌ features에서 axios 직접 import 금지
export function LoginScreen() {
  const handleLogin = async () => {
    await axios.post('/v1/auth/login', { ... });  // ❌ services 경유 필수
  };
}
```

---

## 3. 컴포넌트 SRP

- **규칙**: 1 파일 = 1 컴포넌트 (default export 1개).
- **규칙**: Props 타입을 파일 내 명시적으로 선언한다.
- **규칙**: 파일 길이 상한 **200줄** (ESLint `max-lines: 200`와 동일). 초과 시 분리 검토.
- **권장**: 표현(Presentational) 컴포넌트는 props만으로 렌더링 — 훅/상태 없이도 동작하도록 설계.

```tsx
// ✅ Props 타입 명시
type LoginFormProps = {
  onSubmit: (userId: string, password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
};

export function LoginForm({ onSubmit, loading, error }: LoginFormProps): React.JSX.Element {
  // ...
}
```

---

## 4. 로직은 훅으로

- **규칙**: 컴포넌트 내부에 `useState` + 비즈니스 로직이 혼재하면 custom hook으로 추출.
- **규칙**: Hook 이름은 반드시 `use`로 시작 (ESLint `react-hooks/rules-of-hooks` 강제).
- **규칙**: `useEffect` 의존성 배열은 빠짐없이 선언 (ESLint `react-hooks/exhaustive-deps` 강제).
- **권장**: 하나의 훅은 한 가지 관심사만 다룬다. ex) `useLogin`, `useAttendance`.

```ts
// ✅ 훅 분리
export function useAttendance(userId: string) {
  const [record, setRecord] = useState<AttendanceRecord | null>(null);

  useEffect(() => {
    fetchAttendance(userId).then(setRecord);
  }, [userId]);  // ✅ 의존성 배열 명시

  return { record };
}
```

---

## 5. DIP / 계층 의존성

```
Screen / Component
    ↓ (훅만 사용)
Hook
    ↓ (services 함수만 호출)
services/ (api.ts, auth.ts, tokenStorage.ts)
    ↓
외부 (axios, 네이티브 API)
```

- **규칙**: `features/` 파일에서 `axios`를 직접 import 금지. 반드시 `services/api.ts`(apiClient) 또는 `services/auth.ts` 등 services 경유.
- **규칙**: `features/` 파일에서 `fetch()` 직접 호출 금지.
- **권장**: 새 API endpoint 추가 시 `features/<도메인>/api/` 에 함수를 만들고 `apiClient`를 import해 사용.

```ts
// features/apptech/api/attendanceApi.ts  ✅ services 경유
import apiClient from '../../../services/api';
import type { AttendanceRecord } from '../types';

export async function fetchAttendance(userId: string): Promise<AttendanceRecord> {
  const { data } = await apiClient.get<AttendanceRecord>(`/v1/apptech/attendance/${userId}`);
  return data;
}
```

---

## 6. 타입

- **규칙**: `any` 사용 금지 (ESLint `@typescript-eslint/no-explicit-any: error`).
- **규칙**: `unknown`은 허용. 단, 좁히기(type narrowing) 후 사용.
- **권장**: 함수 반환 타입을 명시적으로 작성.
- **권장**: API 응답 타입은 `types/` 내에 별도 정의.

```ts
// ✅ unknown + narrowing
catch (e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
}

// ❌ any 금지
catch (e: any) { ... }
```

---

## 7. 네이밍

| 대상 | 규칙 | 예시 |
|---|---|---|
| 컴포넌트 함수/파일 | PascalCase | `LoginScreen.tsx`, `LoginForm.tsx` |
| Hook | `use` prefix + camelCase | `useLogin.ts`, `useAttendance.ts` |
| 일반 함수/변수 | camelCase | `fetchAttendance`, `handleLogin` |
| 타입/인터페이스 | PascalCase | `AttendanceRecord`, `LoginFormProps` |
| 상수 | UPPER_SNAKE_CASE | `BASE_URL`, `TOKEN_KEY` |
| 파일(컴포넌트 아님) | camelCase | `api.ts`, `tokenStorage.ts` |

---

## 8. Import 순서

ESLint `import/order` 규칙으로 자동 강제. 수동으로는 아래 순서를 따른다:

1. React (react, react-native)
2. 외부 라이브러리 (node_modules)
3. `services/` (공통 인프라)
4. 같은 피처 내 상대 경로 (`../hooks/`, `../types/`)
5. 같은 디렉토리 상대 경로 (`./`)
6. 타입 import (`import type`)

```tsx
// ✅ import 순서 예시
import React, { useState } from 'react';
import { View, Text } from 'react-native';

import apiClient from '../../../services/api';

import { useLogin } from '../hooks/useLogin';
import type { LoginFormProps } from '../types';
```

---

## 9. 백엔드(Kotlin) 컨벤션

> 트랜잭션·레이스 컨디션(잔액/적립)·메모리·예외 심화는 [kotlin-backend.md](kotlin-backend.md).

### 역할 분리

| 애노테이션 | 역할 | 금지 |
|---|---|---|
| `@RestController` | HTTP 요청/응답 변환, 입력 검증만 | 비즈니스 로직 직접 구현 |
| `@Service` | 비즈니스 로직 본체 | 직접 DB 쿼리(JPA 제외), HTTP 호출 |
| `@Repository` | 데이터 접근 추상화 | 비즈니스 로직 |
| `@Component` | 라이브러리성 공통 유틸, 설정 빈 | 도메인 비즈니스 |

### 규칙

- **규칙**: Controller는 얇게(thin) — request DTO → Service 호출 → response DTO 반환만.
- **규칙**: Service 1개가 Repository를 5개 이상 의존하면 SRP 위반 신호. 서비스 분리 검토.
- **권장**: 도메인 로직(출석, 적립, 잔액, 교환)은 각각 별도 Service 클래스로 분리.
- **권장**: Controller와 Service 사이 DTO 변환은 Service 레이어 또는 별도 Mapper에서.

```kotlin
// ✅ 얇은 Controller
@RestController
@RequestMapping("/v1/apptech")
class AttendanceController(private val attendanceService: AttendanceService) {
    @PostMapping("/attendance")
    fun checkIn(@AuthenticationPrincipal userId: String): AttendanceResponse =
        attendanceService.checkIn(userId)
}

// ✅ 비즈니스 로직은 Service에
@Service
class AttendanceService(private val attendanceRepository: AttendanceRepository) {
    fun checkIn(userId: String): AttendanceResponse {
        // 출석 중복 체크, 포인트 적립 등 비즈니스 로직
    }
}
```

---

## 10. 파일 길이 상한

| 기준 | 상한 | ESLint 규칙 |
|---|---|---|
| **파일 전체 줄 수** | **200줄** | `max-lines: ["error", 200]` |
| **함수 복잡도** | **10** | `complexity: ["error", 10]` |

> `max-lines-per-function`은 RN 컴포넌트의 JSX 특성(스타일시트 포함 렌더가 길어짐)을 감안해 적용하지 않는다.  
> 대신 파일 전체 200줄 상한으로 분리를 유도한다.

**줄 수 초과 시 대응:**
- Screen: 컴포넌트 추출 → `components/` 이동
- 컴포넌트: 하위 컴포넌트 분리
- 훅: 관심사 분리 → 별도 훅 추출
