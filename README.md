# 영화 박스오피스 인사이트 대시보드

영화 박스오피스 정보를 조회하고 시각화하는 웹 대시보드입니다.

Phase 1~8 완료. [배포 사이트](https://box-office-insights.vercel.app)에서 확인하세요. 별도 checkout 실행 재현과 production 검증을 마쳤습니다. [배포 가이드](docs/DEPLOYMENT.md)를 확인하세요.

## 다른 PC에서 재개

저장소를 clone한 후 해당 폴더를 열고 [HANDOFF.md](HANDOFF.md)의 시작 메시지를 사용하세요. 설계와 PLAN.md는 승인됐으며 목록·DB 캐시·차트·통합 인수까지 완료했습니다. 현재 배포 상태는 PROGRESS.md를 따르세요.

## 문서

- [AGENTS.md](AGENTS.md): 프로젝트 작업 규칙
- [PROGRESS.md](PROGRESS.md): 진행 상태·승인 이력·다음 작업
- [HANDOFF.md](HANDOFF.md): 대화 결정사항 요약·다른 PC 재개 절차
- [PLAN.md](PLAN.md): 승인된 Phase-Step 구현 계획과 실행 범위
- [PRD.md](PRD.md): 요구사항과 인수 기준
- [ARCHITECTURE.md](ARCHITECTURE.md): 구조와 데이터 흐름
- [ADR.md](ADR.md): 설계 결정 및 변경 이력
- [ERD.md](ERD.md): 정규화 모델·관계·테이블 명세

기술 스택: Next.js App Router, TypeScript, Recharts, Supabase, Vercel.
실행 명령과 설치 절차는 아래를 따릅니다. API 키 및 로컬 인증 정보는 Git에 저장하지 않습니다.

저장소: [Yong-jin/vibe_miniproject](https://github.com/Yong-jin/vibe_miniproject)

- [프로젝트 검증 Skill](.agents/skills/box-office-verification/SKILL.md): 데이터 변경 검증 절차
- [검증 체크리스트](docs/VERIFICATION.md): AC별 시나리오·기대값
- [상세 구현안](docs/IMPLEMENTATION.md): 화면 상태·API 계약·데이터 흐름
- [Phase 1 검증 기록](docs/verification/phase-01.md): 실제 문서 검사 결과

## 로컬 실행 — Phase 3 demo

Node 22.20.0과 npm 10.9.3을 준비하세요. .nvmrc/.node-version과 package-lock.json을 함께 사용합니다.

```powershell
npm ci
$env:DATA_MODE="demo"
npm run dev
```

http://localhost:3000 에서 기본 목록 화면, /insights에서 인사이트 틀을 확인합니다. 목록은 가상 영화 샘플 API를 사용합니다. 실제 외부 API 호출은 없습니다. DATA_MODE를 명시하지 않으면 live로 해석하며 KOBIS_API_KEY가 없으면 설정 안내를 표시합니다. 환경변수 파일 만드는 방법은 아래 「환경변수 설정」을 보세요. 키는 Git에 올리지 않습니다.

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run start
```

dev 서버를 종료한 뒤 같은 포트에서 start를 실행하세요. npm test는 단발 실행입니다.
[Phase 2 검증 기록](docs/verification/phase-02.md)에 36개 테스트와 서버 실행 결과, ESLint 호환성 경고를 기록했습니다.
KOBIS 실연동은 Phase 4에서 완료했습니다. DB·차트 및 배포는 이후 Phase에서 구현했습니다(Phase 8까지 완료).

## 환경변수 설정

`.env.local`은 Git에 올라가지 않으므로 clone한 직후에는 없습니다. 저장소에는 값이 빈 양식 `.env.example`만 있으니 복사해서 만듭니다.

```powershell
Copy-Item .env.example .env.local
```

macOS/Linux는 `cp .env.example .env.local`을 사용합니다. 복사만 해도 `DATA_MODE=demo`가 들어 있어 키 없이 바로 실행됩니다. 값을 바꾼 뒤에는 개발 서버를 Ctrl+C로 종료하고 다시 실행합니다.

| 변수 | 용도 | 값을 구하는 곳 | 필요한 때 |
| --- | --- | --- | --- |
| `DATA_MODE` | `demo`는 가상 샘플, `live`는 실제 KOBIS·DB 사용. 비워 두면 `live`로 동작 | 직접 입력 | 항상 |
| `KOBIS_API_KEY` | KOBIS 영화관입장권통합전산망 API 키(서버 전용) | [KOBIS Open API 포털](https://www.kobis.or.kr/kobisopenapi/homepg/main/main.do)에서 본인 키 발급 | `live` 실행 |
| `SUPABASE_URL` | Supabase 프로젝트 주소(서버 전용) | Supabase 대시보드의 프로젝트 API 설정 | DB 저장·캐시 사용 시 |
| `SUPABASE_SECRET_KEY` | Supabase secret 키(서버 전용). publishable/anon 키는 사용할 수 없음 | Supabase 대시보드의 API 키 화면 | DB 저장·캐시 사용 시 |
| `TEST_DATABASE_URL`, `TEST_DB_ISOLATED` | 격리된 테스트 DB 검증 전용. 운영 DB 연결 금지 | 직접 만든 테스트 DB | DB 검증 테스트를 돌릴 때만 |

- 실제 키는 `.env.local`에만 넣습니다. Git, 채팅, 로그, 문서에 붙여 넣지 않습니다. `.env.example`에는 값을 채우지 않습니다.
- 변수 이름 앞에 `NEXT_PUBLIC_`을 붙이지 않습니다. 붙이면 값이 브라우저에 공개됩니다.
- 위 `$env:DATA_MODE=...` 방식은 PowerShell 창을 닫기 전까지만 적용되는 임시 설정이며, `.env.local`보다 우선합니다.
- 자세한 설정은 [API 연동 가이드](docs/API_GUIDE.md), [DB 연결·검증 가이드](docs/DB_GUIDE.md)를 봅니다.

## Phase 3 시연 및 화면 테스트

- 기본 날짜 2026-09-13, 샘플 기간 2026-09-07~13. 일간/주간/주말을 선택한 후 조회하기.
- 영화명에 “바다” 입력: 원본 순위 2 유지. 없는 제목 입력: 검색 결과 없음.
- 2026-09-06 조회: 정상 빈 결과. 실데이터 부재를 뜻하지 않는 가상 시나리오다.
- 영구 로컬 설정은 .env.local에 DATA_MODE=demo 한 줄을 추가한다. 기존 파일은 덮어쓰지 않는다.
- 설정을 바꾸면 기존 개발 서버에서 Ctrl+C 후 재실행한다.

```powershell
npx playwright install chromium
npm run build
npm run test:e2e
```

화면 테스트는 전용 3103 포트에서 서버를 자동 시작·종료한다. 해당 포트가 사용 중이면 먼저 본인이 실행한 서버를 확인한다.
[Phase 3 검증 기록](docs/verification/phase-03.md): 단위/API 54개·Chromium 8개, 실제 연동과의 구분.
## Phase 4 실데이터 실행

.env.local에 KOBIS_API_KEY를 설정한 뒤(「환경변수 설정」 참고) 기존 서버를 종료하고 실행합니다. 실제 키는 Git/대화에 넣지 않습니다.

```powershell
$env:DATA_MODE="live"
npm run dev
```

실키 일간·주간·주말 조회를 검증했습니다. Phase 5에서 Supabase 캐시 우선 조회를 연결했습니다.
[API 연동 가이드](docs/API_GUIDE.md) · [실연동 검증 기록](docs/verification/phase-04.md)
## Phase 5 완료 상태

DB 저장·캐시·대조 코드와 로컬 실제 PostgreSQL 검증까지 준비했습니다. 대상 Supabase 저장·캐시 재조회·원본 대조까지 통과했습니다.
[DB 연결·검증 가이드](docs/DB_GUIDE.md) · [Phase 5 검증 기록](docs/verification/phase-05.md)
DB 설정이 없거나 장애가 나면 원본 조회와 저장 실패 경고가 표시될 수 있습니다. cache 성공으로 간주하지 않습니다.

## Phase 6 인사이트

`/insights`에서 최근 7/14/30일의 일별 Top 10 관측 매출 추이, 영화별 Top 5/10, 관객 합계와 관객당 매출을 확인합니다. 불완전 기간은 합계·순위를 숨깁니다. demo의 7일은 정상, 14/30일은 빈 날짜 처리를 시연합니다. [Phase 6 검증](docs/verification/phase-06.md).

## 통합 인수 결과

Phase 8까지 완료했습니다. [인수 결과](docs/ACCEPTANCE.md), [통합 검증 증거](docs/verification/phase-07.md), [배포 검증 증거](docs/verification/phase-08.md)를 확인하세요. 배포 URL과 같은 PC의 별도 checkout 재현은 Phase 8에서 검증했습니다.
