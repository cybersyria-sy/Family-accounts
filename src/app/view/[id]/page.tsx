"use client";
import { use } from "react";
import { Shell } from "@/components/Shell";
import { Avatar, Card } from "@/components/ui";
import { BalanceLines } from "@/components/Balances";
import { EntryList } from "@/components/EntryList";
import { useData } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { balancesBetween } from "@/lib/assets";

/** Read-only view of someone who shared all their transactions with me. */
export default function ViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Shell><ViewBody id={id} /></Shell>;
}

function ViewBody({ id }: { id: string }) {
  const { t } = useI18n();
  const { people, entries, sharedWithMe } = useData();
  const owner = people.find((x) => x.id === id);
  if (!owner || !owner.user_id || !sharedWithMe.includes(owner.user_id)) return <p className="text-stone-500">{t("nothing")}</p>;
  const list = entries.filter((e) => e.from_person === id || e.to_person === id);
  const fill = (a: string, b: string) => t("owesX").replace("{a}", a).replace("{b}", b);
  const counterparts = people.filter((p) => p.id !== id && list.some((e) => e.from_person === p.id || e.to_person === p.id));

  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-3">
        <Avatar name={owner.name} />
        <div className="flex-1">
          <p className="text-xl font-bold">{owner.name}</p>
          <p className="text-sm text-stone-500">👁 {t("viewOnly")}</p>
        </div>
      </Card>
      {counterparts.map((p) => (
        <Card key={p.id} className="flex items-start gap-3">
          <Avatar name={p.name} />
          <div className="flex-1">
            <p className="font-semibold">{p.name}</p>
            <BalanceLines balances={balancesBetween(entries, id, p.id)} labels={[fill(p.name, owner.name), fill(owner.name, p.name)]} />
          </div>
        </Card>
      ))}
      <h2 className="pt-2 text-lg font-bold">{t("history")}</h2>
      <EntryList list={list} />
    </div>
  );
}
