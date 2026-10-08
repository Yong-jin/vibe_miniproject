# Phase 8 검증 기록 — 완료

2026-09-21 · feat/deployment · 배포 기준 0958fd6.

| 항목 | 결과 |
| --- | --- |
| Git clean 시작 | 확인 |
| Node/npm | 22.20.0 / 10.9.3 |
| Vercel CLI | 50.39.0, whoami invalid token |
| 새 checkout | test-results/phase8-repro, 0958fd6 일치 |
| npm ci | 445 packages 설치, audit0 |
| npm run build | 통과 |
| npm run start | production3105 실행 성공 |
| 브라우저 smoke | 목록10행·인사이트 정상7/빈0/실패0 |
| 비밀키 없는 demo | 새 checkout .env.local 없음 |
| 실제 배포 URL | 미실행: 로그인·대상·용도 확인 대기 |
| 배포 URL live/캐시/차트 | 미실행 |
| Supabase 현재 사용량/플랜 | 대시보드 확인 대기; Phase7 실연동 성공 증거 있음 |

별도 checkout은 동일 PC에서 수행했다. 상위 lockfile 무시 경고가 있었지만 복제 저장소의 lockfile로 설치하고 빌드했다. 별도 물리 PC 검사는 아니다. 검증 서버는 종료했다. AC12는 재현 부분 완료, 배포 URL 검증 전이므로 여전히 부분 완료다.

## 배포 완료 — 2026-09-21

사용자가 개인 비상업적 학습·시연용, 개인 계정 새 프로젝트 및 해당 프로젝트 Production 비밀키 등록을 명시적으로 승인했다. 초기 자동 승인 검토에서 키 전송이 차단됐으며 사용자 승인 후 재실행 성공했다.

- 계정/프로젝트: yong-jins-projects/box-office-insights
- URL: https://box-office-insights.vercel.app
- deployment: dpl_4YWTewX4ciRfx2kqG1XpFLE5Popa (READY, production)
- 코드 기준: 0958fd6; 배포 준비 문서와 .vercelignore는 로컬 변경 포함. 앱 코드는 해당 커밋과 동일.
- Next.js preset, Node22.x, npm ci, npm run build. 원격 빌드 성공, audit0.
- 환경변수4개 등록. 두 비밀키는 sensitive로 저장. .env.local/테스트 산출물은 업로드 제외.

실제 Chromium: 목록10행·검색 통과, 주간/주말 stored/passed 경고0. 2026-09-12 일간 최초 kobis/stored/passed → cache/stored/passed, fetchedAt 2026-09-21T09:02:40.692Z 동일. 잘못된 날짜400. 인사이트 정상7/빈0/실패0, 합계 표시. 페이지 오류0, 실제 브라우저 응답·번들 비밀키 검출0. 장애 재시도는 Phase7 mock/E2E 증거를 유지하며 원격 장애를 유발하지 않았다.

test-results/phase8-production.json 및 phase8-production.png에 로컬 증거 저장(Git 제외). Supabase 활성 상태는 실제 저장/조회로 확인했으며 계정 플랜·잔여 용량 대시보드 수치는 직접 확인하지 못했다. 이 항목은 배포 전 운영 확인 사항이다. AC12 별도 checkout 및 실제 URL smoke 통과, Phase8 완료. 최종 문서·배포 제외 설정은 아직 미커밋·미푸시.
