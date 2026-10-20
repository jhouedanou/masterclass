-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — numero attestation imprevisible
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 44 sur 44 · source : 20261020200200_numero_attestation_imprevisible.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- Attestations : numéros non devinables.
--
-- Le numéro était tiré d'une séquence (`EMBF-ENT-2026-000128`, puis
-- `…000129`) : qui en connaissait un les connaissait tous, et la page publique
-- de vérification rendait pour chacun le nom de l'apprenant. Le comptage par
-- adresse freinait le balayage sans l'empêcher (plusieurs adresses suffisent).
--
-- Les numéros délivrés à partir d'ici portent un dernier groupe de huit
-- caractères hexadécimaux, tiré par `gen_random_uuid()` (générateur
-- cryptographique de PostgreSQL) : `EMBF-ENT-2026-000140-3FA9C21B`. Le
-- groupe séquentiel reste, il ordonne les attestations pour l'équipe ; c'est
-- le suffixe qui rend le numéro impossible à deviner (2^32 possibilités pour
-- un rang donné). Un tirage plutôt qu'un HMAC : la vérification passe de
-- toute façon par la base, et un HMAC y aurait demandé une clé.
--
-- Les numéros déjà délivrés et imprimés ne changent pas.
--
-- Seule la fonction change ; son corps reprend celui de la migration 41.

create or replace function delivrer_certificat(
  p_utilisateur_id text,
  p_module_id      text
)
returns certificats
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_existant    certificats%rowtype;
  v_acces       acces%rowtype;
  v_certificat  certificats%rowtype;
  v_utilisateur utilisateurs%rowtype;
  v_module      modules%rowtype;
  v_programme   programmes%rowtype;
  v_thematique  thematiques%rowtype;
  v_formateur   formateurs%rowtype;
  v_code        text;
begin
  select * into v_existant
    from certificats
   where utilisateur_id = p_utilisateur_id
     and module_id = p_module_id;

  -- La délivrance est idempotente : redemander son certificat le renvoie.
  if found then
    return v_existant;
  end if;

  select * into v_acces
    from acces
   where utilisateur_id = p_utilisateur_id
     and module_id = p_module_id;

  if not found or v_acces.revoque_le is not null then
    raise exception 'Ce module ne fait pas partie de vos accès'
      using errcode = 'EM409';
  end if;

  if v_acces.progression < 100 then
    raise exception 'Le module doit être réalisé intégralement avant la délivrance'
      using errcode = 'EM409';
  end if;

  if exists (select 1 from quiz where module_id = p_module_id)
     and not exists (
       select 1 from quiz_tentatives
        where utilisateur_id = p_utilisateur_id
          and module_id = p_module_id
          and reussi
     ) then
    raise exception 'Le quiz du module doit être réussi à 100 %% avant la délivrance'
      using errcode = 'EM409';
  end if;

  select * into v_utilisateur from utilisateurs where id = p_utilisateur_id;
  select * into v_module from modules where id = p_module_id;
  select * into v_programme from programmes where slug = v_module.programme;
  select * into v_thematique from thematiques where id = v_module.thematique_id;
  select * into v_formateur from formateurs where id = v_module.formateur_id;

  v_code := case v_module.programme
              when 'entrepreneurs' then 'ENT'
              when 'social-media'  then 'SOM'
              else 'GEN'
            end;

  insert into certificats (
    numero, utilisateur_id, module_id, prenom_nom, titre_module, programme,
    thematique, formateur, duree_minutes, date_realisation, date_delivrance,
    taux_completion
  )
  values (
    format('EMBF-%s-%s-%s-%s', v_code, extract(year from current_date)::int,
           lpad(nextval('seq_certificat')::text, 6, '0'),
           upper(left(replace(gen_random_uuid()::text, '-', ''), 8))),
    p_utilisateur_id,
    p_module_id,
    v_utilisateur.prenom || ' ' || v_utilisateur.nom,
    v_module.titre,
    v_programme.nom,
    v_thematique.nom,
    v_formateur.nom,
    v_module.duree_minutes,
    coalesce(v_acces.termine_le, current_date),
    current_date,
    100
  )
  returning * into v_certificat;

  return v_certificat;
end;
$$;

revoke execute on function public.delivrer_certificat(text, text) from anon, authenticated, public;
grant execute on function public.delivrer_certificat(text, text) to service_role;
