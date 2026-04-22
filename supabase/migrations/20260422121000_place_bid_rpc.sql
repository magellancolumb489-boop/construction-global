-- place_bid RPC + set_user_role RPC + close_auction admin RPC.
-- SECURITY DEFINER functions owned by postgres bypass the column grants we
-- locked down on auction_lots / auction_bids in the RLS baseline migration.

begin;

-- ============================================================================
-- place_bid(p_lot_id, p_amount) -> json
--   Atomic bid submission. Enforces all business invariants so the database
--   stays correct even if the client lies.
-- ============================================================================
create or replace function public.place_bid(
  p_lot_id bigint,
  p_amount numeric
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_bidder uuid := auth.uid();
  v_lot record;
  v_min_next numeric;
begin
  if v_bidder is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  -- Lock the lot row for the duration of this transaction
  select *
    into v_lot
    from public.auction_lots
   where id = p_lot_id
   for update;

  if not found then
    return json_build_object('ok', false, 'error', 'lot_not_found');
  end if;

  -- Sanity: keep status in sync with the time window. If a scheduled lot
  -- has entered its window, flip it to active before evaluating.
  if v_lot.status = 'scheduled' and v_lot.starts_at <= now() and v_lot.ends_at > now() then
    update public.auction_lots
       set status = 'active'
     where id = v_lot.id;
    v_lot.status := 'active';
  end if;

  -- If the window has closed, flip to ended (without picking a winner here).
  if v_lot.status = 'active' and v_lot.ends_at <= now() then
    update public.auction_lots
       set status = 'ended'
     where id = v_lot.id;
    v_lot.status := 'ended';
  end if;

  if v_lot.status <> 'active' then
    return json_build_object('ok', false, 'error', 'auction_not_active', 'status', v_lot.status);
  end if;

  if now() < v_lot.starts_at then
    return json_build_object('ok', false, 'error', 'auction_not_started');
  end if;

  if now() >= v_lot.ends_at then
    return json_build_object('ok', false, 'error', 'auction_ended');
  end if;

  if v_lot.seller_id = v_bidder then
    return json_build_object('ok', false, 'error', 'seller_cannot_bid');
  end if;

  if p_amount is null or p_amount <= 0 then
    return json_build_object('ok', false, 'error', 'invalid_amount');
  end if;

  v_min_next := v_lot.current_price + v_lot.bid_increment;

  if p_amount < v_min_next then
    return json_build_object(
      'ok', false,
      'error', 'below_min_bid',
      'min_next', v_min_next,
      'current_price', v_lot.current_price,
      'bid_increment', v_lot.bid_increment
    );
  end if;

  -- Insert the bid record
  insert into public.auction_bids (lot_id, bidder_id, amount)
  values (p_lot_id, v_bidder, p_amount);

  -- Update lot state atomically. We set the fields the RLS column grants
  -- revoke from authenticated users; only this SECURITY DEFINER path can
  -- write them.
  update public.auction_lots
     set current_price     = p_amount,
         current_winner_id = v_bidder,
         bid_count         = bid_count + 1
   where id = p_lot_id;

  return json_build_object(
    'ok', true,
    'current_price', p_amount,
    'bid_count', v_lot.bid_count + 1,
    'ends_at', v_lot.ends_at,
    'winner_id', v_bidder
  );
end;
$$;

-- Lock down who may call place_bid
revoke all on function public.place_bid(bigint, numeric) from public;
grant execute on function public.place_bid(bigint, numeric) to authenticated;

comment on function public.place_bid(bigint, numeric) is
  'Atomic auction bid. Enforces active status, window, seller<>bidder, min increment. Returns {ok, current_price, bid_count, ends_at, winner_id} or {ok:false, error}.';

-- ============================================================================
-- close_auction(p_lot_id) -> json
--   Admin-only hard-close. Flips status to ended. Does not modify winner.
-- ============================================================================
create or replace function public.close_auction(p_lot_id bigint)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_lot record;
begin
  if not public.is_admin() then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_lot from public.auction_lots where id = p_lot_id for update;
  if not found then
    return json_build_object('ok', false, 'error', 'lot_not_found');
  end if;

  update public.auction_lots
     set status = 'ended'
   where id = p_lot_id;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.close_auction(bigint) from public;
grant execute on function public.close_auction(bigint) to authenticated;

comment on function public.close_auction(bigint) is
  'Admin-only: force an auction lot to ended status. Returns {ok:true} or {ok:false, error}.';

-- ============================================================================
-- set_user_role(p_target, p_role) -> json
--   Admin-only role assignment. Avoids client-side writes to profiles.role.
-- ============================================================================
create or replace function public.set_user_role(
  p_target uuid,
  p_role text
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_role not in ('user', 'admin') then
    return json_build_object('ok', false, 'error', 'invalid_role');
  end if;

  if p_target is null then
    return json_build_object('ok', false, 'error', 'invalid_target');
  end if;

  -- Prevent an admin from removing their own admin privileges by accident
  -- (leaves at least the caller as admin).
  if p_target = auth.uid() and p_role = 'user' then
    return json_build_object('ok', false, 'error', 'cannot_demote_self');
  end if;

  update public.profiles
     set role = p_role
   where id = p_target;

  if not found then
    return json_build_object('ok', false, 'error', 'profile_not_found');
  end if;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.set_user_role(uuid, text) from public;
grant execute on function public.set_user_role(uuid, text) to authenticated;

comment on function public.set_user_role(uuid, text) is
  'Admin-only: set profiles.role for another user (user|admin). Returns {ok:true} or {ok:false, error}.';

commit;
