import { z } from "zod/v4";

export const ExtractedEntry = z.object({
  from_name: z.string().describe('Who gave/lent/paid. Use "ME" for the person who uploaded.'),
  to_name: z.string().describe('Who received/borrowed. Use "ME" for the person who uploaded.'),
  kind: z.enum(["loan", "repayment"]),
  asset_type: z.enum(["currency", "gold", "silver", "share", "other"]),
  asset_code: z.string().describe("ISO currency code (USD, SYP, TRY...), gold karat like 21K, share ticker, or item name"),
  unit: z.string().describe('"g" for gold/silver grams, "shares" for shares, a unit for other items, "" for money'),
  amount: z.number(),
  date: z.string().describe("YYYY-MM-DD, or empty string if unknown"),
  note: z.string().describe("Short note in the source language, e.g. what it was for"),
  confidence: z.enum(["high", "medium", "low"]),
});

export const ExtractResult = z.object({
  entries: z.array(ExtractedEntry),
  warnings: z.array(z.string()).describe("Anything unclear the user should check, in the user's language"),
});

export type ExtractedEntryT = z.infer<typeof ExtractedEntry>;
export type ExtractResultT = z.infer<typeof ExtractResult>;
