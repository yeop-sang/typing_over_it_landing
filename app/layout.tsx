import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Typing Over It — 코드를 치세요. 앱이 놀립니다.",
  description:
    "VS Code 다크 테마 느낌의 장난스러운 웹 랜딩. 패닉 타이핑, 백스페이스, 침묵을 감지해 한국어 자막으로 놀립니다.",
  metadataBase: new URL("https://typing-over-it.vercel.app"),
  openGraph: {
    title: "Typing Over It",
    description: "코드를 치세요. 앱이 조용히 상처 줍니다.",
    images: ["/assets/hero-ide.png"]
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
