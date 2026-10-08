import type { Metadata } from "next";
import Insights from "../_components/insights";
import { DEMO_END } from "@/lib/demo";
import { getKstYesterday } from "@/lib/validation";
export const metadata:Metadata={title:"인사이트"};
export const dynamic="force-dynamic";
export default function InsightsPage(){
 const demo=process.env.DATA_MODE==="demo";
 return <><p className="eyebrow">INSIGHTS</p><h1>숫자를 연결하면, 흐름이 보입니다.</h1><p className="intro">일별 Top 10 관측 데이터로 영화 매출과 관객의 변화를 살펴봅니다.</p><Insights demo={demo} end={demo?DEMO_END:getKstYesterday()} /></>;
}
