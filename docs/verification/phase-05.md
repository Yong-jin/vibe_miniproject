# Phase 5 검증 기록 — 완료

2026-09-20 · feat/supabase-cache · 기준 1910427 + 미커밋 변경.
프로젝트 box-office-verification Skill 적용.

## 완료한 구현

- movies/box_office_periods/box_office_entries, FK·복합 PK·기간 UNIQUE·rank UNIQUE·인덱스·RLS.
- SECURITY INVOKER 저장/조회 RPC, PUBLIC/anon/authenticated 접근 거부.
- 기간 잠금·수집 시작 시각·영화 코드 순서 upsert, 기존 실적 교체, 단일 조회 JOIN.
- 서버 전용 fetch RPC·3초 작업 제한, 캐시 우선·stale·저장 실패·양쪽 실패 처리, 전체20초 제한.
- 원본/저장 독립 대조와 읽기 전용 CLI.
- 정상 결과 TTL24h, 빈 결과1h. 캐시 hit에서 외부 요청0회.

## 실제 실행

| 검사 | 결과 | 환경 |
| --- | --- | --- |
| npm test | 5파일 115개 통과 | fixture/mock, 외부 호출 없음 |
| npm run lint | 통과 | 코드 검사 |
| npm run typecheck | 통과 | TypeScript |
| npm run build | 통과 | Next.js production |
| npm run test:e2e | Chromium 8개 통과 | demo, 3103 자동 서버 |
| npm run test:db | 15개 통과 | 실제 로컬 PostgreSQL17.11 |
| npm run verify:data | 설정 부족으로 실패 안내 | Supabase 미설정, 실제 대조 미실행 |

DB 테스트: 서비스 역할 저장/조회, 정밀 숫자/TTL, 10→8→0/ID 유지/빈 TTL, 실제 DB 수치 변조 대조, 없는 영화/기간 FK, 실적/기간 중복, 삭제 후 삽입 실패 롤백, anon/authenticated 테이블/RPC 거부, RLS, 최초 동시 저장, 제어된 실제 잠금 대기 후 오래된 입력 무시, 다른 기간의 영화 기본정보 시간 역전 방지.
롤백은 테스트 스키마의 before insert trigger로 실패시켜 부모 갱신·실적 삭제까지 실행된 뒤에도 원래 세 테이블 값이 유지됨을 확인했다.
동시 잠금은 첫 연결의 트랜잭션을 열어 둔 채 두 번째 요청을 보내고 pg_blocking_pids로 대기를 확인한 뒤 commit했다.

## 검증 루프

- 코드 작성 도구의 JavaScript 구문 오류로 첫 묶음 쓰기가 실행되지 않아 파일별 호출로 재실행했다.
- 대조 CLI의 ESM/CJS export 불일치를 createRequire+tsx로 수정했다.
- 테스트 fixture의 기본정보 관측 시각이 새 잠금 테스트보다 오래되어 기대값이 실패했다. 시각을 명시적으로 새 값으로 수정 후 15개 재검사 통과.
- 초기 Docker는 꺼져 있었다. 설치된 Docker Desktop을 시작하고 전용 localhost 테스트 컨테이너로 실제 DB를 검증했다.
- 소스 구현 후 테스트/빌드 성공을 확인했으며 remote DB 성공으로 과장하지 않는다.

## 현재 AC 범위

AC06~08 mock 통과, AC09 독립 대조 및 실제 DB 변조 검출 통과.
AC13~14 로컬 실제 PostgreSQL 통과. AC11 DB 역할·RLS는 로컬 검증, Supabase gateway 인증/비밀키 경계는 연결 후 확인.
당시 미실행이던 실제 Supabase 검증은 아래 완료 기록으로 갱신한다.
아래 실연동 후 Phase 5 완료. [DB 연결 가이드](../DB_GUIDE.md)를 따라 Supabase 준비 후 마무리한다.

## 대상 Supabase 연결 확인

2026-09-20: 환경변수 설정 존재 확인. 실제 조회 RPC 요청은 HTTP 404 / PGRST202로, 함수가 아직 노출되지 않았다. SQL Editor migration 적용을 요청하고 live 저장·캐시·원본 대조 검증은 대기 중이다. 비밀값은 기록하지 않았다.

## SQL 적용 후 최종 실연동 — 통과

2026-09-20 사용자 SQL 적용 완료 후 실제 서버 모듈로 2026-09-19 일간을 조회했다.

| 검사 | 실제 결과 |
| --- | --- |
| 최초 조회 | 10행, source=kobis, stored/passed, 경고 없음; KOBIS 1회, DB 3회 |
| 캐시 재조회 | source=cache, stored/passed, 경고 없음; KOBIS 0회, DB 1회 |
| 수집 버전 | 두 응답 모두 2026-09-20T13:52:52.743Z |
| npm run verify:data -- --date=2026-09-19 --period=daily | exit0, integrity/comparison passed, 수치·기본정보 차이 없음 |
| 비밀값 검사 | Git 대상·브라우저 정적 번들 71파일, 실제 키 검출 0건 |

AC06~09 실연동 및 mock 검증 완료. AC11 키 경계 검사와 로컬 실제 역할 차단 검사 완료. AC13~14 실제 격리 PostgreSQL에서 검증 완료. 원격 Supabase에 장애를 주입하지 않았고, 원격 브라우저 수동 검사는 이번 추가 검증에 포함하지 않았다. Phase 5 완료, Phase 6 미착수.
