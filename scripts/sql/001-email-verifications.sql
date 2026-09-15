-- Pending registrations awaiting their code.
--
-- This project has no migration history (see the `_migrations:README`
-- note in package.json), so a new collection reaches an existing
-- database either through PAYLOAD_DB_PUSH=true on a development boot,
-- or through this file on a database that must not be pushed to.
--
-- Payload keeps a relation column per collection in
-- payload_locked_documents_rels; the collection table alone is not
-- enough, and its absence surfaces as "column ... does not exist" on
-- the first write.
--
-- Safe to run more than once.

create table if not exists public.email_verifications (
  id          serial primary key,
  email_hash  varchar not null,
  code_hash   varchar not null,
  pending     jsonb   not null,
  expires_at  timestamp(3) with time zone not null,
  attempts    numeric not null default 0,
  updated_at  timestamp(3) with time zone not null default now(),
  created_at  timestamp(3) with time zone not null default now()
);

create unique index if not exists email_verifications_email_hash_idx
  on public.email_verifications (email_hash);
create index if not exists email_verifications_expires_at_idx
  on public.email_verifications (expires_at);
create index if not exists email_verifications_updated_at_idx
  on public.email_verifications (updated_at);
create index if not exists email_verifications_created_at_idx
  on public.email_verifications (created_at);

alter table public.payload_locked_documents_rels
  add column if not exists email_verifications_id integer;

create index if not exists payload_locked_documents_rels_email_verifications_id_idx
  on public.payload_locked_documents_rels (email_verifications_id);

do $$ begin
  alter table public.payload_locked_documents_rels
    add constraint payload_locked_documents_rels_email_verifications_fk
    foreign key (email_verifications_id)
    references public.email_verifications(id) on delete cascade;
exception when duplicate_object then null; end $$;
