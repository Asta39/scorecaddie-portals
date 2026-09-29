-- Friend requests: only the golfer a request was sent to can accept it.
--
-- The UPDATE policy lets either side of a Friend row change it, and the
-- INSERT policy only checks who is sending, so a modified app could create
-- a row already 'ACCEPTED' or accept its own request and appear on
-- someone's friends list without their say. This trigger enforces the rule
-- for signed-in users; the service role (auth.uid() is null) is unaffected.

create or replace function public.friend_request_rules()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  me text := (select auth.uid())::text;
begin
  if me is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status is distinct from 'PENDING' then
      raise exception 'A new friend request must be PENDING' using errcode = '42501';
    end if;
    if new."userId" = new."friendId" then
      raise exception 'You cannot send a friend request to yourself' using errcode = '22023';
    end if;
    return new;
  end if;

  -- UPDATE: the two golfers never change, and only the recipient accepts.
  if new."userId" is distinct from old."userId" or new."friendId" is distinct from old."friendId" then
    raise exception 'A friend request cannot be moved to other golfers' using errcode = '42501';
  end if;
  if new.status = 'ACCEPTED' and old.status is distinct from 'ACCEPTED' and me <> old."friendId" then
    raise exception 'Only the golfer the request was sent to can accept it' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists friend_request_rules on public."Friend";
create trigger friend_request_rules
  before insert or update on public."Friend"
  for each row execute function public.friend_request_rules();
