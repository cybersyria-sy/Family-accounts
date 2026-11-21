"use client";
import Link from "next/link";
import { useData } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { supabase, Entry } from "@/lib/supabase";
import { formatAmount, fromKey } from "@/lib/assets";
import { Card } from "./ui";
import { useUndo, check } from "@/lib/undo";

export function EntryList({ list, running }: { list: Entry[]; running?: Map<string, Map<string, number>> }) {
  const { t, lang } = useI18n();
  const { people, me, refresh, entries, canEdit } = useData();
  const offerUndo = useUndo();
  const name = (id: string) => (id === me?.id ? t("you") : people.find((p) => p.id === id)?.name ?? "?");

  const remove = async (id: string) => {
    if (!window.confirm(t("confirmDelete"))) return;
    const old = entries.find((x) => x.id === id);
    const { error } = await supabase.from("entries").delete().eq("id", id);
    await refresh();
    if (!error && old) offerUndo("deleted", async () => check(await supabase.from("entries").insert(old)));
  };

  if (list.length === 0) return <p className="text-stone-500">{t("nothing")}</p>;
  return (
    <ul className="space-y-2">
      {list.map((e) => {
        const verb = e.kind === "repayment" ? t("repaidTo") : t("lentTo");
        const a = { type: e.asset_type, code: e.asset_code, unit: e.unit };
        const isConv = e.kind === "conversion" && e.to_asset_type;
        const b = isConv ? { type: e.to_asset_type!, code: e.to_asset_code ?? "", unit: e.to_unit ?? "" } : null;
        const iReceived = e.to_person === me?.id;
        const after = running?.get(e.id);
        return (
          <li key={e.id}>
            <Card className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                {isConv ? (
                  <p className="text-lg font-bold text-sky-800">
                    🔄 <bdi>{formatAmount(Number(e.amount), a, lang)}</bdi> → <bdi>{formatAmount(Number(e.to_amount), b!, lang)}</bdi>
                  </p>
                ) : (
                  <p className={`text-lg font-bold ${iReceived ? "text-red-700" : e.from_person === me?.id ? "text-emerald-700" : ""}`}>
                    <bdi>{formatAmount(Number(e.amount), a, lang)}</bdi>
                  </p>
                )}
                <span className="shrink-0 text-sm text-stone-500" dir="ltr">{e.entry_date}</span>
              </div>
              <p className="text-stone-700">
                {e.kind === "opening"
                  ? `🏁 ${t("kindOpening")}: ${e.to_person === me?.id ? `${t("youOwe")} ${name(e.from_person)}` : e.from_person === me?.id ? `${name(e.to_person)} ${t("owesYou")}` : t("owesX").replace("{a}", name(e.to_person)).replace("{b}", name(e.from_person))}`
                  : isConv
                  ? `${t("kindConvert")}: ${name(e.to_person)} → ${name(e.from_person)}`
                  : `${name(e.from_person)} ${verb} ${name(e.to_person)}`}
              </p>
              {e.note && <p className="text-sm text-stone-500">{e.note}</p>}
              {after && after.size > 0 && (
                <div className="rounded-lg bg-stone-50 px-2 py-1 text-sm">
                  <span className="text-stone-500">{t("balanceAfter")}: </span>
                  {[...after].map(([k, v], i) => (
                    <span key={k} className={v > 0 ? "text-emerald-700" : v < 0 ? "text-red-700" : "text-stone-500"}>
                      {i > 0 && " · "}
                      {v === 0 ? <bdi>{formatAmount(0, fromKey(k), lang)}</bdi>: <>{v > 0 ? t("owesYou") : t("youOwe")} <bdi>{formatAmount(Math.abs(v), fromKey(k), lang)}</bdi></>}
                    </span>
                  ))}
                </div>
              )}
              {canEdit(e) ? (
                <div className="flex gap-4 pt-1 text-sm">
                  <Link href={`/add?edit=${e.id}`} className="font-semibold text-emerald-700">{t("edit")}</Link>
                  <button onClick={() => remove(e.id)} className="font-semibold text-red-700">{t("delete")}</button>
                </div>
              ) : (
                <p className="pt-1 text-xs text-stone-400">👁 {t("viewOnly")}</p>
              )}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
