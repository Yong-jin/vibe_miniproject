# Phase 7 통합 검증 — 완료

2026-09-21 · feat/acceptance · 기준 e0b2d16 + 미커밋 변경. box-office-verification Skill 적용. Next.js 설치본의 Server/Client Components 및 Route Handlers 가이드를 읽고 수정했다.

## 수정과 실제 검증 Loop

인사이트 로더가 날짜만 맞는 불완전 JSON을 성공으로 받아 렌더링 오류 가능성이 있었다. tests/load-days.test.ts를 먼저 추가했고 기대 error가 undefined라 1개 실패했다. 공통 lib/response.ts로 목록/인사이트의 응답 구조·기간·안전 정수·중복·메타정보 검증을 통합하여 통과시켰다. 인사이트 브라우저 요청에 20초 AbortController 제한과 타이머/리스너 정리를 추가했고 가상 시계로 검증했다. API 계약·DB 모델은 변경하지 않았다.

## 실행 결과

| 검사 | 결과 |
| --- | --- |
| npm test | 7파일 129개 통과 |
| npm run lint / typecheck / build | 각각 통과 |
| npm run test:e2e | demo Chromium 11개 통과 |
| npm run test:db | 격리 실제 PostgreSQL17.11 15개 통과 |
| 실제 브라우저 / | 2026-09-20 일간10행, 최초 kobis/stored/passed → 재조회 cache/stored/passed |
| 동일 버전 | 두 응답 fetchedAt 2026-09-21T01:28:33.345Z |
| 실제 브라우저 /insights | 최근7일 정상7/빈0/실패0, 합계 표시, pageerror0 |
| verify:data 2026-09-20 daily | exit0, integrity/comparison passed, 차이0 |
| 비밀값 검사 | 실제 브라우저 응답·번들0건, Git대상/정적번들/개발로그82파일0건 |

실제 production 서버는 127.0.0.1:3104에서 실행했다. Playwright의 실제 브라우저 탐색으로 API 요청·렌더링·재조회까지 확인했다. 추가 live 요청은 기본 7일과 원본 대조로 제한했다. 외부 장애는 mock, 관계·rollback·동시성은 격리 실제 DB에서 확인했다. 로컬 검증 서버와 테스트 DB 컨테이너는 검사 후 중지했다.

캡처·상세 JSON: test-results/phase7-live-list.png, phase7-live-insights.png, phase7-live.json (Git 제외). 주요 결과는 위 표에 보존했다. API 키/DB 키/원본 인증 URL은 기록하지 않았다.

## 완료 범위

[인수 결과](../ACCEPTANCE.md)에서 AC01~11·13~14 통과, AC12는 배포/별도 checkout 전 부분 완료다. Phase 8 미착수. 현재 변경은 미커밋·미푸시다.
