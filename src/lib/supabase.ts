import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing-key";

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export type Family = { id: string; name: string; invite_code: string };
export type Person = { id: string; family_id: string; name: string; user_id: string | null };
export type Entry = {
  id: string;
  family_id: string;
  from_person: string;
  to_person: string;
  kind: "loan" | "repayment";
  asset_type: AssetType;
  asset_code: string;
  unit: string;
  amount: number;
  note: string;
  entry_date: string;
  created_by: string | null;
  created_at: string;
};
export type AssetType = "currency" | "gold" | "silver" | "share" | "other";
