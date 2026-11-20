import { z } from "zod/v4";

export const ExtractedEntry = z.object({
  from_name: z.string().describe('Who gave/lent/paid. Use "ME" for the person who uploaded.'),
  to_name: z.string().describe('Who received/borrowed. Use "ME" for the person who uploaded.'),
  kind: z.enum(["loan", "repayment", "conversion"]).describe("conversion = an existing debt changes into another asset; from_name is the lender, to_name is who owes"),
  asset_type: z.enum(["currency", "gold", "silver", "share", "other"]),
  asset_code: z.string().describe("ISO currency code (USD, SYP, TRY...), gold karat like 21K, share ticker, or item name"),
  unit: z.string().describe('"g" for gold/silver grams, "shares" for shares, a unit for other items, "" for money'),
  amount: z.number(),
  date: z.string().describe("YYYY-MM-DD taken from the source (the chat message's own date line, the photo's file name, or the date written on the page). Never use today's date. Empty string if the source shows no date"),
  note: z.string().describe("Short note in the source language, e.g. what it was for"),
  to_asset_type: z.enum(["currency", "gold", "silver", "share", "other"]).nullable().describe("Only for conversion: the new asset"),
  to_asset_code: z.string().nullable(),
  to_unit: z.string().nullable(),
  to_amount: z.number().nullable(),
  source_quote: z.string().describe("The exact short line(s) from the source this entry comes from, max 200 chars"),
  confidence: z.enum(["high", "medium", "low"]),
  comment: z.string().describe("Anything unclear about THIS entry that the user should check, in the user's language. Empty string if nothing"),
});

export const ExtractNote = z.object({
  date: z.string().describe("YYYY-MM-DD of the chat message or page this note is about, or empty string"),
  text: z.string().describe("The note, in the user's language"),
});

export const ExtractResult = z.object({
  entries: z.array(ExtractedEntry),
  warnings: z.array(ExtractNote).describe("Only things NOT about a single entry (e.g. a balance mentioned in the chat). Put entry-specific doubts in that entry's comment instead"),
});

export type ExtractedEntryT = z.infer<typeof ExtractedEntry>;
export type ExtractResultT = z.infer<typeof ExtractResult>;
