# Phase 5 DB 연결·검증 가이드

상태: 코드 및 로컬 PostgreSQL 검증 완료, 대상 Supabase 실연동 대기.
[ERD](../ERD.md)의 세 테이블과 [migration](../supabase/migrations/202609200001_box_office.sql)을 사용한다.

## Supabase 설정

1. 이 프로젝트 전용 Supabase 프로젝트를 준비한다. 이미 사용 중인 DB는 기존 테이블과 권한 충돌을 먼저 확인한다.
2. SQL Editor에서 migration 파일 전체를 한 번 실행한다. BEGIN/COMMIT으로 감싸며 기존 데이터 삭제나 reset은 하지 않는다. 이미 적용한 초기 migration은 재실행하지 않는다.
3. .env.local에 SUPABASE_URL, SUPABASE_SECRET_KEY를 설정한다. secret 키 또는 legacy service_role 키를 사용하며 publishable/anon 키는 사용할 수 없다.
4. DATA_MODE=live로 서버를 재시작한다. 실제 키와 DB 접속 문자열은 채팅이나 Git에 넣지 않는다.

서버는 /rest/v1/rpc/read_box_office_period 및 save_box_office_period 두 RPC만 사용한다.
새 sb_secret_ 키는 apikey 헤더, legacy JWT는 apikey 및 Authorization 헤더에 전달한다.
이 프로젝트는 단순한 fetch를 사용하므로 별도 ORM·Supabase 클라이언트 상태 계층은 없다.
[Supabase 키 안내](https://supabase.com/docs/guides/getting-started/api-keys), [DB 함수·실행권한](https://supabase.com/docs/guides/database/functions).

## 동작 확인

같은 완료된 날짜를 두 번 조회한다.
- 최초: source=kobis, persistence=stored, verification=passed
- 다음: source=cache, verification=passed, KOBIS 호출 0회
- 정상 빈 기간: 부모 1행·실적0행, TTL1시간. 일반 결과 TTL24시간.
- DB 읽기 실패: KOBIS 직접 조회+경고. 저장 실패: 원본 표시+failed.
- 원본 실패: 검증된 만료 캐시만 stale로 표시. 양쪽 실패: 503.
- 불일치 캐시는 재사용하지 않는다. 저장 후 더 최신 버전이 있으면 그 raw/행끼리 검증한다.
- DB 작업별3초, KOBIS5초, 전체20초. 자동 재시도 없음. 요청 시간 제한 후 커밋 여부가 불확실하면 저장 확인 실패로 안내한다.

캐시 화면은 관계형 JOIN 결과다. 원본 JSON은 대조에만 사용한다.
영화명은 최신 관측 기본정보라 과거 원본과 다를 수 있고, 수치 불일치와 별도로 보고한다.
조회 중 병렬 갱신은 기간별 advisory transaction lock과 fetched_at 비교로 보호한다.

## 격리 실제 DB 테스트

운영 DB가 아닌 전용 검증 DB가 필요하다. TEST_DB_ISOLATED=true는 사용자가 격리 환경을 확인했다는 표시다.
테스트는 boxoffice_test_랜덤 스키마만 만들고 마지막에 해당 스키마만 정리한다. reset/TRUNCATE 또는 운영 데이터 삭제는 하지 않는다.
anon/authenticated/service_role 역할이 있어야 한다. Supabase에는 기본으로 있고, 로컬 vanilla PostgreSQL에는 아래처럼 준비한다.

이번 검증 컨테이너는 box-office-phase5-test, localhost:55432, DB boxoffice_test였다.
PostgreSQL17.11, 이미지 postgres:17-alpine의 확인된 digest:
sha256:f02121de6f74d30d8a94cd1d9584125e2178d7e6c377d8130112d4e52d867995

새 PC의 Docker Desktop에서 최초 준비:
```powershell
docker run --detach --name box-office-phase5-test --publish 127.0.0.1:55432:5432 --env POSTGRES_HOST_AUTH_METHOD=trust --env POSTGRES_DB=boxoffice_test postgres@sha256:f02121de6f74d30d8a94cd1d9584125e2178d7e6c377d8130112d4e52d867995
docker exec box-office-phase5-test psql -U postgres -d boxoffice_test -v ON_ERROR_STOP=1 -c "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;"
```

위 trust 설정은 127.0.0.1에만 노출하는 임시 로컬 테스트용이다. 원격 DB에 사용하지 않는다.
이미 같은 컨테이너를 만든 경우 docker start box-office-phase5-test로 시작하고 역할 생성은 반복하지 않는다.

```powershell
$env:TEST_DATABASE_URL="postgresql://postgres@127.0.0.1:55432/boxoffice_test"
$env:TEST_DB_ISOLATED="true"
npm run test:db
docker stop box-office-phase5-test
```

실제 PostgreSQL의 FK·UNIQUE·RLS·실행권한·저장 실패 전체 롤백·동시 잠금·10→8→0 교체·원본 대조를 검사한다.
테스트는 migration의 public 스키마 참조만 전용 테스트 스키마로 바꿔 적용한다. Supabase HTTP gateway/키 인증 성공을 대신하지 않는다.

## 읽기 전용 원본 대조

```powershell
npm run verify:data -- --date=2026-09-13 --period=daily
```

저장본을 읽은 뒤 KOBIS를 한 번 조회한다. 자체 raw 대비 무결성과 새 원본 대비 차이를 분리하고, 수집 시각·차이를 보고한다.
자동 수정·갱신·캐시 쓰기는 없다. 미수집은 exit2, 대조 차이나 설정/통신 실패는 exit1, 일치는 exit0.
독립 대조 함수는 KOBIS 파서를 재사용하지 않는다. 원본·저장 합계는 BigInt로 계산하여 안전 범위 밖 합계도 반올림하지 않는다.

## 실연동 확인 결과

2026-09-20 사용자 migration 적용 후 PostgREST 인증, 최초 저장→캐시 재조회(외부 호출 0회), 실제 원본 대조 및 키 비노출 검사 통과. 상세 증거는 [Phase 5](verification/phase-05.md)를 참조한다.
