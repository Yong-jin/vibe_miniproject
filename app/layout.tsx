import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "박스오피스 인사이트", template: "%s | 박스오피스 인사이트" },
  description: "영화 박스오피스 데이터로 배우는 인사이트 대시보드",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <a className="skip-link" href="#main">본문으로 이동</a>
        <header className="site-header">
          <Link className="brand" href="/"><span className="brand-mark" aria-hidden="true">B</span>박스오피스 인사이트</Link>
          <nav aria-label="주요 메뉴">
            <Link href="/">박스오피스</Link>
            <Link href="/insights">인사이트</Link>
          </nav>
        </header>
        <main id="main" tabIndex={-1}>{children}</main>
        <footer>영화 데이터로 배우는 개발 과정 <span>교육용 레퍼런스</span></footer>
      </body>
    </html>
  );
}
