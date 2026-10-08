# 프로젝트 진행 기록

최종 갱신: 2026-09-21 (Asia/Seoul)

## 현재 위치

**실제 Plan Mode에서 검토한 계획을 사용자가 승인했다. Phase 1 문서·Skill 작성 및 정적 검증 완료. Phase 5 구현·로컬 DB·실제 Supabase 검증 완료. Phase 6 집계·차트·검증 완료. Phase 7 통합 인수 완료. Phase 8 배포·재현 검증까지 완료.**

- 작업 경로: `D:\vibe-workspace\kut_vibe\mini_project`
- 시작 시 작업 폴더는 비어 있었으며 상위 경로에서 AGENTS.md를 찾지 못했다.
- 작성 산출물: PRD.md, ARCHITECTURE.md, ADR.md, ERD.md, AGENTS.md, PROGRESS.md, HANDOFF.md, README.md, .gitignore, PLAN.md.
- 프로젝트 Skill과 docs/VERIFICATION.md, docs/IMPLEMENTATION.md를 작성했다. 앱 기본 화면, package.json, lockfile, 날짜 테스트를 Phase 2에서 추가했다. Phase 5 SQL은 작성했고 격리된 로컬 DB에서 검증했다. 대상 Supabase 적용과 실연동 검증도 완료했다. 배포 URL은 아직 없다.
- 계획 검토는 실제 Plan Mode에서 수행했고, 현재는 Default 실행 모드다.

## 사용자가 지정한 순서

1. PRD·아키텍처·ADR 작성 및 확인.
2. 루트 AGENTS.md 작성: 구조, 커밋 규칙, 실행 명령, 검증 기준.
3. Plan Mode에서 Phase-Step 구현 계획 제시 및 승인.
4. 승인된 단계만 순차 구현하고 각 단계 실행·테스트 결과를 보고.

다음 세션은 AGENTS.md → 이 파일 → PLAN.md → docs/VERIFICATION.md·docs/IMPLEMENTATION.md를 읽고 필요한 설계를 확인한다. 설계와 계획은 승인됐으므로 다시 승인받지 않는다. Phase 4까지 완료했고 사용자 재개 지시 후 다음 실행 범위는 Phase 5이며, 단계별 진행 원칙을 유지한다.

## 초기 설계 시점의 조사 및 검증 기록 — 이후 결과는 Phase 이력 참조

| 확인 | 결과 | 한계 |
| --- | --- | --- |
| 폴더 및 상위 AGENTS.md 확인 | 빈 작업 폴더, 상위 규칙 없음 | 기존 앱 실행 검사 대상 없음 |
| KOBIS 공식 문서 | 동적 상세 문서 POST 조회 성공, 일간/주간 경로·필수 값·최대 10·weekGb 확인 | 실키 API 호출은 수행하지 않음 |
| Next.js 공식 문서 | Server/Client Component 및 Route Handler 역할 확인 | 패키지 버전·실행 환경 미확정 |
| Vercel·Supabase 공식 문서 | 무료 조건·DB 용량·비활성 중지 조건 반영 | 실제 배포 용도와 계정 한도 확인 필요 |
| 설계 검토 | 요구사항별 AC01~AC12, 집계 범위, 장애 폴백, 문서 연결 점검 | 자동 테스트·빌드·실DB 검증 미실행 |
| 정규화 설계 보완 | 3개 테이블 ERD, 상세 명세, 정규화 설명, 트랜잭션·권한 설계 및 AC13~AC14 추가 | DB schema/migration 미구현, 실제 DB 테스트 미실행 |
| 프로젝트 규칙 | 루트 AGENTS.md 작성, 공식 안내 확인 | 실행 명령은 구현 예정 계약으로 구분 |

KOBIS 문서는 일반 웹 추출에서 상세 본문이 빠져 공식 HTML에서 로딩 주소를 확인했다. 네트워크 제한에 대한 승인 후 공개 문서만 조회했으며 공식 예시 키로 API를 호출하지 않았다. 출처와 확인 방법은 ARCHITECTURE.md에 기록했다.

## 현재 설계 방향

- 조회: 공식 일간/주간/주말 Top 10; 검색은 조회된 항목 안에서만.
- 지표: 최근 7/14/30일 일별 Top 10 관측 매출, 영화 Top 5/10, 관객 합계와 관측 매출/관객.
- 저장: movies / box_office_periods / box_office_entries 세 테이블. 정상 24시간·빈 결과 1시간 TTL은 유지. 단일 JSONB 스냅샷안은 ADR-009로 대체.
- 키 없는 시연: 명시적 demo 모드. 실연동 검증은 별도 필수.

## 이후 필요한 정보 — 계획 수립에는 필수 아님

- KOBIS 키는 현재 PC 설정·실연동 완료. 새 PC 별도 설정 및 계정 호출 정책 확인. 실제 키는 채팅/Git 대신 로컬 환경변수에 설정한다.
- Supabase 프로젝트와 서버 전용 비밀키 설정.
- GitHub 저장소 및 배포 주체·운영 용도, Vercel 무료 조건 적용 여부.

## 승인 이력

| 항목 | 상태 | 기록 |
| --- | --- | --- |
| 설계 문서 3종 | 승인 | 사용자: “앞쪽에 만들었던 세 가지의 설계 문서는 모두 승인하겠습니다” |
| 정규화 설계 반영 | 반영 완료 | 데이터 무결성 강화를 위해 ERD.md와 ADR-009 작성. 구체 컬럼·트랜잭션 방식은 설계 검토를 반영한 설계안 |
| AGENTS.md | 작성 완료 | 최초 브리핑의 설계 승인 후 작성 순서에 따름 |
| Phase-Step 구현 계획 | 승인 | 실제 Plan Mode 계획을 사용자가 PLEASE IMPLEMENT THIS PLAN으로 승인; PLAN.md v1.0 |
| Phase 1 | 완료 | Skill 형식·문서 링크·AC 연결·기대값 검사 통과; 제품 검사는 미실행 |
| Phase 2 | 완료 | 앱 기본 화면·날짜 테스트 36개·lint·typecheck·build·dev/start 검증 |

## 단계 종료 기록 형식

각 단계에서 목적 / 변경 파일 / 실행 명령 / 기대 결과와 실제 결과 / 테스트 결과 / 실패 및 수정 / 관련 Next.js 핵심 개념 / 다음 단계 / 승인 상태를 남긴다. 실제 실행하지 않은 검사는 “미실행”으로 기록한다. 비밀키가 포함된 요청 URL이나 환경변수 값은 로그에 넣지 않는다.

## 2026-09-18 — 설계 승인 후 정규화 설계 보완

- 목적: 정규화된 데이터 모델과 프로젝트 규칙 마련.
- 변경: PRD·ARCHITECTURE·ADR·PROGRESS 갱신, ERD·AGENTS 신규 작성.
- 설계 포인트: 영화와 조회 기간의 N:M을 실적 테이블로 연결. 원본 JSON은 증거용, 화면은 관계형 데이터. 다중 쓰기는 DB 함수 트랜잭션으로 처리. 과거 원본 이름과 최신 영화 기본정보의 차이는 수치 무결성 오류와 분리.
- 실행/검증: 문서 파일 목록·링크·코드펜스·현재/대체 설계 표현을 정적으로 점검. 문서만 작성했으므로 앱 빌드·자동 테스트·SQL 실행은 미실행.
- Next.js 연결: DB 함수 RPC는 서버 전용 lib에서 호출하고 Route Handler가 결과 JSON만 브라우저로 전달하는 구조를 유지.
- 다음: Plan Mode에서 Phase-Step, 산출물, 단계별 검증 기준과 승인 지점을 포함한 계획 수립. Skill 및 테스트/배포는 그 계획에 포함.

## 2026-09-18 — 다른 PC 재개 준비

- 사용자가 GitHub 백업 후 다른 PC에서 이어가는 방법과 대화 맥락 보존을 요청했다.
- HANDOFF.md에 대화 결정사항 요약, 승인 상태, clone 후 절차와 시작 프롬프트를 작성했다. 대화 원문 전체를 내보낸 파일은 아니다.
- README.md 문서 안내와 .gitignore를 추가했다.
- 확인 당시 이 폴더는 Git 저장소가 아니며 원격 주소도 없다. GitHub CLI(gh)는 설치되어 있지 않다. Git은 사용 가능하다.
- 사용자가 https://github.com/Yong-jin/vibe_miniproject 를 지정했다. 원격 refs가 없음을 확인하고 로컬 main을 초기화했다. 설계·인계 문서 9개의 첫 백업 커밋 f8b3624을 main에 push했고 원격 main과 로컬 커밋 ID 일치를 확인했다. 이 완료 기록도 후속 문서 커밋으로 반영한다. 새 PC에서는 GitHub 파일 목록과 git log로 최신 상태를 확인한다.
- Codex 공유 링크는 생성하지 않았다. Git clone은 대화 세션 자체를 자동 복원하지 않으므로 새 작업에서 HANDOFF.md와 PROGRESS.md를 읽도록 안내한다.

## Phase-Step 계획 초안 작성

- 요청: 현재 설계를 바탕으로 Phase-Step 구현 계획 작성.
- 브랜치: docs/implementation-plan. 기준 커밋 f8b3624, 이번 변경은 아직 commit/push하지 않음.
- PLAN.md에 8개 Phase와 세부 Step, 의존성·준비물·완료 기준·승인 지점, AC01~14 추적표를 작성했다.
- 실제 세션은 Default다. Plan Mode로 전환했다고 주장하지 않으며 코드·패키지·SQL을 작성/설치하지 않았다.
- 검증: 문서 링크·코드펜스·AC 추적표·Git diff를 정적으로 확인. 앱 테스트·빌드·DB 검사는 미실행.
- 다음: 기존 PLAN.md 초안 검토·승인. 승인 후 첫 범위는 Phase 1의 Skill·검증 체크리스트·상세 구현안이다. 이전 설계 승인은 유효하다.

## Phase 1 완료 — 승인된 계획 실행

- 승인: 사용자가 실제 Plan Mode 계획에 대해 PLEASE IMPLEMENT THIS PLAN을 요청했다. Default 실행 모드에서 Phase 1만 수행했다.
- P1-S1: .agents/skills/box-office-verification/SKILL.md 작성. 일반 규칙은 AGENTS에 유지하고 API·DB·집계 변경 검증에 적용 범위를 한정했다.
- P1-S2: docs/VERIFICATION.md에 AC01~14, 정상·경계·실패 조건, 독립 기대값, 실행 환경·예정 단계, 증거 형식을 정의했다.
- P1-S3: docs/IMPLEMENTATION.md에 화면 상태·DTO·오류 우선순위·캐시/저장 흐름을 정의했다.
- 검사: 기본/번들 Python의 PyYAML 부재로 공식 Skill 검증기가 실패했다. 승인 후 임시 폴더에 PyYAML 6.0.2만 설치하여 재실행했고 Skill is valid! / exit 0을 확인했다.
- 검사: Markdown 13개와 로컬 링크 40개, 코드펜스·인코딩, AC01~14 단일 매핑/미실행 상태, 문서의 손계산 예시, Git diff --check 통과. 구체 기록은 docs/verification/phase-01.md.
- 제품 테스트·빌드·API·DB·배포는 미실행. 앱 의존성·코드·SQL을 만들지 않았다. Skill 자동 검색/실제 호출 검증은 다음 세션/관련 구현 단계에서 확인한다.
- Next.js 설명: 서버의 화면 틀, Client Component의 입력·차트, Route Handler의 JSON 진입점과 비밀키 경계를 상세 구현안에 연결했다.
- Git: docs/implementation-plan에서 기존 미커밋 문서를 보존해 갱신했다. 이번 산출물은 아직 commit/push하지 않았다.
- 다음: Phase 1 결과 확인 후 Phase 2(버전 고정, 앱 기본 구조, 검사 기반) 진행. 설계·계획 승인을 다시 요청할 필요는 없다.

## Phase 2 완료 — Next.js 실행 기반

- 사용자 지시 “페이즈2 진행해줘”로 착수, 실수로 중단된 뒤 계속 진행 요청에 따라 완료했다.
- feat/nextjs-foundation에서 기존 미커밋 문서와 PLAN_planmode.md를 보존했다. commit/push는 하지 않았다.
- 앱 두 경로와 공통 layout/CSS, 버전 파일·lockfile, 검사 명령, 순수 날짜 검증과 36개 테스트를 추가했다.
- npm ci, lint, typecheck, test, build 통과. dev 3001과 start 3000에서 / 및 /insights 모두 200.
- ESLint 10 peer 충돌을 9.39.5로 복구했다. 지원 종료 경고는 남아 있으며 상세 증거·제한은 docs/verification/phase-02.md.
- AC04 날짜 부분, AC12 로컬 실행 부분만 검증했다. 실제 API·DB·배포·화면 E2E는 미실행이다.
- Next.js: page.tsx가 URL을 구성하고 layout.tsx가 공통 틀을 제공한다. 현재 화면은 Server Component다.
- 다음: 사용자 진행 지시 후 Phase 3 demo API·목록·필터·검색·화면 상태 검증.

## Phase 1·2 Git 백업

- 사용자 요청으로 Phase별 커밋과 GitHub push를 수행한다.
- Phase 1 커밋: b7a9911 (계획·Skill·검증 체크리스트·상세 구현안).
- Phase 2 커밋: 앱·날짜 테스트·실행 환경·최신 공통 문서. 이 기록을 포함하는 커밋이다.
- 대상 브랜치: feat/nextjs-foundation. main은 병합하지 않는다.
- 원격 push 성공 여부는 GitHub 브랜치와 git ls-remote의 HEAD 일치로 확인한다.
- 앞선 “미커밋/미푸시” 표기는 해당 시점의 기록이다.
## Phase 3 완료 — demo 목록과 검증

- 사용자 “페이즈3 수행…승인 요청하지말고 끝까지” 지시에 따라 Phase 3 전체 수행.
- 브랜치 feat/demo-box-office, 기준 08e142e. 이번 Phase는 아직 commit/push하지 않았다.
- 가상 영화 10개와 2026-09-07~13 기간, 서버 입력 검증, 명시적 demo API, 목록·검색·필터·빈 결과·오류·재시도·응답 순서 보호 구현.
- lint/typecheck/build 통과, Vitest 54개, Chromium E2E 8개 통과. 데스크톱/모바일 캡처 시각 확인.
- 상세 증거와 실제 실패→수정 기록: docs/verification/phase-03.md.
- 외부 API·DB 호출 없음. 실키/DB 검증 미실행. 인사이트는 Phase 2 틀 유지.
- 테스트 서버 종료 확인. README의 DATA_MODE=demo 실행 방법으로 시연 가능.
- Next.js: 페이지는 Server Component, 입력과 상태는 Client Component, /api/box-office/route.ts가 JSON API.
- 다음 Phase 4에는 KOBIS 키가 필요하다. 키를 채팅에 보내지 않고 .env.local에 설정한다.
## Phase 3 확인 후 CSS 복구

- 사용자 화면에서 CSS 미적용 제보. 3000번 포트의 Phase 2 start 서버가 예전 CSS 2i7c4alnderst.css를 참조하여 HTTP 500 발생.
- Phase 3 build로 디스크 산출물은 변경됐지만 기존 production 프로세스가 남아 발생했다. CSS 소스 삭제가 원인은 아니다.
- 명령줄/프로젝트 경로를 확인한 이전 PID 42324만 종료하고 DATA_MODE=demo로 최신 start 서버 재시작. 페이지 연결 CSS 200 및 site-header 스타일 존재 확인.
- 재발 방지: 실행 중인 production 서버를 종료한 다음 build하고 start를 다시 실행한다. 브라우저에는 Ctrl+Shift+R로 새 HTML/CSS를 받도록 안내한다.

## Phase 3 Git 백업

- 사용자 요청으로 Phase 3 구현·검증·CSS 복구 기록을 하나의 커밋으로 보관한다.
- 원격 대상: origin/feat/demo-box-office. Phase 1·2 커밋도 포함하며 main은 병합하지 않는다.
- 이전 미커밋 표기는 작업 당시의 이력이다. 이 기록을 포함하는 커밋이 Phase 3 백업 기준이다.
- push 후 로컬 HEAD와 원격 브랜치 커밋 일치를 확인한다.

## Phase 4 완료 — KOBIS 실연동

- 사용자 승인에 따라 Phase 4 수행. feat/kobis-integration, 기준 23d81c1. 이번 변경은 미커밋/미푸시.
- 키가 없던 초기에는 mock 구현을 진행했고, 사용자가 .env.local 설정 완료를 알린 뒤 실제 검증했다.
- server-only 호출, 5초 timeout(본문 포함), 안전한 파서, 정제 오류·HTTP 매핑, live 목록 연결, API_GUIDE 작성.
- 실키 일간/주간/주말 각각 10행·200·기대 기간 일치. 브라우저 일간/검색 추가 확인. 총 원본 호출 4회.
- Vitest 86개, demo E2E 8개, lint/typecheck/build 통과. 키 브라우저/번들/존재 로그 비노출, env Git 제외 확인.
- 한도 수치는 계정 정책 화면 미확인. 실제 빈 응답은 fixture만 검증. DB 캐시는 아직 없음.
- 증거: docs/verification/phase-04.md. 다음: Phase 5 대상 Supabase와 격리 검증 DB 준비.
- Next.js: 브라우저는 내부 Route Handler만 호출하고 외부 키·호출은 server-only lib에서 처리한다.
## Phase 4 Git 백업

- 사용자 요청으로 Phase 4 코드·검증·API 가이드를 커밋하고 origin/feat/kobis-integration에 푸시한다.
- 이 기록을 포함하는 커밋이 Phase 4 백업 기준이다. 이전 미커밋 표기는 당시 이력이다.
- Phase 1~4 이력을 포함하며 main 병합은 수행하지 않는다. .env.local과 실제 키는 제외한다.
- 원격 HEAD와 로컬 커밋 일치를 push 후 확인한다.

## 2026-09-20 — Phase 4 기준점 인계 정리

- 지난 9월 18일 문서 수정은 자동 승인 검토의 사용량 제한으로 실행되지 않았다. 오늘 재개하여 정리했다.
- 사용자 요청에 따라 구현은 Phase 4에서 일시 중단, 다음은 별도 진행 지시 후 Phase 5다.
- HANDOFF의 오래된 시작 프롬프트·브랜치, PLAN/README 시점, 검증 체크리스트의 미실행 표시를 실제 결과와 맞췄다.
- 구현 커밋 1910427, 최신 브랜치 feat/kobis-integration. Phase 1~4 이력과 검증 파일이 Git에 포함된다.
- 새 PC는 Node 22.20.0/npm 10.9.3, npm ci, 별도 .env.local 설정이 필요하다.
- 실제 DB·배포·다른 PC 재현은 미실행이다. 문서 검토만 했으며 앱 검사/실API 호출은 반복하지 않았다.

## Phase 5 진행 — 원격 Supabase 설정 대기

- 사용자 Phase 5 진행 지시에 따라 feat/supabase-cache에서 구현. 기준 1910427, 현재 미커밋/미푸시.
- migration/RPC/캐시·폴백/독립 대조·verify:data·test:db 구현.
- 단위/mock115개, Chromium8개, 실제 로컬 PostgreSQL15개, lint/typecheck/build 통과.
- Docker Desktop을 시작해 전용 box-office-phase5-test 컨테이너로 검증했다. 운영 DB 접근 없음.
- SUPABASE_URL/SUPABASE_SECRET_KEY가 미설정이다. 원격 migration/저장→캐시/live 대조/키 검사는 미실행.
- 다음: docs/DB_GUIDE.md에 따라 대상 Supabase 프로젝트 설정 후 Phase 5 마무리. Phase 6 시작하지 않는다.
- 증거: docs/verification/phase-05.md. 테스트 컨테이너는 재현용으로 보존하며 검증 후 중지한다.
- Next.js: Route Handler→서버 전용 캐시 함수→Supabase RPC. 화면은 JOIN 데이터, raw JSON은 대조 전용.

### Supabase 연결 확인 (2026-09-20)

- 사용자가 SUPABASE_URL / SUPABASE_SECRET_KEY 설정 완료를 알렸다. 값은 출력하지 않았다.
- 실제 REST RPC 읽기 요청: HTTP 404, PGRST202. 조회 함수가 노출되지 않아 migration 적용 확인이 필요하다.
- SQL Editor에서 `supabase/migrations/202609200001_box_office.sql` 실행을 요청했다. 직접 DB 연결 문자열은 설정되지 않았다.
- 다음 작업: SQL 적용 완료 후 실제 원본 저장 → 캐시 재조회 → 읽기 전용 원본 대조를 검증한다. Phase 5 완료로 처리하지 않는다.

### Phase 5 완료 (2026-09-20)

사용자 SQL 실행 완료 후 실연동 통과. 2026-09-19 일간 10행: 최초 KOBIS 1회/DB 3회, stored/passed; 재조회 KOBIS 0회/DB 1회, cache/passed. 수집 시각 2026-09-20T13:52:52.743Z 동일. verify:data exit0, 저장 원본 무결성과 새 KOBIS 원본 대조 모두 차이 없음. Git 대상·브라우저 정적 번들 71개 파일에서 실제 키 문자열 검출 0건. 로컬 DB 15개, 단위/mock 115개, E2E 8개와 lint/typecheck/build 통과. Phase 5 변경은 아직 미커밋·미푸시. 다음은 사용자 진행 지시에 따른 Phase 6 인사이트 집계·차트다.

### Phase 5 Git 백업 요청

사용자가 Phase 5 커밋·push를 승인했다. 백업 브랜치는 `feat/supabase-cache`, 원격은 `origin`이다. HANDOFF.md의 clone 대상도 이 브랜치로 갱신했다. 실제 원격 동기화 여부는 `git status -sb`와 원격 HEAD로 확인한다. 앞선 미커밋 기록은 당시 상태다.

## Phase 6 — 완료 (2026-09-21)

사용자 진행 승인, feat/insights 브랜치, 기준 d10b2a0 + 미커밋 변경. Recharts 3.10.1 / react-is 19.3.0 고정. lib/metrics.ts 순수 집계, lib/load-days.ts 동시 요청 2개·취소, /insights 차트·동일 값 표·7/14/30일·Top5/10·실패 재시도 구현. 빈/실패는 null, 불완전 기간 합계·순위 숨김, 관객 0 이하 비율 숨김, 정수 범위 검사.

검증: npm test 127개, npm run test:e2e 11개, lint/typecheck/build 통과. 손계산 240000원/24명/10000원, demo 7일 3850000000원/385000명 확인. 모바일 캡처 시각 확인 완료. 이번 Phase는 demo/mock으로 검증했고 새 live 7일 수집이나 DB 변경은 실행하지 않았다. Phase 5 실연동 증거는 유지된다. 상세 docs/verification/phase-06.md. 다음 Phase 7 통합 인수·리팩토링은 사용자 진행 지시 후 시작. 아직 커밋·push하지 않았다.

### Phase 6 Git 백업 (2026-09-21)

사용자가 커밋·push를 요청했다. 검증한 Phase 6 코드·테스트·문서를 feat/insights 브랜치로 백업한다. HANDOFF.md clone 대상도 갱신했다. 이전 미커밋 표기는 당시 이력이며 원격 동기화는 git status와 원격 HEAD로 확인한다.

## Phase 7 완료 — 2026-09-21

사용자 승인으로 feat/acceptance에서 진행. lib/response.ts 공통 응답 검증과 load-days 20초 제한 추가. malformed 성공 응답 테스트 1개 실패 재현 후 수정. 최종 단위129개·화면11개·격리 실제DB15개·lint/typecheck/build 통과. 실브라우저 최초 KOBIS→DB 저장→cache 재조회, live7일 인사이트 및 원본 대조 통과. 비밀키 검사0건. docs/ACCEPTANCE.md·verification/phase-07.md 작성. AC12 배포·별도 checkout 재현만 남음. 서버3104/테스트DB 중지. 미커밋·미푸시; 다음은 사용자 지시 후 Phase 8.

### Phase 7 Git 백업 요청

사용자가 Phase 7 커밋·push를 승인했다. 백업 브랜치는 feat/acceptance이며 HANDOFF.md clone 대상도 갱신했다. 앞선 미커밋 표기는 당시 이력이다. 원격 동기화는 git status와 원격 HEAD로 확인한다.

## Phase 8 진행 — 2026-09-21

사용자 진행 승인. feat/deployment, 기준 0958fd6. Vercel CLI50.39.0 로그인 만료 확인, 사용자에게 vercel login·계정/팀/프로젝트·개인 비상업적 용도 여부 요청. 별도 checkout(test-results/phase8-repro)에서 Node22.20.0/npm10.9.3, npm ci·build·start 통과, 키 없는 demo 목록10행/인사이트7일 브라우저 확인. 동일 PC 재현이며 다른 물리 PC 검사는 아님. docs/DEPLOYMENT.md와 phase-08 기록 작성, 오래된 README/HANDOFF 안내 보완. 배포 URL과 smoke는 아직 미실행, Phase8/AC12 완료 아님. 다음: 사용자 설정 답변 후 로그인/플랜 확인→게시→실URL 검사.

### Vercel 프로젝트 준비

사용자가 로그인 완료·개인 계정 새 프로젝트 생성·개인 비상업적 용도를 확인했다. yong-jins-projects/box-office-insights 생성·연결 완료. 환경변수 전송 명령은 자동 승인 검토에서 특정 목적지로의 비밀키 업로드 명시적 승인 부족으로 거부되어 실행되지 않았다. 사용자에게 해당 프로젝트 Production 환경변수 등록 승인을 요청했다. 승인 후 환경변수 등록→배포→실URL 검사 재개.

## Phase 8 완료 — 2026-09-21

개인 비상업적 용도·Vercel 비밀키 등록 명시적 승인 후 환경변수4개 등록, Next.js/Node22 설정, production 배포 완료. URL https://box-office-insights.vercel.app . deployment dpl_4YWTewX4ciRfx2kqG1XpFLE5Popa. 0958fd6 앱 코드 기준. 실제 브라우저 목록10행/검색/주간·주말/7일 차트/400/최초저장→캐시 통과, 오류·비밀키검출0. 별도checkout 재현과 함께 AC12 통과, 전체 Phase1~8 완료. Supabase 잔여 용량·계정 플랜 대시보드는 배포 전 확인 사항. 최종 문서·배포 제외 파일은 feat/deployment 미커밋·미푸시.

### 최종 Git 백업 요청

사용자가 Phase 8 커밋·push를 승인했다. feat/deployment에 배포 문서·인수 결과·제외 설정을 백업하고 HANDOFF의 clone 대상을 갱신했다. 이전 미커밋 표기는 당시 이력이다. 배포 앱은 0958fd6와 동일하며 이번 변경은 문서·업로드 제외 설정이다.

## 강의 자료 제작 전 보완 — 2026-09-22

사전 확인: Supabase read_box_office_period 읽기 요청 HTTP200. 현재 요청에 정상 응답하므로 일시정지 상태가 아님을 확인했다. 문서 작업 브랜치에서 시작.

1. 문서 갱신 완료: PRD 2일차3~7의 상태를 완료로 수정하고 실제 배포 URL 및 Phase5~8·인수 결과 증거를 연결했다.

2. 자동 블록 출처 확인 완료: 설치된 Next16.3.5 generate-agent-files.js의 블록 본문·upsertFile 및 app-info-log.js의 hasCurrentAgentRules/writeAgentFiles 호출 확인. AGENTS 블록 바로 위에 출처·조건·목적 설명을 추가했다. 블록 본문은 변경하지 않았다.

3. 캡처 부분 완료: docs/screenshots에 실제 사이트 데스크톱/모바일4장 저장. Codex Plan Mode·Supabase 테이블·Vercel 대시보드 원본 UI는 두 접근 도구가 sandbox helper 초기화 오류로 실패하여 미캡처. 합성으로 대체하지 않았고 screenshots/README.md에 남은 장면 기록.
