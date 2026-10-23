-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — suppression formateur
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 46 sur 46 · source : 20261023140000_suppression_formateur.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- Suppression définitive d'un formateur (planche C, écran 11, « Supprimer »).
--
-- Le bouton existait sans rien derrière. Supprimer une fiche formateur, c'est
-- aussi supprimer le compte qui y entre : tout formateur créé depuis le
-- back-office en a un (`utilisateurs.formateur_id`). Les deux disparaissent
-- ensemble ou pas du tout, d'où une fonction plutôt que deux `delete` côté
-- serveur — une coupure entre les deux laisserait un compte sans fiche.
--
-- Ce qui bloque, et reste bloquant : tout ce qui porte le nom du formateur ou
-- dépend de sa fiche, sans exception de statut. Un module en brouillon a un
-- auteur, une session passée a eu des présents, une demande de coaching close
-- garde son historique, une candidature acceptée renvoie à la fiche, un
-- article est signé. Côté compte, une commande, une transaction ou un
-- certificat sont des pièces comptables ou des attestations délivrées. Les
-- clés étrangères les protègent déjà (`on delete restrict` par défaut) ; la
-- fonction les compte d'abord pour que le refus dise lesquelles.
--
-- Le reste suit le compte en cascade (notes, codes, jetons d'invitation,
-- codes de secours…) ou se détache (`connexions`, vidéos déposées).
--
-- L'archivage — retirer un formateur de la vitrine sans rien effacer — est
-- une autre affaire, à traiter à part.

create or replace function bloquants_suppression_formateurs(
  p_formateur_id text default null
)
returns table (
  formateur_id      text,
  modules           integer,
  sessions          integer,
  demandes_coaching integer,
  candidatures      integer,
  articles          integer,
  commandes         integer,
  transactions      integer,
  certificats       integer
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    f.id,
    (select count(*)::int from modules m where m.formateur_id = f.id),
    (select count(*)::int from sessions_coaching s where s.formateur_id = f.id),
    (select count(*)::int from demandes_coaching_prive d where d.formateur_id = f.id),
    (select count(*)::int from candidatures_formateurs c where c.formateur_id = f.id),
    (select count(*)::int from articles a where a.auteur_id = f.id),
    (select count(*)::int from commandes co join utilisateurs u on u.id = co.utilisateur_id where u.formateur_id = f.id),
    (select count(*)::int from transactions t join utilisateurs u on u.id = t.utilisateur_id where u.formateur_id = f.id),
    (select count(*)::int from certificats ce join utilisateurs u on u.id = ce.utilisateur_id where u.formateur_id = f.id)
  from formateurs f
  where p_formateur_id is null or f.id = p_formateur_id;
$$;

create or replace function supprimer_formateur(p_formateur_id text)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_formateur formateurs%rowtype;
  v_bloquants record;
  v_comptes   text[];
begin
  -- Verrou sur la fiche : une insertion qui la référence (module, session…)
  -- attend la fin de la transaction, le décompte ci-dessous reste donc vrai
  -- jusqu'au `delete`.
  select * into v_formateur from formateurs where id = p_formateur_id for update;
  if not found then
    raise exception 'Formateur introuvable' using errcode = 'EM404';
  end if;

  select * into v_bloquants from bloquants_suppression_formateurs(p_formateur_id);
  -- Le serveur a déjà vérifié et rédigé le refus détaillé ; ce contrôle-ci
  -- couvre ce qui a pu être rattaché entre-temps.
  if v_bloquants.modules + v_bloquants.sessions + v_bloquants.demandes_coaching
     + v_bloquants.candidatures + v_bloquants.articles + v_bloquants.commandes
     + v_bloquants.transactions + v_bloquants.certificats > 0 then
    raise exception 'Des éléments viennent d’être rattachés à ce formateur : rechargez la page.'
      using errcode = 'EM409';
  end if;

  with supprimes as (
    delete from utilisateurs where formateur_id = p_formateur_id returning email
  )
  select coalesce(array_agg(email), '{}') into v_comptes from supprimes;

  delete from formateurs where id = p_formateur_id;

  return jsonb_build_object('nom', v_formateur.nom, 'comptes', to_jsonb(v_comptes));
end;
$$;

revoke execute on function public.bloquants_suppression_formateurs(text) from anon, authenticated, public;
grant execute on function public.bloquants_suppression_formateurs(text) to service_role;
revoke execute on function public.supprimer_formateur(text) from anon, authenticated, public;
grant execute on function public.supprimer_formateur(text) to service_role;
