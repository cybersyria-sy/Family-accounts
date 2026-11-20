-- Conversions: a debt in one asset becomes a debt in another (e.g. 500 USD -> 450 EUR or 5 g gold)
alter table public.entries drop constraint if exists entries_kind_check;
alter table public.entries add constraint entries_kind_check check (kind in ('loan', 'repayment', 'conversion'));
alter table public.entries
  add column to_asset_type text check (to_asset_type in ('currency', 'gold', 'silver', 'share', 'other')),
  add column to_asset_code text,
  add column to_unit text,
  add column to_amount numeric(20, 6) check (to_amount > 0);
alter table public.entries add constraint entries_conversion_fields check (
  (kind = 'conversion') = (to_asset_type is not null and to_asset_code is not null and to_unit is not null and to_amount is not null)
);
