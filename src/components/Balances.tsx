"use client";
import { Asset, formatAmount, fromKey } from "@/lib/assets";
import { useI18n } from "@/lib/i18n";

/** Lines like "500 USD" coloured by direction. Positive = they owe me. */
export function BalanceLines({ balances, showLabel = true }: { balances: Map<string, number>; showLabel?: boolean }) {
  const { t, lang } = useI18n();
  if (balances.size === 0) return <p className="text-stone-500">{t("settled")}</p>;
  return (
    <ul className="space-y-1">
      {[...balances].map(([k, v]) => {
        const a: Asset = fromKey(k);
        return (
          <li key={k} className={`font-semibold ${v > 0 ? "text-emerald-700" : "text-red-700"}`}>
            {showLabel && <span className="text-sm font-normal text-stone-500">{v > 0 ? t("owesYou") : t("youOwe")}: </span>}
            <bdi>{formatAmount(Math.abs(v), a, lang)}</bdi>
          </li>
        );
      })}
    </ul>
  );
}
