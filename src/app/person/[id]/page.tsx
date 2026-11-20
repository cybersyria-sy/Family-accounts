"use client";
import Link from "next/link";
import { use } from "react";
import { Shell } from "@/components/Shell";
import { Avatar, Card } from "@/components/ui";
import { BalanceLines } from "@/components/Balances";
import { EntryList } from "@/components/EntryList";
import { useData } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { balancesBetween, runningBalances } from "@/lib/assets";

export default function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Shell><PersonBody id={id} /></Shell>;
}

function PersonBody({ id }: { id: string }) {
  const { t } = useI18n();
  const { people, me, entries } = useData();
  const p = people.find((x) => x.id === id);
  if (!p || !me) return <p className="text-stone-500">{t("nothing")}</p>;
  const list = entries.filter((e) => (e.from_person === me.id && e.to_person === id) || (e.from_person === id && e.to_person === me.id));

  return (
    <div className="space-y-4">
      <Card className="flex items-start gap-3">
        <Avatar name={p.name} />
        <div className="flex-1">
          <p className="text-xl font-bold">{p.name}</p>
          <BalanceLines balances={balancesBetween(entries, me.id, id)} />
        </div>
      </Card>
      <Link href={`/add?person=${id}`} className="block rounded-xl bg-emerald-700 py-3 text-center text-base font-semibold text-white">+ {t("newEntry")}</Link>
      <h2 className="pt-2 text-lg font-bold">{t("history")}</h2>
      <EntryList list={list} running={runningBalances(list, me.id, id)} />
    </div>
  );
}
