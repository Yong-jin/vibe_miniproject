# Phase 6 검증 기록 — 완료

2026-09-21 · feat/insights · 기준 d10b2a0 + 미커밋 변경. box-office-verification Skill 적용. AC10 대상.

## 구현과 개념

- lib/metrics.ts: 일별 salesAmt/audiCnt만 합산, 영화 코드별 순위와 코드 동률 정렬. 안전 정수 검사, 비양수 분모 비율 숨김.
- lib/load-days.ts: 날짜별 내부 API 최대 동시 2개. AbortController로 이전 세대 결과 및 대기 요청 무시.
- app/insights/page.tsx: Server Component에서 demo/종료일 결정. Client Component에서 조회 진행률·필터·Recharts·동일 값 표를 제공한다. 키는 전달하지 않는다.
- Recharts 3.10.1과 react-is 19.3.0을 정확 버전/lockfile로 고정. npm peerDependencies React19 지원 확인, npm install audit 0 vulnerabilities.
- [Recharts 공식 접근성 설명](https://github.com/recharts/recharts/blob/main/storybook/stories/API/Accessibility.mdx)을 확인하고 accessibilityLayer와 키보드 접근 가능한 대체 표를 제공했다.

## 실행 증거

| 명령/검사 | 실제 결과 |
| --- | --- |
| npm test | 6파일 127개 통과 |
| npm run lint | 통과 |
| npm run typecheck | 통과 |
| npm run build | 통과 |
| npm run test:e2e | Chromium 11개 통과 (기존 8 + 인사이트 3) |
| 손계산 | 160000+80000=240000원, 24명, 10000원/명; 영화 A180000/B60000 |
| demo 화면 | 7일 3850000000원, 385000명, 10000원/명 |
| 실패/빈 날짜 | null, 합계·순위 미표시; 실패 재시도로 복구 |
| 빠른 변경 | 30→7일, 이전 응답 무시 |
| 모바일·키보드 | 390px 가로 넘침 없음, Enter 재시도 성공; 캡처 시각 확인 |

단위 검사는 누적값 변경, 캐시 출처 동일성, 중복 날짜, 주간 혼합, 합산 overflow, 0/음수 관객, 윤일, 동시성 최대2 및 취소 후 게시 금지를 포함한다.
캡처: test-results/insights-mobile.png 및 insights-desktop.png (Git 제외, E2E 재실행으로 재생성).
최초 이미지 도구가 sandbox helper 오류로 읽기에 실패하여 동일 로컬 PNG를 읽어 시각 확인했다. 테스트 실패는 없었다.

## 범위와 다음 단계

이번 단계는 fixture/mock/demo 검증이다. 새 live API 기간 수집·DB 재검사·배포는 실행하지 않았다. Phase 5 원격 저장·캐시 검증은 해당 기록을 참조한다. Phase 7에서 전체 live 흐름과 인수 기준을 통합 확인한다. Phase 6 변경은 미커밋·미푸시다.
