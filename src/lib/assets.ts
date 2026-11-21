import type { AssetType, Entry, Person } from "./supabase";
import type { Lang } from "./i18n";

export const CURRENCIES = ["USD", "EUR", "SYP", "TRY", "SAR", "AED", "GBP", "JOD", "LBP", "EGP", "IQD", "KWD", "QAR", "CAD", "SEK"];
export const KARATS = ["24K", "22K", "21K", "18K"];

const currencyNamesAr: Record<string, string> = {
  USD: "دولار", EUR: "يورو", SYP: "ليرة سورية", TRY: "ليرة تركية", SAR: "ريال سعودي", AED: "درهم إماراتي",
  GBP: "جنيه إسترليني", JOD: "دينار أردني", LBP: "ليرة لبنانية", EGP: "جنيه مصري", IQD: "دينار عراقي",
  KWD: "دينار كويتي", QAR: "ريال قطري", CAD: "دولار كندي", SEK: "كرونة سويدية",
};

export type Asset = { type: AssetType; code: string; unit: string };
export const assetKey = (a: Asset) => `${a.type}|${a.code}|${a.unit}`;
export const fromKey = (k: string): Asset => {
  const [type, code, unit] = k.split("|");
  return { type: type as AssetType, code, unit };
};

export function assetLabel(a: Asset, lang: Lang): string {
  const ar = lang === "ar";
  switch (a.type) {
    case "currency": return ar ? currencyNamesAr[a.code] ?? a.code : a.code;
    case "gold": return ar ? `ذهب ${a.code.replace("K", "")}` : `Gold ${a.code}`;
    case "silver": return ar ? "فضة" : "Silver";
    case "share": return ar ? `أسهم ${a.code}` : `${a.code} shares`;
    default: return a.code;
  }
}

export function unitLabel(a: Asset, lang: Lang): string {
  if (a.type === "gold" || a.type === "silver") return lang === "ar" ? "غ" : "g";
  if (a.type === "share" || a.type === "currency") return "";
  return a.unit;
}

export function formatAmount(n: number, a: Asset, lang: Lang): string {
  const num = new Intl.NumberFormat(lang === "ar" ? "ar-u-nu-latn" : "en", { maximumFractionDigits: 3 }).format(n);
  const u = unitLabel(a, lang);
  return `${num}${u ? " " + u : ""} ${assetLabel(a, lang)}`;
}

/** How one entry changes what `other` owes `me`, per asset key (positive = other owes me more). */
export function entryEffect(e: Entry, me: string, other: string): Map<string, number> {
  const m = new Map<string, number>();
  let sign = 0;
  if (e.from_person === me && e.to_person === other) sign = 1;
  else if (e.from_person === other && e.to_person === me) sign = -1;
  if (!sign) return m;
  const a = assetKey({ type: e.asset_type, code: e.asset_code, unit: e.unit });
  if (e.kind === "conversion" && e.to_asset_type && e.to_amount) {
    // from = the lender, to = who owes. The old asset is settled, the new one is owed instead.
    const b = assetKey({ type: e.to_asset_type, code: e.to_asset_code ?? "", unit: e.to_unit ?? "" });
    m.set(a, -sign * Number(e.amount));
    m.set(b, (m.get(b) ?? 0) + sign * Number(e.to_amount));
  } else {
    m.set(a, sign * Number(e.amount));
  }
  return m;
}

/** Balance of `other` towards `me`, per asset: positive = other owes me, negative = I owe other. */
export function balancesBetween(entries: Entry[], me: string, other: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of entries) {
    for (const [k, v] of entryEffect(e, me, other)) m.set(k, round((m.get(k) ?? 0) + v));
  }
  for (const [k, v] of m) if (v === 0) m.delete(k);
  return m;
}

/** For a list of entries between me and other, the balance of each affected asset right after each entry. */
export function runningBalances(entries: Entry[], me: string, other: string): Map<string, Map<string, number>> {
  // Opening balances come first on their day
  const sorted = [...entries].sort((x, y) =>
    x.entry_date !== y.entry_date ? x.entry_date.localeCompare(y.entry_date)
      : (x.kind === "opening") !== (y.kind === "opening") ? (x.kind === "opening" ? -1 : 1)
      : x.created_at.localeCompare(y.created_at));
  const bal = new Map<string, number>();
  const out = new Map<string, Map<string, number>>();
  for (const e of sorted) {
    const eff = entryEffect(e, me, other);
    for (const [k, v] of eff) bal.set(k, round((bal.get(k) ?? 0) + v));
    // Full picture after this entry: the assets it touched first, then every other open balance
    const after = new Map<string, number>();
    for (const k of eff.keys()) after.set(k, bal.get(k)!);
    for (const [k, v] of bal) if (!after.has(k) && v !== 0) after.set(k, v);
    out.set(e.id, after);
  }
  return out;
}

export function totals(entries: Entry[], me: string, people: Person[]) {
  const owed = new Map<string, number>();
  const owe = new Map<string, number>();
  for (const p of people) {
    if (p.id === me) continue;
    for (const [k, v] of balancesBetween(entries, me, p.id)) {
      if (v > 0) owed.set(k, round((owed.get(k) ?? 0) + v));
      else owe.set(k, round((owe.get(k) ?? 0) - v));
    }
  }
  return { owed, owe };
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;
