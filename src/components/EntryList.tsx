"use client";
import Link from "next/link";
import { useData } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { supabase, Entry } from "@/lib/supabase";
import { formatAmount } from "@/lib/assets";
import { Card } from "./ui";

export function EntryList({ list }: { list: Entry[] }) {
  const { t, lang } = useI18n();
  const { people, me, refresh } = useData();
  const name = (id: string) => (id === me?.id ? t("you") : people.find((p) => p.id === id)?.name ?? "?");

  const remove = async (id: string) => {
    if (!window.confirm(t("confirmDelete"))) return;
    await supabase.from("entries").delete().eq("id", id);
    await refresh();
  };

  if (list.length === 0) return <p className="text-stone-500">{t("nothing")}</p>;
  return (
    <ul className="space-y-2">
      {list.map((e) => {
        const verb = e.kind === "repayment" ? t("repaidTo") : t("lentTo");
        const a = { type: e.asset_type, code: e.asset_code, unit: e.unit };
        const iReceived = e.to_person === me?.id;
        return (
          <li key={e.id}>
            <Card className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className={`text-lg font-bold ${iReceived ? "text-red-700" : e.from_person === me?.id ? "text-emerald-700" : ""}`}>
                  <bdi>{formatAmount(Number(e.amount), a, lang)}</bdi>
                </p>
                <span className="shrink-0 text-sm text-stone-500" dir="ltr">{e.entry_date}</span>
              </div>
              <p className="text-stone-700">{name(e.from_person)} {verb} {name(e.to_person)}</p>
              {e.note && <p className="text-sm text-stone-500">{e.note}</p>}
              <div className="flex gap-4 pt-1 text-sm">
                <Link href={`/add?edit=${e.id}`} className="font-semibold text-emerald-700">{t("edit")}</Link>
                <button onClick={() => remove(e.id)} className="font-semibold text-red-700">{t("delete")}</button>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
