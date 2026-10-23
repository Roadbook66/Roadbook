-- =========================================================================
-- Roadbook — la base de la communauté (Supabase)
-- À coller une fois dans Supabase : SQL Editor → New query → Run.
-- Les avis et les photos sont envoyés « en attente » ; rien n’est visible
-- tant qu’une modératrice ne les a pas publiés.
-- =========================================================================

-- Les avis sur les aires, campings et parkings
create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  cree_le timestamptz not null default now(),
  lieu_cle text not null check (char_length(lieu_cle) <= 40),           -- « lat,lon » du lieu
  lieu_nom text check (char_length(lieu_nom) <= 120),
  lieu_type text check (lieu_type in ('A','C','P','V','E')),
  lat double precision not null check (lat between -90 and 90),
  lon double precision not null check (lon between -180 and 180),
  pays text check (char_length(pays) <= 3),
  existe text check (existe in ('oui','ferme','introuvable')),
  note smallint check (note between 1 and 5),
  eau text check (eau in ('oui','non')),
  vidange text check (vidange in ('oui','non')),
  elec text check (elec in ('oui','non')),
  douche text check (douche in ('oui','non')),
  chiens text check (chiens in ('oui','non')),
  payant text check (payant in ('gratuit','payant')),
  prix text check (char_length(prix) <= 40),
  texte text check (char_length(texte) <= 1000),
  pseudo text check (char_length(pseudo) <= 40),
  visite_le date,
  photos text[] not null default '{}' check (coalesce(array_length(photos, 1), 0) <= 3),
  statut text not null default 'en_attente' check (statut in ('en_attente','publie','refuse'))
);
create index if not exists contributions_lieu on public.contributions (lieu_cle) where statut = 'publie';
create index if not exists contributions_attente on public.contributions (cree_le) where statut = 'en_attente';

-- Les signalements d’un avis publié
create table if not exists public.signalements (
  id uuid primary key default gen_random_uuid(),
  cree_le timestamptz not null default now(),
  contribution_id uuid not null references public.contributions(id) on delete cascade,
  raison text check (char_length(raison) <= 300),
  traite boolean not null default false
);

-- Les modératrices et modérateurs (par adresse e-mail de connexion)
create table if not exists public.moderateurs (email text primary key);
insert into public.moderateurs (email) values ('roadbook.contact@gmail.com') on conflict do nothing;

create or replace function public.est_moderateur() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.moderateurs where email = (auth.jwt() ->> 'email'));
$$;

alter table public.contributions enable row level security;
alter table public.signalements enable row level security;
alter table public.moderateurs enable row level security;

-- Tout le monde lit ce qui est publié ; tout le monde peut envoyer, seulement « en attente »
drop policy if exists "lire les avis publiés" on public.contributions;
create policy "lire les avis publiés" on public.contributions for select to anon, authenticated using (statut = 'publie');
drop policy if exists "envoyer un avis" on public.contributions;
create policy "envoyer un avis" on public.contributions for insert to anon, authenticated with check (statut = 'en_attente');
drop policy if exists "modérer : lire" on public.contributions;
create policy "modérer : lire" on public.contributions for select to authenticated using (public.est_moderateur());
drop policy if exists "modérer : changer" on public.contributions;
create policy "modérer : changer" on public.contributions for update to authenticated using (public.est_moderateur()) with check (public.est_moderateur());
drop policy if exists "modérer : supprimer" on public.contributions;
create policy "modérer : supprimer" on public.contributions for delete to authenticated using (public.est_moderateur());

drop policy if exists "signaler" on public.signalements;
create policy "signaler" on public.signalements for insert to anon, authenticated with check (traite = false);
drop policy if exists "modérer les signalements" on public.signalements;
create policy "modérer les signalements" on public.signalements for all to authenticated using (public.est_moderateur()) with check (public.est_moderateur());

-- Les photos : en attente (privées), puis publiées (publiques) par la modération
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('photos-attente', 'photos-attente', false, 2097152, array['image/jpeg'])
  on conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg'];
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('photos', 'photos', true, 2097152, array['image/jpeg'])
  on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg'];

drop policy if exists "envoyer une photo" on storage.objects;
create policy "envoyer une photo" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'photos-attente' and storage.extension(name) = 'jpg');
drop policy if exists "modérer les photos" on storage.objects;
create policy "modérer les photos" on storage.objects for all to authenticated
  using (bucket_id in ('photos-attente', 'photos') and public.est_moderateur())
  with check (bucket_id in ('photos-attente', 'photos') and public.est_moderateur());

-- Chaque avis est signé d’un prénom ou d’un pseudo (2 caractères au moins)
alter table public.contributions add constraint contributions_pseudo_obligatoire
  check (pseudo is not null and char_length(btrim(pseudo)) >= 2) not valid;

-- =========================================================================
-- Les vérifications de Roadbook : « j’y suis allée, c’est vérifié »
-- Lisibles par tous, écrites seulement par les modératrices (mode administratrice)
-- =========================================================================
create table if not exists public.verifications (
  cle text primary key check (char_length(cle) <= 200),     -- lieu:<lat,lon> · etape:<id> · repere:<id>:<nom>
  type text not null check (type in ('lieu','etape','repere')),
  nom text check (char_length(nom) <= 160),
  lat double precision check (lat between -90 and 90),
  lon double precision check (lon between -180 and 180),
  pays text check (char_length(pays) <= 3),
  visite_le date,
  eau text check (eau in ('oui','non')),
  vidange text check (vidange in ('oui','non')),
  elec text check (elec in ('oui','non')),
  douche text check (douche in ('oui','non')),
  chiens text check (chiens in ('oui','non')),
  payant text check (payant in ('gratuit','payant')),
  prix text check (char_length(prix) <= 40),
  note text check (char_length(note) <= 600),
  maj_le timestamptz not null default now()
);
alter table public.verifications enable row level security;
drop policy if exists "lire les vérifications" on public.verifications;
create policy "lire les vérifications" on public.verifications for select to anon, authenticated using (true);
drop policy if exists "vérifier : ajouter" on public.verifications;
create policy "vérifier : ajouter" on public.verifications for insert to authenticated with check (public.est_moderateur());
drop policy if exists "vérifier : changer" on public.verifications;
create policy "vérifier : changer" on public.verifications for update to authenticated using (public.est_moderateur()) with check (public.est_moderateur());
drop policy if exists "vérifier : retirer" on public.verifications;
create policy "vérifier : retirer" on public.verifications for delete to authenticated using (public.est_moderateur());

-- =========================================================================
-- Les ajouts de Roadbook : idées de visite, étapes, aires et campings ajoutés
-- depuis l’appli (mode administratrice). Lisibles par tous, écrits par les modératrices.
-- =========================================================================
create table if not exists public.ajouts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('idee','etape','lieu')),
  etape_id text check (char_length(etape_id) <= 80),
  nom text not null check (char_length(btrim(nom)) between 2 and 160),
  texte text check (char_length(texte) <= 600),
  idees jsonb check (idees is null or (jsonb_typeof(idees) = 'array' and jsonb_array_length(idees) <= 6)),
  lat double precision check (lat between -90 and 90),
  lon double precision check (lon between -180 and 180),
  pays text check (char_length(pays) <= 3),
  lieu_type text check (lieu_type in ('A','C','P')),
  eau text check (eau in ('oui','non')),
  vidange text check (vidange in ('oui','non')),
  elec text check (elec in ('oui','non')),
  douche text check (douche in ('oui','non')),
  chiens text check (chiens in ('oui','non')),
  payant text check (payant in ('gratuit','payant')),
  prix text check (char_length(prix) <= 40),
  visite_le date,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  check (type = 'idee' or (lat is not null and lon is not null))
);
alter table public.ajouts enable row level security;
drop policy if exists "lire les ajouts" on public.ajouts;
create policy "lire les ajouts" on public.ajouts for select to anon, authenticated using (true);
drop policy if exists "ajouter : créer" on public.ajouts;
create policy "ajouter : créer" on public.ajouts for insert to authenticated with check (public.est_moderateur());
drop policy if exists "ajouter : changer" on public.ajouts;
create policy "ajouter : changer" on public.ajouts for update to authenticated using (public.est_moderateur()) with check (public.est_moderateur());
drop policy if exists "ajouter : retirer" on public.ajouts;
create policy "ajouter : retirer" on public.ajouts for delete to authenticated using (public.est_moderateur());
