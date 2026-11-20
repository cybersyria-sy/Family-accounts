"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { useData } from "@/lib/data";
import { Button, Card, Input } from "./ui";

export function Onboarding() {
  const { t } = useI18n();
  const { refresh, selectFamily } = useData();
  const router = useRouter();
  const [famName, setFamName] = useState("");
  const [myName, setMyName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    const { data, error } = await supabase.rpc("create_family", { p_family_name: famName, p_my_name: myName });
    setBusy(false);
    if (error) return setErr(error.message);
    selectFamily(data as string);
    await refresh();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{t("welcome")}</h2>
      <Card>
        <form onSubmit={create} className="space-y-3">
          <h3 className="text-lg font-semibold">{t("startFamily")}</h3>
          <Input label={t("familyName")} required value={famName} onChange={(e) => setFamName(e.target.value)} />
          <Input label={t("yourName")} required value={myName} onChange={(e) => setMyName(e.target.value)} />
          <Button className="w-full" disabled={busy}>{t("create")}</Button>
        </form>
      </Card>
      <Card>
        <form onSubmit={(e) => { e.preventDefault(); router.push(`/join/${encodeURIComponent(code.trim())}`); }} className="space-y-3">
          <h3 className="text-lg font-semibold">{t("orJoin")}</h3>
          <Input label={t("inviteCode")} required dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} />
          <Button variant="ghost" className="w-full">{t("join")}</Button>
        </form>
      </Card>
      {err && <p className="text-red-700">{err}</p>}
    </div>
  );
}
