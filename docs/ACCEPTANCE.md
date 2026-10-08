# 통합 인수 결과

2026-09-21 · Phase 7 · feat/acceptance · 기준 e0b2d16 + 미커밋 변경.
통과는 아래 명시한 환경·증거 범위다. Phase 8에서 별도 checkout 및 production URL 검증까지 확인했다.

| ID | 결과 | 환경·검증 증거 |
| --- | --- | --- |
| AC01 | 통과 | Phase 4 실키 일간·주간·주말; Phase 7 실제 브라우저 일간 및 demo 기간 UI |
| AC02 | 통과 | Playwright 목록 검색·순위 보존·검색 빈 결과 |
| AC03 | 통과 | demo 정상 빈 결과 안내, 인사이트 빈 날짜와 실패 구분 |
| AC04 | 통과 | 날짜 단위/Route Handler 테스트, 윤일·KST·중복 파라미터·미완료 기간 |
| AC05 | 통과 | KOBIS mock timeout/HTTP/본문 오류, cache mock stale, 브라우저 20초 제한 단위 테스트 |
| AC06 | 통과 | cache mock DB 조회 실패 폴백 및 양쪽 실패503 |
| AC07 | 통과 | cache mock 저장/재조회 실패·대조 미완료 표시 |
| AC08 | 통과 | Phase 5 live cache hit 외부0회; Phase 7 브라우저 최초stored→cache 동일 시각; 실제 DB UNIQUE |
| AC09 | 통과 | 실제 원본 대조 exit0 및 격리 실제 DB 수치 변조 검출 |
| AC10 | 통과 | 손계산·누적값 제외·빈 날짜·0 이하 분모·overflow·주간 거부; live 최근7일 정상 |
| AC11 | 통과 | 실제 브라우저 응답/번들 키 검출0, Git 대상·정적 번들·기존 개발 로그 82파일 검출0; 서버 검증 출력에 키 없음 |
| AC12 | 통과 | 실행 가이드·자동 검사·실제 API/DB 완료. Phase 8 동일 PC 별도 checkout 설치·빌드·demo smoke 통과; 실제 production URL 목록·검색·필터·차트·캐시 smoke 통과 |
| AC13 | 통과 | 실제 격리 PostgreSQL FK·복합키·UNIQUE·빈 기간 |
| AC14 | 통과 | 실제 격리 PostgreSQL 삭제 후 오류 전체 rollback·10→8→0·잠금 대기·최신 버전 보존 |

상세 증거: [Phase 4](verification/phase-04.md), [Phase 5](verification/phase-05.md), [Phase 6](verification/phase-06.md), [Phase 7](verification/phase-07.md).
외부 서비스 장애를 실제로 유발하지 않았다. 실패 경로는 mock 및 격리 PostgreSQL에서 재현했다.

최종 배포 증거: [Phase8](verification/phase-08.md). 배포 URL: https://box-office-insights.vercel.app
