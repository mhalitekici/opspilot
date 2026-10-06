import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpsPilot — Daha az tekrar, daha çok büyüme",
  description: "Küçük ve orta ölçekli işletmeler için iş akışı otomasyonu, AI destekli süreçler ve veri entegrasyonu. OpsPilot bir demo projesidir.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body>{children}</body></html>;
}
