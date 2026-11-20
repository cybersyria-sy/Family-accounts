"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Button, Card, Chip, Input } from "@/components/ui";
import { useData } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

type Preview = { id: string; name: string; unclaimed: { id: string; name: string }[] } | null;

export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { t } = useI18n();
  return <Shell title={t("joinTitle")} allowNoFamily><JoinBody code={decodeURIComponent(code)} /></Shell>;
}

function JoinBody({ code }: { code: string }) {
  const { t } = useI18n();
  const { refresh, selectFamily, families } = useData();
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | undefined>(undefined);
  const [claim, setClaim] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    supabase.rpc("preview_family", { p_code: code }).then(({ data }) => setPreview((data as Preview) ?? null));
  }, [code]);

  const alreadyMember = !!preview && families.some((f) => f.id === preview.id);
  useEffect(() => {
    if (alreadyMember && preview) { selectFamily(preview.id); router.replace("/"); }
  }, [alreadyMember, preview, selectFamily, router]);

  if (preview === undefined) return <p className="text-stone-500">{t("loading")}</p>;
  if (preview === null) return <Card><p className="text-red-700">{t("invalidCode")}</p></Card>;
  if (alreadyMember) return null;

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    const { data, error } = await supabase.rpc("join_family", { p_code: code, p_my_name: name, p_claim: claim });
    setBusy(false);
    if (error) return setErr(error.message);
    selectFamily(data as string);
    await refresh();
    router.replace("/");
  };

  return (
    <Card>
      <form onSubmit={join} className="space-y-4">
        <h2 className="text-2xl font-bold">{preview.name}</h2>
        {preview.unclaimed.length > 0 && (
          <div>
            <p className="mb-2 font-semibold">{t("whoAreYou")}</p>
            <div className="flex flex-wrap gap-2">
              {preview.unclaimed.map((p) => <Chip key={p.id} active={claim === p.id} onClick={() => setClaim(p.id)}>{p.name}</Chip>)}
              <Chip active={claim === null} onClick={() => setClaim(null)}>{t("imNew")}</Chip>
            </div>
          </div>
        )}
        {claim === null && <Input label={t("yourName")} required value={name} onChange={(e) => setName(e.target.value)} />}
        {err && <p className="text-red-700">{err}</p>}
        <Button className="w-full" disabled={busy}>{t("join")}</Button>
      </form>
    </Card>
  );
}
