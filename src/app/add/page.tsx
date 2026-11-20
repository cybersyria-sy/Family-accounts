"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Button, Card, Chip, Input } from "@/components/ui";
import { useData } from "@/lib/data";
import { useI18n, Key } from "@/lib/i18n";
import { supabase, AssetType, Entry } from "@/lib/supabase";
import { CURRENCIES, KARATS, assetLabel } from "@/lib/assets";

type Action = "borrowed" | "lent" | "iRepaid" | "theyRepaid";
const ACTIONS: { id: Action; label: Key }[] = [
  { id: "borrowed", label: "iBorrowed" },
  { id: "lent", label: "iLent" },
  { id: "iRepaid", label: "iRepaid" },
  { id: "theyRepaid", label: "theyRepaid" },
];
const TYPES: AssetType[] = ["currency", "gold", "silver", "share", "other"];

export default function AddPage() {
  return <Shell><Suspense><EntryForm /></Suspense></Shell>;
}

function EntryForm() {
  const { t, lang } = useI18n();
  const { people, me, entries, family, refresh } = useData();
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("edit");
  const editing: Entry | undefined = useMemo(() => entries.find((e) => e.id === editId), [entries, editId]);

  const others = people.filter((p) => p.id !== me?.id);
  const [action, setAction] = useState<Action>("borrowed");
  const [person, setPerson] = useState<string>(params.get("person") ?? "");
  const [type, setType] = useState<AssetType>("currency");
  const [code, setCode] = useState("USD");
  const [unit, setUnit] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Recently used currencies first
  const currencyList = useMemo(() => {
    const used = entries.filter((e) => e.asset_type === "currency").map((e) => e.asset_code);
    return [...new Set([...used, ...CURRENCIES])];
  }, [entries]);

  useEffect(() => {
    if (!editing || !me) return;
    const mine = editing.from_person === me.id || editing.to_person === me.id;
    if (mine) {
      const iGave = editing.from_person === me.id;
      setPerson(iGave ? editing.to_person : editing.from_person);
      setAction(editing.kind === "loan" ? (iGave ? "lent" : "borrowed") : (iGave ? "iRepaid" : "theyRepaid"));
    }
    setType(editing.asset_type);
    setCode(editing.asset_code);
    setUnit(editing.unit);
    setAmount(String(editing.amount));
    setNote(editing.note);
    setDate(editing.entry_date);
  }, [editing, me]);

  useEffect(() => {
    if (!person && others.length === 1) setPerson(others[0].id);
  }, [others, person]);

  if (!me || !family) return null;
  if (others.length === 0) {
    return <Card><p className="mb-3">{t("needPerson")}</p><Button onClick={() => router.push("/settings")}>{t("addPerson")}</Button></Card>;
  }
  const involvesMe = !editing || editing.from_person === me.id || editing.to_person === me.id;

  const pickType = (ty: AssetType) => {
    setType(ty);
    setUnit("");
    setCode(ty === "currency" ? currencyList[0] : ty === "gold" ? "21K" : "");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const amt = Number(amount.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace("٫", ".").replace(",", "."));
    if (!(amt > 0)) return setErr(t("amount"));
    if (!person && involvesMe) return setErr(t("withWhom"));
    const iGave = action === "lent" || action === "iRepaid";
    const row = {
      family_id: family.id,
      ...(involvesMe ? { from_person: iGave ? me.id : person, to_person: iGave ? person : me.id, kind: action === "borrowed" || action === "lent" ? "loan" : "repayment" } : {}),
      asset_type: type,
      asset_code: type === "share" ? code.trim().toUpperCase() : code.trim(),
      unit: type === "gold" || type === "silver" ? "g" : type === "share" ? "shares" : type === "other" ? unit.trim() : "",
      amount: amt,
      note: note.trim(),
      entry_date: date,
    };
    if ((type === "share" || type === "other") && !row.asset_code) return setErr(type === "share" ? t("ticker") : t("itemName"));
    setBusy(true);
    const { error } = editing
      ? await supabase.from("entries").update(row).eq("id", editing.id)
      : await supabase.from("entries").insert(row);
    if (error) { setBusy(false); return setErr(error.message); }
    await refresh();
    router.push(involvesMe ? `/person/${person}` : "/");
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <h2 className="text-xl font-bold">{editing ? t("editEntry") : t("newEntry")}</h2>

      {involvesMe && (
        <>
          <section>
            <p className="mb-2 font-semibold">{t("whatHappened")}</p>
            <div className="grid grid-cols-2 gap-2">
              {ACTIONS.map((a) => (
                <button type="button" key={a.id} onClick={() => setAction(a.id)}
                  className={`rounded-xl px-3 py-4 text-base font-semibold ring-1 ${action === a.id ? "bg-emerald-700 text-white ring-emerald-700" : "bg-white ring-stone-300"}`}>
                  {t(a.label)}
                </button>
              ))}
            </div>
          </section>
          <section>
            <p className="mb-2 font-semibold">{t("withWhom")}</p>
            <div className="flex flex-wrap gap-2">
              {others.map((p) => <Chip key={p.id} active={person === p.id} onClick={() => setPerson(p.id)}>{p.name}</Chip>)}
            </div>
          </section>
        </>
      )}

      <section>
        <p className="mb-2 font-semibold">{t("what")}</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {TYPES.map((ty) => <Chip key={ty} active={type === ty} onClick={() => pickType(ty)}>{t(ty)}</Chip>)}
        </div>
        {type === "currency" && (
          <select value={code} onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-base">
            {currencyList.map((c) => <option key={c} value={c}>{lang === "ar" ? `${assetLabel({ type: "currency", code: c, unit: "" }, "ar")} (${c})` : c}</option>)}
          </select>
        )}
        {type === "gold" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-stone-600">{t("karat")}:</span>
            {KARATS.map((k) => <Chip key={k} active={code === k} onClick={() => setCode(k)}>{k.replace("K", "")}</Chip>)}
          </div>
        )}
        {type === "share" && <Input label={t("ticker")} dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} />}
        {type === "other" && (
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2"><Input label={t("itemName")} value={code} onChange={(e) => setCode(e.target.value)} /></div>
            <Input label={t("unitLabel")} value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
        )}
      </section>

      <Input label={`${t("amount")}${type === "gold" || type === "silver" ? ` (${t("grams")})` : type === "share" ? ` (${t("sharesUnit")})` : ""}`}
        inputMode="decimal" required dir="ltr" className="text-2xl font-bold" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Input label={t("note")} value={note} onChange={(e) => setNote(e.target.value)} />
      <Input label={t("date")} type="date" required value={date} onChange={(e) => setDate(e.target.value)} />

      {err && <p className="text-red-700">{err}</p>}
      <div className="flex gap-2">
        <Button className="flex-1" disabled={busy}>{t("save")}</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>{t("cancel")}</Button>
      </div>
    </form>
  );
}
