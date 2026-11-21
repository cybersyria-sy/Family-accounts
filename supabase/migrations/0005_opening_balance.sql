-- Opening balance: what one person already owed another on a given date (from = lender, to = who owes)
alter table public.entries drop constraint if exists entries_kind_check;
alter table public.entries add constraint entries_kind_check check (kind in ('loan', 'repayment', 'conversion', 'opening'));
