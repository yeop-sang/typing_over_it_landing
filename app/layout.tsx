import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Typing Over It — 코딩 습관에 자막을 답니다.",
  description:
    "VS Code처럼 생긴 웹 IDE에서 타이핑 패턴을 감지하고, Getting Over It식 KO/EN 자막 오버레이를 띄우는 데모입니다.",
  openGraph: {
    title: "Typing Over It",
    description: "Fake IDE. Real typing patterns. Weird subtitles."
  }
};

export const viewport: Viewport = {
  themeColor: "#0d1117",
  colorScheme: "dark"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
