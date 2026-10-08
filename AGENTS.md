# 프로젝트 작업 규칙

## 목적과 작업 순서

이 프로젝트는 영화 박스오피스 대시보드를 Skill·Agent·Harness·Loop 기반 워크플로우로 개발한다. 한국어로 소통하고 이해하기 쉬운 단순함을 우선한다.

- 작업 시작 시 PROGRESS.md와 작업에 관련된 PRD.md, ARCHITECTURE.md, ADR.md, ERD.md를 읽는다. 승인 상태와 미실행 검증을 확인한다.
- 설계 3종은 승인됐으며 정규화된 ERD로 갱신했다. 실제 Plan Mode에서 검토한 PLAN.md가 승인됐다. Phase 1 결과와 PROGRESS.md의 현재 단계를 확인하고 승인된 Phase 범위에서만 진행한다.
- 사용자가 요청한 Plan Mode와 실제 실행 모드를 구분한다. 일반 모드에서 계획을 작성했다면 Plan Mode 결과라고 보고하지 않는다.
- 승인된 Phase-Step에 따라 한 단계씩 구현하고, 결과를 보고한 뒤 다음 단계로 진행한다. 이미 승인된 범위의 사소한 구현 선택은 다시 승인받지 않는다. 범위·스택·데이터 의미가 달라지면 설계와 계획을 먼저 갱신한다.
- 매 단계에서 관련 Next.js 개념(App Router, Server/Client Component, Route Handler)을 실제 변경과 연결하여 짧게 설명한다.

## 구조와 기술 규칙

- Next.js App Router + TypeScript, Recharts, Supabase Postgres, Vercel, npm을 사용한다. 버전은 구현 준비 단계에서 검증하고 package-lock.json과 Node 버전 파일에 고정한다.
- `app/`: 화면과 레이아웃. `app/api/`: Route Handler. `app/_components/`: 화면 구성요소.
- `lib/`: 서버 연동·캐시·검증·집계 함수. `supabase/migrations/`: 스키마·권한·DB 함수의 변경 이력.
- `tests/`: 단위·통합·화면 테스트 및 `fixtures/`. `scripts/`: 원본 대조 등 수동 검증 스크립트. `docs/`: API 가이드·검증 기록·배포 가이드.
- `.agents/skills/`: box-office-verification Skill을 작성했다. API·저장·집계 변경 검증에 적용하고 세부 사례는 docs/VERIFICATION.md를 따른다. 루트 AGENTS.md를 다른 도구의 규칙 파일로 대체하거나 import 파일로 우회하지 않는다.
- 별도 백엔드 서버, ORM, 불필요한 클래스 계층·전역 상태 라이브러리를 추가하지 않는다.
- 입력/차트 등 상호작용에 Client Component를 사용한다. DB와 외부 키 사용 모듈은 서버 전용으로 유지한다.

## 데이터 규칙

- ERD.md의 movies / box_office_periods / box_office_entries 세 테이블을 따른다. 과거 단일 JSONB 캐시안은 ADR-009로 대체됐다.
- 영화는 movie_cd로 식별한다. 영화명으로 JOIN하지 않는다. 기간 유형과 정규화된 기준일을 캐시 키로 사용한다.
- 원본 JSON은 검증 증거다. 정상 화면·지표는 관계형 행으로 구성한다. 여러 테이블 저장은 DB 함수 한 번의 트랜잭션으로 처리한다.
- 정상 빈 결과, API 오류, 미수집, 검색 결과 없음, 오래된 캐시를 구분한다. 실패를 빈 성공이나 자동 demo 전환으로 숨기지 않는다.
- 지표는 일별 Top 10 관측 데이터 기준이다. 누적값을 날짜별 합산하지 않고 Top 10 이탈을 0으로 채우지 않는다. 기간 집계는 일간 데이터만 사용한다.
- 날짜는 KST 기준, DB timestamp는 UTC로 보관한다. 숫자 문자열을 검증하고 안전 정수 범위 초과를 조용히 반올림하지 않는다.
- 실제 키·토큰·키가 포함된 URL은 Git, 브라우저, 로그, 문서에 넣지 않는다. `.env.local`과 배포 환경변수에만 둔다. 예시 파일에는 값 없이 이름과 설명만 둔다.

## 실행 명령 계약

Phase 2에서 npm ci, dev, build, start, lint, typecheck, test를 구현하고 검증했다. Node 22.20.0 / npm 10.9.3을 사용한다. Phase 3에서 test:e2e를 구현했다. npm run build 후 실행하며 Playwright가 demo 서버를 자동 시작/종료한다. Phase 5에서 test:db와 verify:data를 구현했다. test:db는 격리 TEST_DATABASE_URL 및 TEST_DB_ISOLATED=true가 필요하다. docs/DB_GUIDE.md를 따른다. 실행 방법은 README.md, 증거는 docs/verification/phase-02.md를 따른다.

| 명령 | 목적 | 제공할 단계 |
| --- | --- | --- |
| `npm ci` | 고정 의존성 설치; 최초 lockfile 생성 후 사용 | 프로젝트 초기화 |
| `npm run dev` | 로컬 개발 서버 | 프로젝트 초기화 |
| `npm run build` | 배포용 빌드 | 프로젝트 초기화 |
| `npm run start` | 빌드 결과 로컬 실행 | 프로젝트 초기화 |
| `npm run lint` | 코드 규칙 검사 | 프로젝트 초기화 |
| `npm run typecheck` | TypeScript 검사 | 프로젝트 초기화 |
| `npm test` | 단위·mock 통합 테스트 단발 실행 | 테스트 기반 구축 |
| `npm run test:e2e` | fixture 기반 핵심 화면 테스트 | 화면 검증 |
| `npm run test:db` | 격리된 테스트 DB에서 관계·트랜잭션·권한 검증 | DB 연동 |
| `npm run verify:data -- --date=YYYY-MM-DD --period=daily` | 실키로 원본/저장 데이터 읽기 대조 | API/DB 검증 |

DB migration 적용 명령은 실제 Supabase 환경과 도구를 확인한 후 API 연동 가이드에 기록한다. 테스트에서 운영 데이터 삭제나 무조건 DB reset을 사용하지 않는다. live 검증은 키·DB가 준비된 명시적 환경에서만 수행한다.

## 검증 루프와 완료 기준

1. 관련 AC와 기대 결과를 먼저 정한다. AC는 프로젝트 인수 기준이며 KOBIS 오류 코드가 아니다.
2. 최소 단위로 변경하고 해당 위험을 확인하는 검사를 실행한다.
3. 실패 시 원인과 수정 내용을 기록하고 관련 검사를 다시 실행한다.
4. 코드 단계 종료 시 lint·typecheck·관련 테스트·build를 확인한다. 없는 명령은 성공으로 처리하지 말고 미구현/미실행으로 보고한다.
5. API/DB 단계는 캐시 hit의 외부 호출 0회, 폴백, 원본 대조 및 AC13~AC14의 FK·복합키·롤백·동시 갱신을 실제 DB에서 검증한다. mock 성공만으로 DB 검증을 대신하지 않는다.
6. 화면 단계는 정상·빈 결과·오류와 모바일/키보드 동작을 확인한다. 배포 단계는 실제 URL smoke test를 기록한다.

문서만 수정한 단계에서는 문서 간 일관성, 상대 링크, 코드펜스와 인수 기준 연결을 확인한다. 존재하지 않는 앱의 빌드나 테스트를 실행한 것처럼 쓰지 않는다.

## Git 작업 규칙

- Git 초기화 이후 작업 시작/종료 시 `git status --short`와 diff를 확인한다. 사용자 변경을 되돌리거나 덮어쓰지 않는다.
- 기본 브랜치는 main, 구현 작업은 `feat/<주제>`, 수정은 `fix/<주제>`, 문서는 `docs/<주제>`를 사용한다. 기존 브랜치 정책이 있으면 따른다.
- 커밋은 검증 가능한 한 목적 단위. 형식은 `docs: 정규화 ERD 추가`, `feat: 일별 박스오피스 조회`, `fix: 빈 결과 캐시 처리`, `test: 저장 롤백 검증`처럼 작성한다.
- 커밋 메시지와 실제 검증 결과를 일치시킨다. 자동 생성 산출물·비밀키·node_modules·빌드 출력은 커밋하지 않는다.
- 커밋/원격 push/merge/배포는 승인된 계획이나 사용자의 지시 범위에서 수행한다. 문서 승인을 원격 게시 승인으로 간주하지 않는다. 강제 push·이력 재작성·파괴적 reset은 하지 않는다.

## 진행 기록

PROGRESS.md에 현재 단계·승인 상태·변경 파일·실행 명령·실제 결과·미해결 사항·다음 작업을 기록한다. 핵심 설계 변경은 ADR과 ERD에도 반영한다. 완료/실패/미실행을 구분하고 새 PC에서 재개할 수 있는 상태를 유지한다.

이 파일은 [OpenAI 공식 AGENTS.md 안내](https://learn.chatgpt.com/docs/agent-configuration/agents-md)에 따라 루트에 두는 프로젝트 지침이다. 상세 설계는 연결된 문서에 유지하고 규칙 파일에 중복 복사하지 않는다.

아래 관리 블록은 프로젝트 작성자가 직접 쓴 규칙이 아니라, Next.js 16.3.5가 AI 에이전트를 감지한 `next dev` 실행에서 현재 블록이 없을 때 자동 추가·갱신하는 안내다.
설치된 버전의 로컬 문서(`node_modules/next/dist/docs/`)를 먼저 읽게 하여 오래된 API 지식에 따른 오류를 줄이는 목적이다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Phase 7 검증 상태

명령 계약은 모두 구현했다. 통합 인수 결과는 docs/ACCEPTANCE.md를 따른다. 브라우저 JSON은 lib/response.ts 공통 검증을 거쳐 표시한다. 20초 요청 제한과 취소 정리를 유지한다. 최신 실제 결과는 docs/verification/phase-07.md의 단위129개·E2E11개·격리DB15개 및 live 브라우저 증거다. Phase 8에서 production URL 및 동일 PC 별도 checkout 재현을 검증했다. 최종 증거는 docs/verification/phase-08.md를 따른다.
