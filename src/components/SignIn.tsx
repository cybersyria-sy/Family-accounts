"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { Button, Card, Input } from "./ui";

export function SignIn() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.href },
    });
    setBusy(false);
    if (error) setErr(error.message); else setSent(true);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setErr(error.message);
  };

  return (
    <Card className="mt-8 space-y-4">
      <h2 className="text-xl font-bold">{t("signInTitle")}</h2>
      {!sent ? (
        <form onSubmit={send} className="space-y-4">
          <p className="text-stone-600">{t("signInHelp")}</p>
          <Input label={t("email")} type="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <Button className="w-full" disabled={busy}>{t("sendLink")}</Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <p className="text-stone-600">{t("checkEmail")}</p>
          <Input label={t("code")} inputMode="numeric" dir="ltr" required value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" />
          <Button className="w-full" disabled={busy}>{t("verify")}</Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setSent(false)}>{t("back")}</Button>
        </form>
      )}
      {err && <p className="text-red-700">{err}</p>}
    </Card>
  );
}
