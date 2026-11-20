"use client";
import { Chip, Input } from "./ui";
import { useI18n } from "@/lib/i18n";
import { AssetType } from "@/lib/supabase";
import { KARATS, assetLabel } from "@/lib/assets";

export type AssetValue = { type: AssetType; code: string; unit: string };
const TYPES: AssetType[] = ["currency", "gold", "silver", "share", "other"];

export function defaultCode(ty: AssetType, currencyList: string[]) {
  return ty === "currency" ? currencyList[0] : ty === "gold" ? "21K" : "";
}

export function AssetPicker({ value, onChange, currencyList }: { value: AssetValue; onChange: (v: AssetValue) => void; currencyList: string[] }) {
  const { t, lang } = useI18n();
  const { type, code, unit } = value;
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {TYPES.map((ty) => (
          <Chip key={ty} active={type === ty} onClick={() => onChange({ type: ty, code: defaultCode(ty, currencyList), unit: "" })}>{t(ty)}</Chip>
        ))}
      </div>
      {type === "currency" && (
        <select value={code} onChange={(e) => onChange({ ...value, code: e.target.value })}
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-base">
          {currencyList.map((c) => <option key={c} value={c}>{lang === "ar" ? `${assetLabel({ type: "currency", code: c, unit: "" }, "ar")} (${c})` : c}</option>)}
        </select>
      )}
      {type === "gold" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-stone-600">{t("karat")}:</span>
          {KARATS.map((k) => <Chip key={k} active={code === k} onClick={() => onChange({ ...value, code: k })}>{k.replace("K", "")}</Chip>)}
        </div>
      )}
      {type === "share" && <Input label={t("ticker")} dir="ltr" value={code} onChange={(e) => onChange({ ...value, code: e.target.value })} />}
      {type === "other" && (
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2"><Input label={t("itemName")} value={code} onChange={(e) => onChange({ ...value, code: e.target.value })} /></div>
          <Input label={t("unitLabel")} value={unit} onChange={(e) => onChange({ ...value, unit: e.target.value })} />
        </div>
      )}
    </div>
  );
}

export function normalizeAsset(v: AssetValue) {
  return {
    asset_type: v.type,
    asset_code: v.type === "share" ? v.code.trim().toUpperCase() : v.code.trim(),
    unit: v.type === "gold" || v.type === "silver" ? "g" : v.type === "share" ? "shares" : v.type === "other" ? v.unit.trim() : "",
  };
}

export function unitSuffix(type: AssetType, t: (k: "grams" | "sharesUnit") => string) {
  return type === "gold" || type === "silver" ? ` (${t("grams")})` : type === "share" ? ` (${t("sharesUnit")})` : "";
}

export function parseAmount(s: string) {
  return Number(s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace("٫", ".").replace(",", "."));
}
