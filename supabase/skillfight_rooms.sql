-- Apply to the dedicated SkillFight Supabase project via SQL Editor.
-- Private room identifiers/passwords are gameplay join secrets, NOT user authentication.
create extension if not exists pgcrypto with schema extensions;
create table if not exists public.skillfight_rooms (
  id text primary key check (id ~ '^SB-[0-9]{6}$'),
  name text not null check (length(name) between 2 and 30),
  host_name text not null check (length(host_name) between 2 and 40),
  guest_name text,
  pin_hash text not null,
  status text not null default 'waiting' check (status in ('waiting','active','finished')),
  created_at timestamptz not null default now()
);
create index if not exists skillfight_rooms_created_at_idx on public.skillfight_rooms(created_at);
alter table public.skillfight_rooms enable row level security;
revoke all on public.skillfight_rooms from public, anon, authenticated;

create or replace function public.skillfight_create_room(p_room_id text, p_room_name text, p_host_name text, p_room_pin text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.skillfight_rooms;
begin
  if p_room_id !~ '^SB-[0-9]{6}$' or p_room_name !~ '^[A-Za-z ]{2,30}$'
    or length(trim(p_host_name)) not between 2 and 40
    or p_room_pin !~ '^[0-9]{1,6}$' then
    raise exception 'Invalid room details';
  end if;
  insert into public.skillfight_rooms(id,name,host_name,pin_hash)
  values(p_room_id,trim(p_room_name),trim(p_host_name),
    extensions.crypt(p_room_pin, extensions.gen_salt('bf')))
  returning * into v;
  return jsonb_build_object('id',v.id,'name',v.name,'host_name',v.host_name,'guest_name',v.guest_name,'status',v.status);
end; $$;

create or replace function public.skillfight_check_room(p_room_id text, p_room_pin text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.skillfight_rooms;
begin
  select * into v from public.skillfight_rooms
  where id=p_room_id and created_at > now()-interval '24 hours';
  if not found or extensions.crypt(p_room_pin,v.pin_hash) <> v.pin_hash then return null; end if;
  return jsonb_build_object('id',v.id,'name',v.name,'host_name',v.host_name,'guest_name',v.guest_name,'status',v.status);
end; $$;

create or replace function public.skillfight_join_room(p_room_id text, p_room_pin text, p_guest_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.skillfight_rooms;
begin
  if length(trim(p_guest_name)) not between 2 and 40 then raise exception 'Invalid name'; end if;
  select * into v from public.skillfight_rooms where id=p_room_id for update;
  if not found or v.status <> 'waiting' or v.created_at < now()-interval '24 hours'
      or extensions.crypt(p_room_pin,v.pin_hash) <> v.pin_hash then
    raise exception 'Room not available or incorrect password';
  end if;
  if lower(trim(p_guest_name)) = lower(v.host_name) then raise exception 'Choose a different name'; end if;
  update public.skillfight_rooms set guest_name=trim(p_guest_name),status='active'
  where id=p_room_id returning * into v;
  return jsonb_build_object('id',v.id,'name',v.name,'host_name',v.host_name,'guest_name',v.guest_name,'status',v.status);
end; $$;

create or replace function public.skillfight_room_status(p_room_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.skillfight_rooms;
begin
  select * into v from public.skillfight_rooms
  where id=p_room_id and created_at > now()-interval '24 hours';
  if not found then return null; end if;
  return jsonb_build_object('id',v.id,'name',v.name,'host_name',v.host_name,'guest_name',v.guest_name,'status',v.status);
end; $$;

revoke all on function public.skillfight_create_room(text,text,text,text) from public;
revoke all on function public.skillfight_check_room(text,text) from public;
revoke all on function public.skillfight_join_room(text,text,text) from public;
revoke all on function public.skillfight_room_status(text) from public;
grant execute on function public.skillfight_create_room(text,text,text,text),
  public.skillfight_check_room(text,text),public.skillfight_join_room(text,text,text),
  public.skillfight_room_status(text) to anon,authenticated;
-- Production hardening: require authenticated identities, rate limit attempts,
-- and use private Realtime channels with participant authorization.
