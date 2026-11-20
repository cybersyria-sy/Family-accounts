"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Button, Card, Chip, Input } from "@/components/ui";
import { AssetPicker, AssetValue, normalizeAsset, parseAmount, unitSuffix } from "@/components/AssetPicker";
import { useData } from "@/lib/data";
import { useI18n, Key } from "@/lib/i18n";
import { supabase, Entry } from "@/lib/supabase";
import { CURRENCIES, balancesBetween, formatAmount, fromKey } from "@/lib/assets";

type Action = "borrowed" | "lent" | "iRepaid" | "theyRepaid" | "convert";
const ACTIONS: { id: Action; label: Key }[] = [
  { id: "borrowed", label: "iBorrowed" },
  { id: "lent", label: "iLent" },
  { id: "iRepaid", label: "iRepaid" },
  { id: "theyRepaid", label: "theyRepaid" },
  { id: "convert", label: "convertAction" },
];

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
  const [asset, setAsset] = useState<AssetValue>({ type: "currency", code: "USD", unit: "" });
  const [toAsset, setToAsset] = useState<AssetValue>({ type: "currency", code: "EUR", unit: "" });
  const [theyOweMe, setTheyOweMe] = useState(true); // for conversions
  const [amount, setAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

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
      if (editing.kind === "conversion") { setAction("convert"); setTheyOweMe(iGave); }
      else setAction(editing.kind === "loan" ? (iGave ? "lent" : "borrowed") : (iGave ? "iRepaid" : "theyRepaid"));
    }
    setAsset({ type: editing.asset_type, code: editing.asset_code, unit: editing.unit });
    if (editing.kind === "conversion" && editing.to_asset_type) {
      setToAsset({ type: editing.to_asset_type, code: editing.to_asset_code ?? "", unit: editing.to_unit ?? "" });
      setToAmount(String(editing.to_amount ?? ""));
    }
    setAmount(String(editing.amount));
    setNote(editing.note);
    setDate(editing.entry_date);
  }, [editing, me]);

  useEffect(() => {
    if (!person && others.length === 1) setPerson(others[0].id);
  }, [others, person]);

  // For conversions: what this person currently owes / is owed, to pick from
  const current = useMemo(() => (me && person ? balancesBetween(entries, me.id, person) : new Map<string, number>()), [entries, me, person]);

  if (!me || !family) return null;
  if (others.length === 0) {
    return <Card><p className="mb-3">{t("needPerson")}</p><Button onClick={() => router.push("/settings")}>{t("addPerson")}</Button></Card>;
  }
  const involvesMe = !editing || editing.from_person === me.id || editing.to_person === me.id;
  const isConvert = action === "convert";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const amt = parseAmount(amount);
    if (!(amt > 0)) return setErr(t("amount"));
    if (!person && involvesMe) return setErr(t("withWhom"));
    const a = normalizeAsset(asset);
    if ((a.asset_type === "share" || a.asset_type === "other") && !a.asset_code) return setErr(a.asset_type === "share" ? t("ticker") : t("itemName"));

    let people_: Record<string, string> = {};
    if (involvesMe) {
      const iGave = isConvert ? theyOweMe : action === "lent" || action === "iRepaid";
      people_ = { from_person: iGave ? me.id : person, to_person: iGave ? person : me.id };
    }
    let conv: Record<string, unknown> = { to_asset_type: null, to_asset_code: null, to_unit: null, to_amount: null };
    let kind: string = action === "borrowed" || action === "lent" ? "loan" : "repayment";
    if (isConvert || editing?.kind === "conversion") {
      const toAmt = parseAmount(toAmount);
      if (!(toAmt > 0)) return setErr(t("convertTo"));
      const b = normalizeAsset(toAsset);
      if ((b.asset_type === "share" || b.asset_type === "other") && !b.asset_code) return setErr(t("convertTo"));
      conv = { to_asset_type: b.asset_type, to_asset_code: b.asset_code, to_unit: b.unit, to_amount: toAmt };
      kind = "conversion";
    }
    const row = { family_id: family.id, ...people_, kind, ...a, amount: amt, ...conv, note: note.trim(), entry_date: date };
    setBusy(true);
    const { error } = editing
      ? await supabase.from("entries").update(row).eq("id", editing.id)
      : await supabase.from("entries").insert(row);
    if (error) { setBusy(false); return setErr(error.message); }
    await refresh();
    router.push(involvesMe ? `/person/${person}` : "/");
  };

  const rate = isConvert && parseAmount(amount) > 0 && parseAmount(toAmount) > 0 ? parseAmount(toAmount) / parseAmount(amount) : 0;

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
                  className={`rounded-xl px-3 py-4 text-base font-semibold ring-1 ${a.id === "convert" ? "col-span-2" : ""} ${action === a.id ? "bg-emerald-700 text-white ring-emerald-700" : "bg-white ring-stone-300"}`}>
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

      {isConvert && (
        <section className="space-y-2">
          <p className="text-stone-600">{t("convertHelp")}</p>
          <div className="flex gap-2">
            <Chip active={theyOweMe} onClick={() => setTheyOweMe(true)}>{t("theyOweMe")}</Chip>
            <Chip active={!theyOweMe} onClick={() => setTheyOweMe(false)}>{t("iOweThem")}</Chip>
          </div>
          {current.size > 0 && (
            <div className="flex flex-wrap gap-2 text-sm">
              {[...current].map(([k, v]) => {
                const av = fromKey(k);
                return (
                  <button type="button" key={k} className="rounded-full bg-stone-100 px-3 py-1"
                    onClick={() => { setAsset({ type: av.type, code: av.code, unit: av.unit }); setAmount(String(Math.abs(v))); setTheyOweMe(v > 0); }}>
                    <bdi>{formatAmount(Math.abs(v), av, lang)}</bdi>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      <section>
        <p className="mb-2 font-semibold">{isConvert ? t("convertFrom") : t("what")}</p>
        <AssetPicker value={asset} onChange={setAsset} currencyList={currencyList} />
      </section>
      <Input label={`${t("amount")}${unitSuffix(asset.type, t)}`}
        inputMode="decimal" required dir="ltr" className="text-2xl font-bold" value={amount} onChange={(e) => setAmount(e.target.value)} />

      {(isConvert || editing?.kind === "conversion") && (
        <>
          <section>
            <p className="mb-2 font-semibold">{t("convertTo")}</p>
            <AssetPicker value={toAsset} onChange={setToAsset} currencyList={currencyList} />
          </section>
          <Input label={`${t("amount")}${unitSuffix(toAsset.type, t)}`}
            inputMode="decimal" required dir="ltr" className="text-2xl font-bold" value={toAmount} onChange={(e) => setToAmount(e.target.value)} />
          {rate > 0 && <p className="text-sm text-stone-500" dir="ltr">1 {asset.code || asset.type} = {Number(rate.toPrecision(6))} {toAsset.code || toAsset.type}</p>}
        </>
      )}

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
