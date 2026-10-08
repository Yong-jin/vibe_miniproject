# Phase 4 — KOBIS 실연동 검증

2026-09-18 · feat/kobis-integration · 기준 23d81c1 + 미커밋 변경.
box-office-verification Skill 적용. 실제 API와 mock을 분리했다.

## 구현/계약 확인

서버 전용 lib/kobis.ts, 순수 파서 lib/kobis-parser.ts, 정제 오류 lib/kobis-error.ts.
Route Handler의 demo/live 분기와 목록 연결. API 키는 서버 환경변수에서만 접근한다.
공식 일간/주간 상세 문서 POST 조회로 엔드포인트·targetDt·weekGb·최대 10개를 재확인했다.
실제 사용자 키로 HTTPS 성공과 showRange·숫자 문자열 파싱을 확인했다. 세부 안내: [API 가이드](../API_GUIDE.md).

## 실제 API

사용자가 .env.local 설정 완료를 알린 뒤 실행했다. 값은 출력하지 않았다.

| 요청 | HTTP | 실제 기간 | 행 | 출처 |
| --- | --- | --- | --- | --- |
| date=2026-09-13, daily | 200 | 2026-09-13~13 | 10 | kobis |
| date=2026-09-13, weekly | 200 | 2026-09-07~13 | 10 | kobis |
| date=2026-09-13, weekend | 200 | 2026-09-11~13 | 10 | kobis |
| 브라우저 초기 일간 2026-09-17 | 200 | 2026-09-17~17 | 10 | kobis |

직접 3회 + 브라우저 1회 = 4회. 검색과 검색 초기화는 추가 원본 호출 없이 통과.
브라우저 요청 목록의 KOBIS 직접 호출 0회, 내부 응답 1회. 화면 출처 KOBIS·실제 기간·수집 시각·직접조회 상태 확인.
live 캡처: 로컬 test-results/live.png (Git 제외). 직접 시각 확인했다.

## 자동 검사

- npm run lint: 통과.
- npm run typecheck: 통과.
- npm test: 3파일 86개 통과 (기존 날짜36, Route Handler20, 파서/호출30).
- npm run build: 통과. 이후 추가된 Route Handler 테스트 2개는 typecheck/test로 재검증.
- npm run test:e2e: demo Chromium 8개 통과.

정상/빈 리스트, 잘못된 구조·JSON·기간, 정수 표현·안전 범위, 개봉일, 중복 영화/순위, 음수 보존을 검사했다.
HTTP 401/403/429/500, 네트워크 예외, 본문 읽기 지연 5초, 키 누락, API 502/504 매핑과 자동 재시도 0회를 mock으로 확인했다.
faultInfo의 원본 문구나 키가 공개 오류로 전파되지 않는다. 실API 장애를 의도적으로 유발하지 않았다.

## 비밀키 경계

- server-only import로 클라이언트에서 호출 모듈 import를 방지.
- 실브라우저 HTML·API 응답·요청 URL·콘솔과 .next/static/.next/dev/logs의 존재 파일 14개를 실제 키 문자열로 검사: 노출 없음.
- .env.local은 git check-ignore로 제외 확인.
- 서버 코드는 fetch 예외/원본 URL/원본 본문을 console에 출력하지 않는다.
- 키별 한도 화면은 미확인. 실제 성공 4회만 검증했고 특정 일일 한도를 보장하지 않는다.

## 실패와 수정

mock fixture의 동적 프로퍼티가 showRange 문자열과 같은 인덱스 타입으로 추론되어 TypeScript 오류 발생.
리스트 키 generic/Record 타입으로 수정한 후 typecheck/build 통과.
Phase 3 CSS 장애 재발 방지를 위해 기존 start 서버 PID/프로젝트를 확인하고 종료한 뒤 build/start했다.

## 범위

AC01 세 기간 실제 조회, AC04 입력 검증, AC05 외부 오류/timeout mock, AC11 현 구현 키 경계 확인.
AC03 원본의 실제 빈 응답은 이번 실키 검사에서 관측하지 않았으며 fixture로만 확인.
DB·캐시·원본/저장본 대조는 Phase 5 미구현. 전체 인수 완료를 의미하지 않는다.
