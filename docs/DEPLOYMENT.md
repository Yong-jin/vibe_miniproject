# 배포와 다른 PC 재현

## 현재 상태

Phase 8 완료. 배포 URL: https://box-office-insights.vercel.app

프로젝트 yong-jins-projects/box-office-insights, deployment dpl_4YWTewX4ciRfx2kqG1XpFLE5Popa. 코드 0958fd6 기준, 앱 변경 없음. 개인 비상업적 용도와 환경변수 등록 승인 후 CLI production 배포·실URL 검사 통과. 상세 [Phase8](verification/phase-08.md).

## 확인한 무료 조건 (2026-09-21)

[Vercel Hobby](https://vercel.com/docs/plans/hobby)는 개인 비상업적 용도로 제한된다. 개인 프로젝트라는 이유만으로 상업적 이용이 허용된다고 가정하지 않는다. [Supabase Free](https://supabase.com/pricing)는 프로젝트 DB 500MB이며 [7일간 활동이 적으면 중지될 수 있다](https://supabase.com/docs/guides/platform/free-project-pausing). 배포 전 대시보드에서 활성 상태·용량·사용량을 확인한다. 자동 keep-alive/cron은 추가하지 않는다.

## Vercel 설정 절차

1. `vercel login`으로 사용자 계정 인증. 토큰을 Git/채팅에 넣지 않는다.
2. 사용할 계정/팀과 대상 프로젝트를 확정한다. Framework Preset은 Next.js, Root Directory는 저장소 루트, Node는 22.x. 로컬 재현은 22.20.0이지만 호스팅 patch 버전은 플랫폼 관리임을 구분한다.
3. Install `npm ci`, Build `npm run build`, Output은 Next.js 기본값을 사용한다. [공식 빌드 설정](https://vercel.com/docs/builds/configure-a-build).
4. Production 환경변수에 DATA_MODE=live, KOBIS_API_KEY, SUPABASE_URL, SUPABASE_SECRET_KEY를 설정한다. NEXT_PUBLIC_ 접두사를 붙이지 않는다. 테스트 DB 변수는 배포하지 않는다. Supabase migration은 이미 적용됐으므로 배포 빌드에서 재실행하지 않는다.
5. Git 연동 시 main은 초기 설계 상태다. 배포할 구현 커밋/브랜치를 명시하고 잘못된 main 자동 배포를 피한다. CLI 게시 시 대상 프로젝트 연결과 업로드 파일 제외(.env.local 등)를 먼저 확인한다.
6. 배포 URL에서 목록·검색·일간/주간/주말·인사이트·캐시 재조회·잘못된 요청400을 확인한다. 실제 키/DB를 사용한 결과만 live로 기록한다. 장애 재현은 기존 mock/격리 테스트를 사용한다.

환경변수를 변경한 경우 새 배포가 필요하다. 기존 성공 배포를 되돌릴 때는 Vercel 이전 deployment로 rollback하고 DB migration은 자동 역적용하지 않는다. 키 노출 시 해당 제공자에서 교체 후 환경변수와 배포를 갱신한다.

## 다른 PC

```powershell
git clone --branch <배포용 최종 브랜치> https://github.com/Yong-jin/vibe_miniproject.git   # 브랜치명 예: feat/deployment
cd vibe_miniproject
node --version
npm --version
npm ci
$env:DATA_MODE="demo"
npm run build
npm run start
```

배포용 최종 브랜치(예: feat/deployment)는 Phase 8 배포·검증 문서를 포함한다. Node22.20.0/npm10.9.3 사용. http://localhost:3000 과 /insights 확인. 개발 중에는 `npm run dev`. 서버 종료는 실행 터미널 Ctrl+C.

live는 .env.example을 참고하여 새 PC .env.local에 세 연결 값을 직접 설정한 뒤 DATA_MODE=live로 서버를 재시작한다. GitHub clone은 비밀키·로그인·node_modules·.next를 전달하지 않는다. AGENTS.md→PROGRESS.md→HANDOFF.md 순서로 재개한다.

## 실제 재현 증거

동일 PC의 별도 checkout test-results/phase8-repro에서 0958fd6를 no-hardlinks clone했다. 기존 node_modules/.env.local 없이 npm ci(445 packages, audit0)·build·start 성공. 실제 Chromium에서 목록10행/인사이트 정상7일 확인. 환경변수 파일 없음 확인. 다른 물리 PC/운영체제에서의 검증으로 확대 해석하지 않는다. 저장소 내부 복제라 상위 lockfile 무시 경고가 있었으나 빌드·실행은 통과했다. 검증 서버3105는 중지했다.
