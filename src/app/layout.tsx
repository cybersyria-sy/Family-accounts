import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { DataProvider } from "@/lib/data";
import { UndoProvider } from "@/lib/undo";

export const metadata: Metadata = {
  title: "حسابات العائلة · Family Accounts",
  description: "Track what family members lend and borrow, in any currency, gold, silver or shares.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Family Accounts" },
};

export const viewport: Viewport = { themeColor: "#065f46", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-stone-100 text-stone-900 antialiased">
        <I18nProvider>
          <DataProvider><UndoProvider>{children}</UndoProvider></DataProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
