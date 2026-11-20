"use client";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { Avatar, Card } from "@/components/ui";
import { BalanceLines } from "@/components/Balances";
import { useData } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { balancesBetween, formatAmount, fromKey, totals } from "@/lib/assets";

export default function Home() {
  return <Shell><HomeBody /></Shell>;
}

function HomeBody() {
  const { t, lang } = useI18n();
  const { people, me, entries, sharedWithMe } = useData();
  if (!me) return null;
  const others = people.filter((p) => p.id !== me.id);
  const sharers = people.filter((p) => p.user_id && sharedWithMe.includes(p.user_id));
  const { owed, owe } = totals(entries, me.id, people);

  const Total = ({ title, m, color }: { title: string; m: Map<string, number>; color: string }) => (
    <Card className="flex-1">
      <p className="text-sm text-stone-500">{title}</p>
      {m.size === 0 ? <p className="text-lg font-bold text-stone-400">0</p> :
        [...m].map(([k, v]) => <p key={k} className={`font-bold ${color}`}><bdi>{formatAmount(v, fromKey(k), lang)}</bdi></p>)}
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Total title={t("owedToYouTotal")} m={owed} color="text-emerald-700" />
        <Total title={t("youOweTotal")} m={owe} color="text-red-700" />
      </div>

      <h2 className="pt-2 text-lg font-bold">{t("people")}</h2>
      {others.length === 0 && (
        <Card><Link href="/settings" className="font-semibold text-emerald-700">+ {t("addPerson")}</Link></Card>
      )}
      {others.map((p) => (
        <Link key={p.id} href={`/person/${p.id}`} className="block">
          <Card className="flex items-start gap-3 active:bg-stone-50">
            <Avatar name={p.name} />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold">{p.name}</p>
              <BalanceLines balances={balancesBetween(entries, me.id, p.id)} />
            </div>
            <span className="text-2xl text-stone-300 rtl:rotate-180">›</span>
          </Card>
        </Link>
      ))}

      {sharers.length > 0 && (
        <>
          <h2 className="pt-2 text-lg font-bold">👁 {t("sharedWithYou")}</h2>
          {sharers.map((p) => (
            <Link key={p.id} href={`/view/${p.id}`} className="block">
              <Card className="flex items-center gap-3 active:bg-stone-50">
                <Avatar name={p.name} />
                <p className="flex-1 text-lg font-semibold">{p.name}</p>
                <span className="text-2xl text-stone-300 rtl:rotate-180">›</span>
              </Card>
            </Link>
          ))}
        </>
      )}
    </div>
  );
}
