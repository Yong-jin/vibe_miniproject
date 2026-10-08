# Phase 3 — 샘플 목록 구현 및 검증

검사일: 2026-09-18. 브랜치: feat/demo-box-office. 기준: 08e142e + 미커밋 변경.
범위: P3-S1~S3, AC01~04의 demo 화면/API. 실제 KOBIS·Supabase 검증 아님.

## 구현

- lib/demo.ts: 2026-09-07~13의 가상 영화 10개. 일간/주간/주말 기간별 샘플 수치. 범위 밖 완료된 기간은 빈 결과 시연용이며 실제 시장의 빈 데이터라는 뜻이 아니다.
- app/api/box-office/route.ts: 필수·중복·미지원 파라미터, 실제 날짜, 완료된 기간 검증. 400 필드 오류, 명시적 demo만 200. live/미설정/잘못된 모드는 503이며 자동 demo 전환 없음. Cache-Control: no-store.
- app/_components/box-office.tsx: 조회 버튼으로 조건 확정, 검색어 trim/부분 검색, 원래 순위 유지, 출처·기간·시각, 로딩·empty·검색 없음·오류·재시도.
- 조건 변경 즉시 이전 표를 제거하고 요청 취소 및 세대 번호/cleanup 상태로 오래된 응답 무시. 브라우저 요청 20초 제한.
- Server Component 페이지는 초기 날짜/모드만 전달. 입력은 Client Component, JSON은 Route Handler 담당.
- Playwright 1.63.0 고정. Node >=20 요구를 npm 공식 메타데이터로 확인. 기존 Node 22.20.0 사용.

## 실행·증거

| 명령/검사 | 실제 결과 |
| --- | --- |
| npm run lint | 종료 0, 경고 없음 |
| npm run typecheck | 종료 0 |
| npm test | 2 파일, 54개 통과 (기존 날짜 36 + API 18) |
| npm run build | 종료 0, / 및 /api/box-office 동적, /insights 정적 |
| npx playwright install chromium | Chromium/headless shell 설치 완료 |
| npm run test:e2e | Chromium 8개 통과, 최종 4.8초 |
| 캡처 시각 확인 | 1280px 데스크톱·390px 모바일 캡처 직접 확인, 표·필터·포커스 표시 점검 |

E2E: 목록/검색/순위 보존/추가 API 호출 0, 주간/주말 범위·매출, 정상 empty, 503 후 재시도, 지연 응답 중 조건 변경, 모바일 페이지 넘침 없음·표 영역 스크롤, 키보드 검색→Tab→Enter 초기화, 실제 HTTP 400, 잘못된 JSON 오류, 미완료 주간 안내.
API 단위 테스트에서 global fetch를 실패 spy로 설정하고 호출 0회를 확인했다. DB 클라이언트나 저장 모듈은 아직 없다.
캡처는 로컬 test-results/desktop.png, test-results/mobile.png (Git 제외, E2E 재실행으로 재생성).
화면 조작은 Playwright로 수행했다. 별도의 사람이 브라우저를 조작한 수동 테스트로 기록하지 않는다.

## 검증 루프

1. Vitest가 @/ 별칭을 찾지 못함 → 설정에 저장소 별칭 추가 → 54개 통과.
2. effect cleanup ref 경고 → 활성 상태 변수로 정리 → lint 경고 0.
3. 브라우저 다운로드 완료 전에 E2E 실행하여 5개 launch 실패 → 설치 종료 확인 후 재실행.
4. Next 자체 alert와 제품 alert가 중복되어 테스트 선택자 실패 → 내용으로 범위를 좁힘 → 전체 통과.
5. 모바일 캡처에서 검색 placeholder가 잘림 → 지속 표시 도움말 추가. footer 단계 수정 후 build/E2E 재검사 통과.
색상 환경변수 NO_COLOR/FORCE_COLOR 경고는 실행 환경 안내이며 테스트 실패 아님.

## AC 결과와 미실행

- AC01: demo 세 기간 화면/API 통과. KOBIS 요청·실제 showRange 검증은 Phase 4 미실행.
- AC02: 검색·순위 보존·검색 없음·초기화 통과.
- AC03: 제어된 빈 fixture의 안내 통과. 실API 빈 응답 검증 미실행.
- AC04: 날짜/주간/파라미터 서버 400, 화면 수정 안내 통과.
- AC05: UI 오류·재시도만 mock 확인. 실제 외부 timeout/폴백은 미실행.
- API·DB·캐시·차트·배포 검증은 후속 단계. 이번 결과로 전체 AC를 통과 처리하지 않음.
- E2E 서버는 3103 전용으로 자동 시작/종료; 기존 사용자 서버 재사용 안 함.

## 다음

Phase 4 KOBIS 실연동. 키는 .env.local의 KOBIS_API_KEY에 사용자가 설정하며 대화/Git/로그에 넣지 않는다.
