"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { Shell } from "@/components/Shell";
import { Button, Card } from "@/components/ui";
import { useData } from "@/lib/data";
import { useI18n, Key } from "@/lib/i18n";
import { supabase, AssetType } from "@/lib/supabase";
import { CURRENCIES, KARATS } from "@/lib/assets";
import type { ExtractResultT } from "@/lib/extractSchema";

type Img = { media_type: "image/jpeg"; data: string; preview: string };
type Draft = {
  include: boolean;
  from: string; // person id, or "new:<name>"
  to: string;
  kind: "loan" | "repayment";
  asset_type: AssetType;
  asset_code: string;
  unit: string;
  amount: string;
  date: string;
  note: string;
  low: boolean;
};

/** Shrink a photo so uploads stay small and fast. */
async function toJpeg(file: File): Promise<Img> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const url = c.toDataURL("image/jpeg", 0.85);
  return { media_type: "image/jpeg", data: url.split(",")[1], preview: url };
}

async function readChatFile(file: File): Promise<string> {
  if (file.name.toLowerCase().endsWith(".zip")) {
    const zip = await JSZip.loadAsync(file);
    const txt = Object.values(zip.files).find((f) => !f.dir && f.name.toLowerCase().endsWith(".txt"));
    return txt ? await txt.async("string") : "";
  }
  return await file.text();
}

export default function ImportPage() {
  return <Shell><ImportBody /></Shell>;
}

function ImportBody() {
  const { t, lang } = useI18n();
  const { people, me, family, session, refresh } = useData();
  const router = useRouter();
  const camRef = useRef<HTMLInputElement>(null);
  const picRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<Img[]>([]);
  const [chatName, setChatName] = useState("");
  const [chatText, setChatText] = useState("");
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  if (!me || !family) return null;

  const addImages = async (files: FileList | null) => {
    if (!files) return;
    const out: Img[] = [];
    for (const f of Array.from(files)) out.push(await toJpeg(f));
    setImages((prev) => [...prev, ...out].slice(0, 8));
  };

  const resolveName = (name: string): string => {
    const n = name.trim();
    if (!n || n.toUpperCase() === "ME") return me.id;
    const hit = people.find((p) => p.name.trim().toLowerCase() === n.toLowerCase());
    return hit ? hit.id : `new:${n}`;
  };

  const read = async () => {
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({
          images: images.map(({ media_type, data }) => ({ media_type, data })),
          text: [chatText, pasted].filter(Boolean).join("\n\n"),
          myName: me.name,
          people: people.filter((p) => p.id !== me.id).map((p) => p.name),
          lang,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json.error === "not_configured" ? t("aiNotConfigured") : `${t("error")} (${json.error ?? res.status})`);
        return;
      }
      const result = json as ExtractResultT;
      setWarnings(result.warnings ?? []);
      setDrafts(result.entries.map((e) => ({
        include: e.confidence !== "low",
        from: resolveName(e.from_name),
        to: resolveName(e.to_name),
        kind: e.kind,
        asset_type: e.asset_type,
        asset_code: e.asset_code,
        unit: e.unit,
        amount: String(e.amount),
        date: /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : new Date().toISOString().slice(0, 10),
        note: e.note,
        low: e.confidence === "low",
      })));
    } catch {
      setErr(t("error"));
    } finally {
      setBusy(false);
    }
  };

  const update = (i: number, patch: Partial<Draft>) =>
    setDrafts((d) => d!.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const save = async () => {
    if (!drafts) return;
    setBusy(true); setErr("");
    const chosen = drafts.filter((d) => d.include && Number(d.amount) > 0 && d.from !== d.to);
    // Create any new people first
    const newNames = [...new Set(chosen.flatMap((d) => [d.from, d.to]).filter((x) => x.startsWith("new:")).map((x) => x.slice(4)))];
    const ids = new Map<string, string>();
    for (const n of newNames) {
      const { data, error } = await supabase.from("people").insert({ family_id: family.id, name: n }).select("id").single();
      if (error) { setBusy(false); return setErr(error.message); }
      ids.set(`new:${n}`, data.id);
    }
    const idOf = (x: string) => ids.get(x) ?? x;
    const rows = chosen.map((d) => ({
      family_id: family.id,
      from_person: idOf(d.from),
      to_person: idOf(d.to),
      kind: d.kind,
      asset_type: d.asset_type,
      asset_code: d.asset_type === "share" ? d.asset_code.trim().toUpperCase() : d.asset_code.trim(),
      unit: d.asset_type === "gold" || d.asset_type === "silver" ? "g" : d.asset_type === "share" ? "shares" : d.asset_type === "other" ? d.unit.trim() : "",
      amount: Number(d.amount),
      note: d.note.trim(),
      entry_date: d.date,
    }));
    if (rows.length) {
      const { error } = await supabase.from("entries").insert(rows);
      if (error) { setBusy(false); return setErr(error.message); }
    }
    await refresh();
    setBusy(false);
    router.push("/");
  };

  // ---------- Review step ----------
  if (drafts) {
    const newNames = [...new Set(drafts.flatMap((d) => [d.from, d.to]).filter((x) => x.startsWith("new:")))];
    const personOpts = [
      ...people.map((p) => ({ v: p.id, l: p.id === me.id ? `${p.name} (${t("you")})` : p.name })),
      ...newNames.map((n) => ({ v: n, l: `${n.slice(4)} (${t("newPersonOpt")})` })),
    ];
    const sel = "w-full rounded-xl border border-stone-300 bg-white px-2 py-2 text-base";
    const count = drafts.filter((d) => d.include).length;
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">{t("reviewTitle")}</h2>
        <p className="text-stone-600">{drafts.length ? t("reviewHelp") : t("noneFound")}</p>
        {warnings.length > 0 && (
          <Card className="bg-amber-50 ring-amber-200"><ul className="list-disc space-y-1 ps-5 text-amber-900">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></Card>
        )}
        {drafts.map((d, i) => (
          <Card key={i} className={`space-y-2 ${d.include ? "" : "opacity-50"} ${d.low ? "ring-amber-300" : ""}`}>
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" className="h-5 w-5" checked={d.include} onChange={(e) => update(i, { include: e.target.checked })} />
              #{i + 1} {d.low && <span className="text-sm text-amber-700">· {t("checkThis")}</span>}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm text-stone-600">{t("from")}
                <select className={sel} value={d.from} onChange={(e) => update(i, { from: e.target.value })}>
                  {personOpts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </label>
              <label className="text-sm text-stone-600">{t("to")}
                <select className={sel} value={d.to} onChange={(e) => update(i, { to: e.target.value })}>
                  {personOpts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </label>
              <select className={sel} value={d.kind} onChange={(e) => update(i, { kind: e.target.value as Draft["kind"] })}>
                <option value="loan">{t("kindLoan")}</option>
                <option value="repayment">{t("kindRepay")}</option>
              </select>
              <select className={sel} value={d.asset_type} onChange={(e) => update(i, { asset_type: e.target.value as AssetType })}>
                {(["currency", "gold", "silver", "share", "other"] as AssetType[]).map((ty) => <option key={ty} value={ty}>{t(ty as Key)}</option>)}
              </select>
              {d.asset_type === "currency" ? (
                <select className={sel} value={d.asset_code} onChange={(e) => update(i, { asset_code: e.target.value })}>
                  {[...new Set([d.asset_code, ...CURRENCIES])].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : d.asset_type === "gold" ? (
                <select className={sel} value={d.asset_code} onChange={(e) => update(i, { asset_code: e.target.value })}>
                  {[...new Set([d.asset_code, ...KARATS])].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : d.asset_type === "silver" ? <span /> : (
                <input className={sel} dir="ltr" value={d.asset_code} onChange={(e) => update(i, { asset_code: e.target.value })} />
              )}
              <input className={`${sel} font-bold`} dir="ltr" inputMode="decimal" value={d.amount} onChange={(e) => update(i, { amount: e.target.value })} />
              <input className={sel} type="date" value={d.date} onChange={(e) => update(i, { date: e.target.value })} />
              <input className={sel} placeholder={t("note")} value={d.note} onChange={(e) => update(i, { note: e.target.value })} />
            </div>
          </Card>
        ))}
        {err && <p className="text-red-700">{err}</p>}
        <div className="flex gap-2">
          <Button className="flex-1" disabled={busy || count === 0} onClick={save}>{t("saveSelected")} ({count})</Button>
          <Button variant="ghost" onClick={() => { setDrafts(null); setWarnings([]); }}>{t("startOver")}</Button>
        </div>
      </div>
    );
  }

  // ---------- Input step ----------
  const hasInput = images.length > 0 || chatText.trim() || pasted.trim();
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t("importTitle")}</h2>
      <p className="text-stone-600">{t("importHelp")}</p>

      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" onClick={() => camRef.current?.click()}>📷 {t("takePhoto")}</Button>
          <Button type="button" variant="ghost" onClick={() => picRef.current?.click()}>🖼 {t("uploadImages")}</Button>
        </div>
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
        <input ref={picRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
        {images.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {images.map((im, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.preview} alt="" className="aspect-square w-full rounded-lg object-cover" />
                <button onClick={() => setImages(images.filter((_, j) => j !== i))} className="absolute end-1 top-1 rounded-full bg-black/60 px-2 text-sm text-white">×</button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <p className="font-semibold">💬 {t("whatsappFile")}</p>
        <p className="text-sm text-stone-600">{t("whatsappHelp")}</p>
        <Button type="button" variant="ghost" className="w-full" onClick={() => chatRef.current?.click()}>{chatName || t("whatsappFile")}</Button>
        <input ref={chatRef} type="file" accept=".txt,.zip,text/plain,application/zip" hidden onChange={async (e) => {
          const f = e.target.files?.[0]; e.target.value = "";
          if (!f) return;
          setChatName(f.name); setChatText(await readChatFile(f));
        }} />
        {chatName && <button className="text-sm text-red-700" onClick={() => { setChatName(""); setChatText(""); }}>{t("removeFile")}</button>}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-600">{t("pasteText")}</span>
          <textarea rows={4} value={pasted} onChange={(e) => setPasted(e.target.value)} className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base" />
        </label>
      </Card>

      {err && <p className="text-red-700">{err}</p>}
      <Button className="w-full" disabled={busy || !hasInput} onClick={read}>{busy ? t("reading") : `✨ ${t("readWithAi")}`}</Button>
    </div>
  );
}
