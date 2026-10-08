# Phase 2 검증 기록

검사일: 2026-09-18 · 브랜치: feat/nextjs-foundation · 기준 커밋: f8b3624 + 미커밋 변경.
범위: P2-S1~S3. 데이터 모드: 순수 함수 고정 입력, 로컬 개발/production HTTP 검사. live API·DB 사용 없음.

## 환경과 버전

Node 22.20.0, npm 10.9.3, Next.js 16.3.5, React/React DOM 19.3.0, TypeScript 5.9.3, Vitest 5.0.1, ESLint 9.39.5, eslint-config-next 16.3.5.
.nvmrc/.node-version, package.json의 정확한 직접 의존성, package-lock.json으로 고정했다. Recharts/Supabase 설치는 해당 구현 단계에서 수행한다.

[Next.js 설치 요구](https://nextjs.org/docs/app/getting-started/installation), [Vitest 요구](https://vitest.dev/guide/), [Node 지원 상태](https://nodejs.org/en/about/previous-releases)와 npm view의 engines/peerDependencies를 확인했다. Next는 Node >=20.9, Vitest 5는 Node ^22.12 이상 계열을 요구하며 사용 중인 22.20.0은 해당 조건을 만족한다. TypeScript는 안정 5.x를 유지한다.

## 실제 실행 결과

| 명령/검사 | 실제 결과 |
| --- | --- |
| npm install | 설치 완료, audit 취약점 0 |
| npm ci | lockfile 재설치 성공, 384개 설치, audit 취약점 0 |
| npm run lint | 종료 0 |
| npm run typecheck | route types 생성 및 TypeScript 종료 0 |
| npm test | 1 파일, 36 테스트 통과, 종료 0 |
| npm run build | 종료 0; /, /insights 정적 페이지 생성 |
| npm run start -- --hostname 127.0.0.1 --port 3000 | Ready; 두 경로 HTTP 200, 한국어·main HTML 확인 |
| npm run dev -- --hostname 127.0.0.1 --port 3001 | Ready; 두 경로 HTTP 200, 한국어·main HTML 확인 |

Vitest 최종 출력: Test Files 1 passed (1), Tests 36 passed (36).
검사 위치: tests/validation.test.ts. 기대값은 docs/VERIFICATION.md의 달력·기간 사례를 고정 상수로 작성했다.
실행 환경의 shell 기본 sandbox 오류 때문에 승인된 로컬 명령으로 검사했다.

## 실패·수정과 알려진 한계

- ESLint 9 설치 시 지원 종료 경고가 발생했다. 10.10.0을 검토/설치했으나 Next의 react/import/jsx-a11y 플러그인 peer 범위가 9까지만 지원하여 npm ls가 ELSPROBLEMS로 실패했다. 호환성을 우선해 9.39.5로 복구했고 lint와 npm ci는 통과했다. 경고는 남아 있으며 향후 플러그인 지원 업데이트 시 함께 갱신한다.
- Vitest .ts 설정의 CommonJS/ESM 경고를 .mts 확장자로 해결했고 재실행 36개가 통과했다.
- npm ci 뒤 npm ls --depth=0은 종료 0이지만 sharp의 선택적 WASM 관련 @emnapi/runtime, @img/sharp-wasm32를 extraneous로 표시했다. 별도 직접 의존성으로 추가하지 않았다.
- next dev가 AGENTS.md 끝에 Next.js 공식 안내 블록을 추가했다. 기존 프로젝트 규칙은 보존했다.
- 브라우저 시각·모바일·키보드·Playwright 검증은 Phase 3에서 수행한다. 이번 화면 증거는 HTTP HTML 응답 검사다.

## AC 연결과 미실행

AC04 중 실제 날짜·윤일·KST 자정·오늘/미래 거부·미완료 주/주말·주간 정규화는 단위 검증 통과. HTTP 400, 파라미터 중복/누락, UI 오류 표시는 Route Handler 구현 후 검증한다.
AC12 중 로컬 설치·검사·build/start 확인만 통과. 별도 PC/checkout 재현, 실 API/DB, 배포는 미실행이다.
AC 전체 통과로 처리하지 않는다. Skill은 이번 세션의 사용 가능 목록에서 발견해 읽고 날짜 검증에 적용했다.

## Next.js 설명과 다음 범위

app/page.tsx는 /, app/insights/page.tsx는 /insights다. app/layout.tsx는 공통 헤더·탐색·본문·푸터를 제공한다. 모두 기본 Server Component이며 브라우저 입력 상태는 아직 없다.
Phase 3에서 Client Component와 Route Handler를 추가하고 명시적 demo 데이터를 연결한다.
