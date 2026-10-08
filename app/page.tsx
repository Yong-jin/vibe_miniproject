import BoxOffice from "./_components/box-office";
import { DEMO_END } from "@/lib/demo";
import { getKstYesterday } from "@/lib/validation";

export const dynamic = "force-dynamic";
export default function BoxOfficePage() {
  const demo = process.env.DATA_MODE === "demo";
  return <>
    <p className="eyebrow">BOX OFFICE</p>
    <h1>오늘의 영화, 데이터로 읽다.</h1>
    <p className="intro">날짜별 영화 순위와 매출, 관객의 흐름을 한곳에서 살펴봅니다.</p>
    <BoxOffice demo={demo} initialDate={demo ? DEMO_END : getKstYesterday()} maxDate={getKstYesterday()} />
  </>;
}
