# KOBIS API 연동 가이드 — Phase 4

## 설정과 실행

공식 [KOBIS Open API 포털](https://www.kobis.or.kr/kobisopenapi/homepg/main/main.do)에서 본인 키를 발급받는다.
프로젝트 .env.local에 KOBIS_API_KEY를 설정한다. 실제 값은 대화·Git·로그에 복사하지 않는다. .env.example에는 빈 값만 유지한다.
DATA_MODE=live를 설정한다. 미설정도 live이며 demo는 명시적으로 선택한 경우에만 샘플을 사용한다.

PowerShell:
```powershell
$env:DATA_MODE="live"
npm run dev
```

http://localhost:3000 으로 접속한다. 이미 실행한 서버는 Ctrl+C로 종료한 뒤 재시작한다.
배포용 실행은 기존 start 서버 종료 → npm run build → npm run start 순서다. 실행 중인 build 산출물을 교체한 채 옛 서버를 남겨두면 CSS URL이 어긋날 수 있다.

## 요청 계약

브라우저는 GET /api/box-office?date=YYYY-MM-DD&period=daily|weekly|weekend만 호출한다.
서버가 https://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/ 아래 API를 호출한다.

| 기간 | API 주소 (끝부분) | 파라미터 |
| --- | --- | --- |
| daily | searchDailyBoxOfficeList.json | targetDt=YYYYMMDD, itemPerPage=10 |
| weekly | searchWeeklyBoxOfficeList.json | 해당 주 월요일 targetDt, weekGb=0, itemPerPage=10 |
| weekend | searchWeeklyBoxOfficeList.json | 해당 주 월요일 targetDt, weekGb=1, itemPerPage=10 |

key는 서버에서만 추가한다. HTTPS만 허용하고 redirect:error로 키가 다른 주소로 전달되는 것을 막는다.
2026-09-18 [공식 제공서비스](https://www.kobis.or.kr/kobisopenapi/homepg/apiservice/searchServiceInfo.do)의 일별/주간 상세를 POST searchServiceDesc.do로 재확인했다. 공개 예시 키는 사용하지 않았다.

성공은 data(status, period, targetDate, rangeStart, rangeEnd, items)와 meta(source, fetchedAt, stale, persistence, verification, warnings)다.
Phase 4의 live 출처는 kobis, persistence=not-attempted, verification=pending이다. 저장·캐시 연결 전 안내를 표시하며 DB 저장 성공이라고 표현하지 않는다.
숫자 문자열은 안전 정수로 검증하고 원본 순위를 유지한다. 음수 관측치는 임의로 0으로 바꾸지 않는다. 개봉일 빈 문자열은 null이다.
실제 showRange와 기대 기간이 다르거나 필수 리스트/필드가 없으면 실패다. 정상 빈 배열만 empty 성공이다.

## 오류와 호출 정책

| 조건 | HTTP / code |
| --- | --- |
| 날짜·기간·필수/중복/미지원 파라미터 | 400 INVALID_REQUEST |
| 키 누락 또는 잘못된 DATA_MODE | 503 CONFIGURATION_ERROR |
| 외부 HTTP/네트워크/JSON/기간·필드 오류 | 502 UPSTREAM_ERROR |
| 응답 본문 처리 포함 5초 초과 | 504 UPSTREAM_TIMEOUT |
| 예상하지 못한 내부 오류 | 500 INTERNAL_ERROR |

faultInfo 오류 본문은 정상 빈 결과로 처리하지 않는다. 세부 원본 메시지는 노출하지 않고 키/한도 확인을 안내한다.
faultInfo는 원인별 코드 명세를 추가 확인하기 전 재시도 불가로 보수적으로 처리한다. HTTP 401/403도 재시도 불가, 그 밖의 통신 오류는 수동 재시도 가능하다.
fetch 예외·원본 URL·본문·키를 로그에 남기지 않는다. 자동 재시도·폴링·백필 없음. 현재 조회 1회당 KOBIS 요청 최대 1회.
실키 검사에서는 4회만 호출했다. 키별 일일 한도 숫자는 계정 발급 정책 화면을 확인하지 못했으므로 보장하지 않는다. 이후 운영/배포 전 포털에서 확인한다.
캐시/DB 폴백과 20초 전체 DB 요청 예산은 Phase 5에서 적용한다. Phase 4 서버 외부 작업은 단일 5초 요청뿐이다.

## 검증

npm test는 가상 원본 fixture와 mock으로 장애를 재현하며 실제 API를 호출하지 않는다.
npm run build 후 npm run test:e2e는 demo 서버로 화면을 검증한다.
실키 검사는 브라우저 또는 위 내부 API에 일간/주간/주말 소수 요청으로 수행한다. 오류 유발 목적으로 원본에 대량 호출하지 않는다.
결과와 미실행 범위는 [Phase 4 검증 기록](verification/phase-04.md)을 따른다.
