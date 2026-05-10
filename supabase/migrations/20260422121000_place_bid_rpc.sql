-- Admin RPC: set_user_role only (auction place_bid / close_auction removed for marketplace-only schema).

begin;

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
