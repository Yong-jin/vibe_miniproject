import { Client } from "pg";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const url = process.env.TEST_DATABASE_URL;
if (!url || process.env.TEST_DB_ISOLATED !== "true") {
  console.error("미실행: 격리 DB의 TEST_DATABASE_URL 및 TEST_DB_ISOLATED=true가 필요합니다.");
  process.exit(2);
}
const schema = "boxoffice_test_" + randomBytes(6).toString("hex");
const clients = [];
const { createRequire } = await import("node:module");
const { compareRaw } = createRequire(import.meta.url)("../lib/verification.ts");
async function connect() {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 3000, statement_timeout: 8000 });
  await client.connect(); clients.push(client); return client;
}
let admin;
let passed = 0;
async function test(name, run) { await run(); passed++; console.log("PASS " + name); }
function payload(count, date="2026-09-13", at="2026-09-20T00:00:00Z", name="Test") {
  const items=Array.from({length:count},(_,i)=>({movieCd:"99000"+String(i).padStart(3,"0"),movieNm:name+i,openDt:null,rank:i+1,salesAmt:(i+1)*100,audiCnt:i+1,salesAcc:1000,audiAcc:10}));
  const raw={boxOfficeResult:{showRange:date.replaceAll("-","")+"~"+date.replaceAll("-",""),dailyBoxOfficeList:items.map(i=>({...i,openDt:"",rank:String(i.rank),salesAmt:String(i.salesAmt),audiCnt:String(i.audiCnt),salesAcc:String(i.salesAcc),audiAcc:String(i.audiAcc)}))}};
  return {data:{period:"daily",targetDate:date,rangeStart:date,rangeEnd:date,items},rawResponse:raw,fetchedAt:at};
}
const save=(client,p)=>client.query("select "+schema+".save_box_office_period($1::jsonb) result",[JSON.stringify(p)]);
async function read(date="2026-09-13") { return (await admin.query("select "+schema+".read_box_office_period('daily',$1::date) result",[date])).rows[0].result; }
async function rejects(query,code) {
  try { await query; assert.fail("Expected DB rejection"); } catch(error) { assert.equal(error.code,code); }
}
try {
  admin=await connect();
  const roles=(await admin.query("select rolname from pg_roles where rolname in ('anon','authenticated','service_role')")).rows.map(r=>r.rolname);
  if(roles.length!==3) throw new Error("Supabase-compatible roles required; initialize the dedicated local test database first.");
  await admin.query("create schema "+schema);
  await admin.query("grant usage on schema "+schema+" to anon, authenticated, service_role");
  const migration=(await readFile("supabase/migrations/202609200001_box_office.sql","utf8")).replaceAll("public.",schema+".");
  await admin.query(migration);
  await test("서비스 역할 저장·단일 조회",async()=>{
    await admin.query("set role service_role");
    await save(admin,payload(10));
    await admin.query("reset role");
    assert.equal((await read()).items.length,10);
  });
  await test("정수 문자열·TTL 24h",async()=>{
    const r=await read();assert.equal(r.items[0].salesAmt,"100");
    assert.equal(Date.parse(r.expiresAt)-Date.parse(r.fetchedAt),86400000);
  });
  await test("10→8→0 교체·부모 ID 유지·빈 TTL",async()=>{
    const id=(await read()).id;
    await save(admin,payload(8,undefined,"2026-09-20T01:00:00Z"));
    assert.equal((await read()).items.length,8);
    await save(admin,payload(0,undefined,"2026-09-20T02:00:00Z"));
    const r=await read();assert.equal(r.id,id);assert.equal(r.rowCount,0);assert.deepEqual(r.items,[]);
    assert.equal(Date.parse(r.expiresAt)-Date.parse(r.fetchedAt),3600000);
  });
  await save(admin,payload(2,undefined,"2026-09-20T03:00:00Z"));
  await test("실제 DB 수치 변조 원본 대조 검출",async()=>{
    const before=await read();
    const normalized=r=>r.items.map(item=>({...item,...Object.fromEntries(["rank","salesAmt","audiCnt","salesAcc","audiAcc"].map(f=>[f,Number(item[f])]))}));
    const q={period:"daily",targetDate:"2026-09-13",rangeStart:"2026-09-13",rangeEnd:"2026-09-13"};
    assert.equal(compareRaw(before.rawResponse,q,normalized(before)).passed,true);
    await admin.query("update "+schema+".box_office_entries set sales_amt=sales_amt+1 where period_id=$1",[before.id]);
    const after=await read();
    assert.equal(compareRaw(after.rawResponse,q,normalized(after)).passed,false);
    await admin.query("update "+schema+".box_office_entries set sales_amt=sales_amt-1 where period_id=$1",[before.id]);
  });
  await test("없는 영화 FK",async()=>{
    const id=(await read()).id;
    await rejects(admin.query("insert into "+schema+".box_office_entries values($1,'missing',3,1,1,1,1)",[id]),"23503");
  });
  await test("없는 기간 FK",async()=>rejects(admin.query("insert into "+schema+".box_office_entries values(-1,'99000000',3,1,1,1,1)"),"23503"));
  await test("실적 복합 PK 중복",async()=>{
    const id=(await read()).id;
    await rejects(admin.query("insert into "+schema+".box_office_entries values($1,'99000000',3,1,1,1,1)",[id]),"23505");
  });
  await test("기간 UNIQUE 중복",async()=>rejects(admin.query("insert into "+schema+".box_office_periods(period_type,target_date,range_start,range_end,raw_response,row_count,fetched_at,expires_at) select period_type,target_date,range_start,range_end,raw_response,row_count,fetched_at,expires_at from "+schema+".box_office_periods limit 1"),"23505"));
  await test("삭제 후 삽입 실패 전체 롤백",async()=>{
    const before=await read();
    await admin.query("create function "+schema+".fail_insert() returns trigger language plpgsql as $$ begin raise exception 'test injected'; end $$");
    await admin.query("create trigger fail_insert before insert on "+schema+".box_office_entries for each row execute function "+schema+".fail_insert()");
    await rejects(save(admin,payload(1,undefined,"2026-09-20T04:00:00Z","Changed")),"P0001");
    await admin.query("drop trigger fail_insert on "+schema+".box_office_entries");
    assert.deepEqual(await read(),before);
  });
  for(const role of ["anon","authenticated"]) {
    await test(role+" 테이블/RPC 차단",async()=>{
      await admin.query("set role "+role);
      try {
        for(const table of ["movies","box_office_periods","box_office_entries"]) await rejects(admin.query("select * from "+schema+"."+table),"42501");
        await rejects(save(admin,payload(1)),"42501");
        await rejects(admin.query("select "+schema+".read_box_office_period('daily','2026-09-13')"),"42501");
      } finally { await admin.query("reset role"); }
    });
  }
  await test("RLS 활성화",async()=>{
    const rows=(await admin.query("select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=$1 and relname in ('movies','box_office_periods','box_office_entries')",[schema])).rows;
    assert.equal(rows.length,3);assert.ok(rows.every(r=>r.relrowsecurity));
  });
  await test("최초 기간 동시 저장·최신 승리",async()=>{
    const a=await connect(),b=await connect();
    await Promise.all([save(a,payload(1,"2026-09-12","2026-09-20T06:00:00Z")),save(b,payload(2,"2026-09-12","2026-09-20T05:00:00Z"))]);
    assert.equal((await read("2026-09-12")).rowCount,1);
    await save(b,payload(3,"2026-09-12","2026-09-20T04:00:00Z"));
    assert.equal((await read("2026-09-12")).rowCount,1);
  });
  await test("동일 기간 잠금 대기 후 오래된 요청 무시",async()=>{
    const a=await connect(), b=await connect();
    await a.query("begin");
    try {
      await save(a,payload(1,"2026-09-09","2026-09-20T10:00:00Z"));
      const waiting=save(b,payload(2,"2026-09-09","2026-09-20T09:00:00Z"));
      let blocked=false;
      for(let i=0;i<40;i++) {
        const row=(await admin.query("select cardinality(pg_blocking_pids($1)) > 0 blocked",[b.processID])).rows[0];
        if(row.blocked) {blocked=true;break;}
        await new Promise(resolve=>setTimeout(resolve,25));
      }
      assert.equal(blocked,true);
      await a.query("commit");
      await waiting;
      assert.equal((await read("2026-09-09")).rowCount,1);
    } finally { await a.query("rollback"); }
  });
  await test("다른 기간의 영화 기본정보 시간 역전 방지",async()=>{
    const a=await connect(),b=await connect();
    await Promise.all([save(a,payload(1,"2026-09-10","2026-09-20T12:00:00Z","Newest")),save(b,payload(1,"2026-09-11","2026-09-20T11:00:00Z","Older"))]);
    assert.equal((await read("2026-09-11")).items[0].movieNm,"Newest0");
    assert.equal((await read("2026-09-10")).items[0].movieNm,"Newest0");
  });
  console.log("DB tests passed: "+passed);
} catch(error) {
  console.error("DB validation failed. SQLSTATE="+(error.code??"none")+"; credentials and connection details suppressed.");
  process.exitCode=1;
} finally {
  if(admin) { try { await admin.query("reset role"); await admin.query("drop schema "+schema+" cascade"); } catch { console.error("Test schema cleanup needs review: "+schema); } }
  await Promise.allSettled(clients.map(c=>c.end()));
}
