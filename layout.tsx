import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "تقویم هفتگی",
  description: "تقویم شمسی هفتگی با کارت‌های قابل کشیدن و دستیار چت",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
