-- Seller-assumed transport flag drives future order settlement:
--   true  -> seller fulfills delivery; platform takes 10% commission of order total.
--   false -> platform organizes transport; platform keeps 10% commission + full transport amount.
-- Default true preserves existing behavior for all rows created before payments land.

alter table public.marketplace_listings
  add column if not exists seller_assumes_transport boolean not null default true;

comment on column public.marketplace_listings.seller_assumes_transport is
  'Transport Asigurat: true = vanzatorul ofera transportul (comision platforma 10%% din total comanda); false = platforma organizeaza transportul (comision 10%% + valoarea transportului ramane la platforma la decontare).';
