> Phase1~8 완료. URL https://box-office-insights.vercel.app . 최종 백업 브랜치는 feat/deployment. 배포 앱 코드 기준은 0958fd6. docs/verification/phase-08.md 참조.

# 다른 PC에서 이어가기

최신 로컬 상태: Phase 8 배포·재현 검증 완료. PROGRESS.md와 docs/verification/phase-08.md를 먼저 확인한다.

최종 정리: 2026-09-21. 아래 clone 명령으로 Phase 8 브랜치를 받는다.
최신 브랜치: **feat/deployment**. Phase 8 커밋을 포함한 브랜치 최신 상태를 사용한다.
이후 인계 정리 문서 커밋까지 포함한 브랜치 최신 상태를 받는다. main은 초기 설계 상태다.

## 완료 상태와 증거

| Phase | 완료 내용 | 증거 |
| --- | --- | --- |
| 1 | 계획·Skill·검증 절차 | [phase-01](docs/verification/phase-01.md) |
| 2 | Next.js 실행 기반 | [phase-02](docs/verification/phase-02.md) |
| 3 | demo 목록·검색·필터·화면 상태 | [phase-03](docs/verification/phase-03.md) |
| 4 | 실제 KOBIS 일간·주간·주말 연동 | [phase-04](docs/verification/phase-04.md) |
| 5 | 관계형 DB·캐시·폴백·실연동 | [phase-05](docs/verification/phase-05.md) |
| 6 | 집계·차트·진행률·재시도 | [phase-06](docs/verification/phase-06.md) |
| 7 | 통합 인수·공통 응답 검증 | [phase-07](docs/verification/phase-07.md) |
| 8 | production 배포·별도 checkout 재현 | [phase-08](docs/verification/phase-08.md) |

최종 코드 검증은 Vitest 129개·demo Chromium 11개·lint/typecheck/build 통과.
실제 API 4회 성공. 실제 Supabase 저장·캐시·원본 대조 및 격리 PostgreSQL 15개 검사가 완료됐고 키별 호출 한도는 계정 정책 확인이 남아 있다.
각 Phase 검증 문서는 당시 실행 증거다. 과거의 미커밋·미구현 표기는 현재 상태를 뜻하지 않는다.
PLAN.md는 승인된 실행 계획, PLAN_planmode.md는 승인 당시 원문 보관본,
PROGRESS.md는 실제 이력, docs/VERIFICATION.md는 AC별 현재 범위다.

## 새 PC에서 실행

Node 22.20.0 / npm 10.9.3 / Git을 준비한다.

```powershell
git clone --branch feat/deployment https://github.com/Yong-jin/vibe_miniproject.git
cd vibe_miniproject
npm ci
$env:DATA_MODE="demo"
npm run dev
```

http://localhost:3000 접속. 실제 표시 주소는 터미널의 Local 값을 따른다.
기존 clone은 미커밋 변경을 보존하고 git fetch origin 후 git switch feat/deployment,
git pull --ff-only를 사용한다. 로컬 브랜치가 없으면 git switch --track origin/feat/deployment.

실데이터는 .env.example을 참고해 새 PC의 .env.local에 KOBIS_API_KEY, SUPABASE_URL, SUPABASE_SECRET_KEY를 별도로 설정한다.
키를 대화나 Git에 넣지 않는다. PowerShell에서 $env:DATA_MODE="live" 후 서버를 재실행한다.
키·로그인·실행 서버·개인 플러그인·Codex 대화 세션은 clone으로 전달되지 않는다.
프로젝트 Skill과 AGENTS.md는 Git에 포함된다. 기존 PC의 절대경로를 재현할 필요는 없다.
현재 PC의 safe.directory는 로컬 설정이며 새 clone에 무조건 추가하지 않는다.

## 재현 검사

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

테스트는 3103 포트에 demo 서버를 자동 시작·종료한다.
배포용 서버는 기존 start 종료 → build → start 순서로 실행한다. 구 서버를 남기면 CSS 참조가 어긋날 수 있다.
node_modules/.next/test-results의 캡처·trace는 Git 제외이며 재실행으로 생성한다.
별도 PC/checkout 재현 자체는 아직 미실행이고 Phase 8의 검증 항목이다.

## 다음 작업과 재개 메시지

다음은 Phase 8 배포·재현성 검증다. 사용자 재개 지시 전 구현하지 않는다.
대상 Supabase 프로젝트, 서버 설정, 격리된 실제 DB 검증 환경이 필요하다.
mock 통과를 실제 DB 검증 완료로 대신하지 않는다.

> AGENTS.md, HANDOFF.md, PROGRESS.md, PLAN.md와 docs/verification/phase-05.md를 읽고 이어서 진행해 주세요. Phase 1~7은 완료됐고 다음은 Phase 8 배포·재현성 검증입니다. 현재 Git 상태와 실행 환경, 대상 Supabase 및 격리 검증 DB 준비 상태를 먼저 확인해 주세요. 승인된 설계와 세 테이블 정규화를 유지하고 Phase 8 범위에서 구현·검증·진행 기록을 남겨 주세요.

## 대화에서 확인한 결정과 설명

1. 사용자는 코드를 먼저 만들지 말고 설계 확인 → AGENTS.md → Plan Mode 계획 승인 → 단계별 구현 순서를 요청했다. 설계 승인만으로 구현까지 승인된 것은 아니다.
2. 사용자는 PRD의 AC가 KOBIS 응답인지 질문했다. AC는 Acceptance Criteria(인수 기준)이며, 브리핑을 바탕으로 정한 우리 프로젝트의 검증 기준이다. AC ID와 내부 API의 HTTP 상태 정책은 KOBIS가 정의한 응답 코드가 아니다.
3. 사용자는 PROGRESS.md가 원래 요구에 포함됐는지 질문했다. 최초 브리핑 8절에 다른 PC에서도 맥락을 이어가기 위한 진행 기록 파일을 요청한 내용이 있다.
4. 최초 설계는 단일 JSONB 스냅샷 캐시였다. 데이터 무결성과 조회 효율을 위해 movies / box_office_periods / box_office_entries로 변경했다. ADR-003은 이력이며 현재 설계는 ADR-009다.
5. 영화와 기간 사이의 N:M을 entries로 연결한다. 기간에 실적이 없더라도 정상 빈 결과를 저장한다. 다중 테이블 저장은 트랜잭션으로 처리한다.
6. KOBIS 공식 상세 문서에서 일간/주간 경로·필수 파라미터·최대 10개·weekGb를 확인했다. 이후 Phase 4에서 실키 일간·주간·주말 조회를 검증했다. Phase 5에서 실제 DB 검증까지 완료했다.
7. 지표는 일별 Top 10 관측 매출이다. 전체 시장 매출이 아니다. 누적값을 날짜별 합산하지 않고, 목록에 없는 영화 매출을 0으로 보지 않는다.
8. 목록에는 공식 일간/주간/주말 API를 사용한다. 인사이트는 최근 7/14/30일 일별 응답을 집계한다. demo는 명시적으로 선택하며 live 장애를 샘플 데이터로 숨기지 않는다.
9. 사용자는 Next.js 초심자이므로 단계마다 App Router·Server/Client Component·Route Handler를 간단히 설명한다. 과도한 추상화는 피한다.
10. 무료 배포는 Vercel Hobby 용도 조건 및 Supabase Free 제한을 배포 시 확인한다. 키·계정·원격 저장소 설정은 Git으로 자동 전달되지 않는다.


이 문서는 대화 결정사항 요약이며 원문 전체나 세션 내보내기 파일은 아니다.
