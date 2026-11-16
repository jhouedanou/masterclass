-- ---------------------------------------------------------------------------
-- Anomalies libres de la recette (écran /admin/recette)
--
-- Ce qu'un testeur remarque hors des contrôles prévus : une page qui casse,
-- un libellé faux, un écran oublié de la liste. Contrairement aux résultats,
-- une anomalie n'est rattachée à aucun contrôle et un même testeur peut en
-- signaler autant qu'il veut.
--
-- `corrigee_le` est posé quand l'équipe la déclare corrigée ; l'anomalie reste
-- visible, barrée, pour garder la trace de la campagne.
-- ---------------------------------------------------------------------------

create table if not exists recette_anomalies (
  id          uuid primary key default gen_random_uuid(),
  testeur_id  text not null references utilisateurs(id) on delete cascade,
  page        text not null default '' check (char_length(page) <= 300),
  description text not null check (char_length(description) between 1 and 2000),
  cree_le     timestamptz not null default now(),
  corrigee_le timestamptz
);

comment on table recette_anomalies is
  'Anomalies signalées pendant la recette (/admin/recette), hors des contrôles décrits dans server/data/recette.ts.';

create index if not exists recette_anomalies_cree_le_idx on recette_anomalies (cree_le desc);

-- Même posture que le reste du schéma : lecture et écriture par le serveur
-- applicatif seulement, la clé publique ne voit rien.
alter table recette_anomalies enable row level security;
revoke all on recette_anomalies from anon, authenticated;
