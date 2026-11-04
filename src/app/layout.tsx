import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Рейс — автоматизация транспортной компании",
  description: "Документы, прибыль по рейсам, дебиторка и отчёт в Telegram",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
