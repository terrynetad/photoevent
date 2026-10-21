import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PhotoEvent｜攝影活動資訊平台",
  description: "依日期、Model、主題與服裝探索攝影活動。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}