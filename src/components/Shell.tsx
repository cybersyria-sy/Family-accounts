"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { useData } from "@/lib/data";
import { SignIn } from "./SignIn";
import { Onboarding } from "./Onboarding";

export function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white">
      {lang === "ar" ? "English" : "العربية"}
    </button>
  );
}

/** Wraps every signed-in page: header, sign-in gate, onboarding gate and bottom navigation. */
export function Shell({ children, title, allowNoFamily = false }: { children: ReactNode; title?: string; allowNoFamily?: boolean }) {
  const { t } = useI18n();
  const { session, ready, family, me } = useData();
  const path = usePathname();
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  let body: ReactNode = children;
  if (!configured) body = <p className="p-6 text-center text-stone-600">{t("notConfigured")}</p>;
  else if (!ready) body = <p className="p-6 text-center text-stone-500">{t("loading")}</p>;
  else if (!session) body = <SignIn />;
  else if ((!family || !me) && !allowNoFamily) body = <Onboarding />;

  const showNav = configured && ready && session && family && me;
  const nav = [
    { href: "/", label: t("home"), icon: "⌂" },
    { href: "/add", label: t("add"), icon: "+" },
    { href: "/import", label: t("importNav"), icon: "📷" },
    { href: "/settings", label: t("settings"), icon: "⚙" },
  ];

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-stone-50">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-emerald-800 px-4 py-3 text-white">
        <h1 className="truncate text-lg font-bold">{title ?? family?.name ?? t("appName")}</h1>
        <LangToggle />
      </header>
      <main className="flex-1 p-4 pb-28">{body}</main>
      {showNav && (
        <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-lg border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)]">
          {nav.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href}
                className={`flex flex-1 flex-col items-center py-2 text-sm ${active ? "text-emerald-700 font-bold" : "text-stone-500"}`}>
                <span className={`text-2xl leading-7 ${n.href === "/add" ? "flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-white" : ""}`}>{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
