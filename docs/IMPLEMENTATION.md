# 상세 구현안

상태: Phase 1 문서 산출물. 아래는 앞으로 구현할 계약이며 앱·SQL 구현 결과가 아니다.
기준: [PRD](../PRD.md), [아키텍처](../ARCHITECTURE.md), [ERD](../ERD.md), [계획](../PLAN.md). 검증 사례는 [VERIFICATION.md](VERIFICATION.md)에 둔다.

## 1. 화면·실행 환경의 책임

| 구성 | 책임 | 경계 |
| --- | --- | --- |
| app/layout.tsx 및 페이지 | 한국어 문서·공통 탐색·화면 틀 | 기본 Server Component; 키를 props에 넣지 않음 |
| app/_components의 목록·필터 | 입력 상태·조회·검색·로딩·오류 | Client Component; 내부 API만 호출 |
| 인사이트와 차트 | 날짜별 수집·진행률·집계 결과 시각화 | Client Component; 날짜별 동시 요청 최대 2 |
| app/api/box-office/route.ts | 입력 검사·조회 함수 호출·HTTP 응답 매핑 | raw_response와 서버 키는 반환하지 않음 |
| lib/validation.ts 및 types.ts | 날짜·기간 계약, 공용 DTO | 비밀값이나 서버 클라이언트를 import하지 않음 |
| lib/kobis.ts | 요청 구성·timeout·오류/숫자/응답 검사 | 서버 전용 |
| lib/supabase.ts 및 box-office.ts | DB 접근·캐시·원본 대조·폴백 | 서버 전용; DB 키의 NEXT_PUBLIC 접두사 금지 |
| lib/metrics.ts | 입력을 바꾸지 않는 순수 집계 | 외부 I/O 없음; 단위 테스트 대상 |
| DB 함수 | 한 트랜잭션 저장, 일관된 조회 | 호출 권한은 서버 역할에 한정 |

App Router는 파일과 URL을 연결한다. Server Component는 서버에서 화면 틀을 구성하고, Client Component는 입력·브라우저 상태를 다룬다. Route Handler는 HTML 페이지 대신 JSON을 반환하는 서버 진입점이다. 사용자에게 표시할 정보만 서버/클라이언트 경계를 넘긴다.

## 2. 화면 상태와 전환

### 목록 /

live 초기 날짜는 KST 어제, 기간은 daily다. demo는 고정 fixture 마지막 날짜를 기본으로 사용하며 샘플 날짜 범위를 안내한다. 입력을 선택하고 조회 버튼으로 요청을 확정한다. 검색은 현재 결과 안에서 trim한 문자열로 부분 검색하며 요청을 추가 발생시키지 않는다. 검색어가 비면 전체 결과를 보여준다.

| 상태 | 표시 | 다음 동작 |
| --- | --- | --- |
| loading | 선택한 날짜·기간, 로딩 안내 | 이전 요청 결과가 새 결과를 덮지 못하게 취소/무시 |
| success | 실제 기간·원본 순위·영화명·개봉일·매출·관객·누적 관객 | 검색·기간 변경 |
| empty | 해당 기간 제공 데이터 없음 | 날짜 변경 |
| search-empty | 검색 조건에 맞는 영화 없음 | 검색어 수정/초기화; 원본 empty와 구분 |
| error | 서버에서 정제한 안내 | retryable이면 재시도, 아니면 입력·설정 안내 |
| success/empty + warning | 데이터와 출처·수집 시각·경고 | 오래된 캐시·저장/검증 미완료를 알림 |

warning은 별도의 빈 데이터 상태가 아니다. 날짜 변경 시 이전 표를 새 날짜의 데이터로 보여주지 않는다. 오래된 캐시가 정상 빈 결과인 경우에도 empty와 stale 안내를 함께 표시한다. 개봉일 null은 —로 표시한다.

### 인사이트 /insights

live 종료일 기본값은 어제, 최근 일수 7(7/14/30), 순위 Top 5(5/10)다. demo는 고정 fixture 마지막 날을 종료일로 삼는다. 최대 30개의 날짜별 내부 요청을 최대 2개씩 진행하고, 조건 변경 시 진행 중 요청과 늦게 온 결과를 취소/무시한다.

정상 데이터가 있는 날짜, 정상 빈 날짜, 실패 날짜, 아직 조회 중인 날짜를 별도로 센다. 모든 날짜가 정상 비어 있지 않은 결과일 때만 기간 합계·순위를 표시한다. 빈/실패 날짜는 라인 데이터의 null로 두고 연결하지 않는다. 확보된 일별 추이와 날짜별 상태는 표시한다. stale 데이터는 관측값으로 사용할 수 있지만 관련 경고와 날짜를 표시한다. 정상 빈 결과를 재요청해도 빈 캐시를 강제로 무시하지 않는다. 실패 날짜만 재시도한다.

line: 일별 관측 매출 합계. bar: movieCd별 기간 salesAmt 합계. 보조 지표: 관측 audiCnt 합계와 매출/관객(분모 0 이하는 —). 합산 전후 안전 정수를 검사하고, 표시용 억원·천명 변환은 마지막에 한다. Top 10 이탈은 0이 아니며 기간 관측 합계가 전체 흥행 실적은 아니다.

## 3. 내부 API 계약

GET /api/box-office?date=YYYY-MM-DD&period=daily|weekly|weekend

두 파라미터는 필수이며 중복 또는 미지원 파라미터는 400이다. 날짜 문자열·실제 달력·KST 어제 이하를 검사한다. weekly/weekend는 해당 주 월요일로 targetDate를 정규화하고 종료일이 KST 어제 이하인지 확인한다. 브라우저 편의 검사와 별개로 서버가 같은 규칙을 적용한다. 원본 showRange와 기대 기간이 다르면 정상 데이터로 저장하지 않는다.

### 성공 DTO — 200

| 필드 | 타입/값 | 의미 |
| --- | --- | --- |
| data.status | success 또는 empty | items 길이와 일치 |
| data.period | daily/weekly/weekend | 요청 유형 |
| data.targetDate | YYYY-MM-DD | 정규화된 캐시 기준일 |
| data.rangeStart, rangeEnd | YYYY-MM-DD | 검증된 실제 기간 |
| data.items | BoxOfficeItem 배열, 0~10개 | rank 오름차순 표시 |
| meta.source | cache/kobis/demo | 이번 응답 데이터 출처 |
| meta.fetchedAt | UTC ISO 문자열 | 원본 수집 시작 시각; demo도 고정 시각 사용 |
| meta.stale | boolean | 만료 캐시 사용 여부 |
| meta.persistence | stored/failed/not-attempted | 저장 상태; cache는 stored, demo는 not-attempted |
| meta.verification | passed/failed/pending | 저장본 대조 결과; demo 및 저장 미시도는 pending |
| meta.warnings | 코드·message 객체 배열 | 사용자에게 필요한 경고만 전달 |

BoxOfficeItem: movieCd(text), movieNm(text), openDt(날짜 또는 null), rank(1~10 정수), salesAmt/audiCnt/salesAcc/audiAcc(안전한 정수). DB 컬럼명은 snake_case, 내부 JSON은 camelCase로 변환한다. DB bigint ID는 문자열로 다루며 공개 응답에는 필요 없으므로 넣지 않는다. BigInt를 JSON으로 직접 직렬화하지 않는다. 원본 숫자 문자열을 손실 없이 확인한 뒤 안전 범위 안에서만 Number로 변환한다.

pending을 항상 오류 배너로 표시하지 않는다. demo의 not-attempted/pending은 샘플 배지로 설명한다. live의 저장 실패·재조회 실패는 명시적 warning으로 안내한다.

### 오류 DTO와 우선순위

error: code(text), message(한국어), retryable(boolean). 입력 오류만 선택적으로 fieldErrors(date/period/query의 안내 문자열)를 포함한다. 외부 응답 원문·스택·key URL·DB 내부 오류는 공개 응답에 넣지 않는다.

| 조건 | HTTP / 내부 code | retryable |
| --- | --- | --- |
| 날짜·기간·파라미터 오류 | 400 / INVALID_REQUEST | false |
| live 설정 누락/잘못된 DATA_MODE | 503 / CONFIGURATION_ERROR | false |
| DB는 사용 가능하지만 외부 HTTP/본문/형식 실패, 유효 대체 캐시 없음 | 502 / UPSTREAM_ERROR | true; 키 오류처럼 설정 수정 필요 시 false |
| 같은 조건에서 KOBIS timeout | 504 / UPSTREAM_TIMEOUT | true |
| DB 읽기와 외부 조회가 모두 실패 | 503 / DATA_UNAVAILABLE | true |
| 분류되지 않은 내부 오류 | 500 / INTERNAL_ERROR | false |

위 code는 프로젝트 내부 분류이며 KOBIS 오류 코드가 아니다. API 원본의 오류 코드는 Phase 4 실응답과 문서로 확인해 내부 code에 매핑한다. 정상 빈 결과는 200이다. 사용 가능한 stale 캐시 또는 검증된 원본이 있으면 데이터+warnings를 우선 반환한다. 과거 캐시 무결성이 깨졌다면 stale 폴백에도 사용하지 않는다.

응답과 외부 fetch의 캐시는 명시적으로 제어하고 HTTP/Next.js 캐시가 Supabase TTL을 가리지 않게 한다. 원본 응답 JSON은 서버/DB에만 남긴다.

## 4. 캐시·저장 처리 순서

1. 입력과 실행 모드를 검증한다. demo는 fixture만 반환하며 외부 API·DB 호출 0회다. DATA_MODE 미설정은 live로 해석하고 live 필수 설정 누락은 구성 오류로 처리한다.
2. Phase 4의 중간 구현은 KOBIS 설정만으로 직접 조회하고 persistence=not-attempted, verification=pending으로 반환한다. 아래는 Phase 5 이후 최종 경로다. live는 DB를 먼저 읽고 raw_response 대비 코드·순위·수치·행 수·합계의 무결성을 확인한다. 최신 관측 이름 차이는 정보로 분리한다. 유효 캐시는 바로 반환한다.
3. 만료/미존재/손상 캐시 또는 DB 읽기 장애면 KOBIS를 호출한다. 실패 시 읽어둔 무결한 만료 캐시가 있으면 stale로 반환한다. DB가 내려간 상태에서 읽지 못한 캐시를 가정하지 않는다.
4. 원본 구조와 숫자를 검증한 뒤 저장 DB 함수를 한 번 호출한다. 영화·기간·실적 교체의 원자성·동시성은 ERD의 규칙을 그대로 따른다. 외부 요청 시작 시각을 일관되게 사용한다.
5. 저장 후 단일 조회로 동일 버전의 원본/실적을 대조한다. 더 최신 저장이 선행하면 현재 저장본 자체의 무결성을 검사한다. 비교용 원본을 다른 시각의 응답으로 섞지 않는다.
6. 저장 실패는 원본+persistence failed, 재조회 실패는 원본+verification pending, 불일치는 원본+verification failed 및 warning이다. timeout이면 서버 응답 이후 DB가 커밋했을 수 있어 경고는 저장 확인 실패로 표현한다. 다음 조회로 확인한다.

정상 TTL 24시간, 정상 빈 결과 1시간. now>=expiresAt이면 만료다. DB 작업별 timeout 3초, KOBIS 5초와 전체 요청 20초 예산을 함께 적용한다. 오류 응답은 빈 캐시로 저장하지 않으며 서버 자동 재시도는 없다.

## 5. 검증과 제품 기능의 경계

원본 읽기 대조 명령은 저장된 raw_response 대비 무결성과 새 원본 대비 차이를 따로 보고한다. 반환 항목은 기간, 양쪽 수집 시각, 누락/추가 영화 코드, 다른 필드와 합계다. 차이를 발견해도 자동 갱신하지 않는다. 정상 서비스 TTL 갱신은 캐시 정책에 따른 저장이며 이 읽기 전용 명령과 구분한다.

외부 장애·변조·DB 실패 시연은 mock 또는 격리 테스트에서 수행한다. 운영 API에 force-refresh, fail, skip-validation 같은 파라미터를 추가하지 않는다. 인증 우회·실키 출력 없이도 실패→수정→재검증 과정을 보여줄 수 있게 한다.

현재 UI/테스트 도구 버전은 Phase 2에서 고정한다. 실제 KOBIS 계약과 DB 권한·직렬화의 검증은 Phase 4~5의 완료 조건이며 이 문서만으로 완료되지 않는다.
