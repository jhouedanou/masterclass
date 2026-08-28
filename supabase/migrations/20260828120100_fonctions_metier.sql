-- ---------------------------------------------------------------------------
-- Déclencheurs et fonctions métier
--
-- Deux opérations étaient exposées à une course dans l'implémentation en
-- mémoire : la réservation d'une place de coaching collectif (lecture de
-- `inscrits` puis écriture) et la numérotation d'un certificat (dérivée de la
-- longueur du tableau). Elles passent ici en fonction transactionnelle.
--
-- Les exceptions portent un SQLSTATE dédié, relayé tel quel par PostgREST dans
-- `error.code` : `server/database/erreurs.ts` le traduit en statut HTTP.
--   EM404 introuvable · EM403 interdit · EM409 conflit · EM422 requête invalide
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Fraîcheur des fiches
-- ---------------------------------------------------------------------------

create or replace function touch_maj_le()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.maj_le := now();
  return new;
end;
$$;

comment on function touch_maj_le is
  'Alimente `maj_le`, publié en lastmod dans le sitemap (spec SEO §8).';

create trigger programmes_maj_le
  before update on programmes
  for each row execute function touch_maj_le();

create trigger formateurs_maj_le
  before update on formateurs
  for each row execute function touch_maj_le();

create trigger modules_maj_le
  before update on modules
  for each row execute function touch_maj_le();

create trigger articles_maj_le
  before update on articles
  for each row execute function touch_maj_le();

create trigger reglages_financiers_maj_le
  before update on reglages_financiers
  for each row execute function touch_maj_le();

create trigger reglages_seo_maj_le
  before update on reglages_seo
  for each row execute function touch_maj_le();

-- ---------------------------------------------------------------------------
-- Compteur d'inscrits
--
-- `sessions_coaching.inscrits` reste dénormalisé : il porte aussi les
-- inscriptions de démonstration, qui n'ont pas de ligne détaillée. Le
-- déclencheur garantit qu'aucun chemin d'écriture ne le laisse dériver.
-- ---------------------------------------------------------------------------

create or replace function synchroniser_inscrits_session()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update sessions_coaching
       set inscrits = inscrits + 1
     where id = new.session_id;
    return new;
  else
    update sessions_coaching
       set inscrits = greatest(inscrits - 1, 0)
     where id = old.session_id;
    return old;
  end if;
end;
$$;

create trigger inscriptions_sessions_compteur
  after insert or delete on inscriptions_sessions
  for each row execute function synchroniser_inscrits_session();

-- ---------------------------------------------------------------------------
-- Réservation d'une place en coaching collectif
--
-- Trois conditions cumulatives, reprises telles quelles de l'API : posséder un
-- module de la thématique, avoir une fiche apprenant complète, et soumettre ses
-- sujets — ces réponses sont transmises au formateur avant la séance.
-- ---------------------------------------------------------------------------

create or replace function reserver_place_session(
  p_session_id     text,
  p_utilisateur_id text,
  p_preoccupation  text,
  p_attente        text,
  p_apprenant      text
)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_session   sessions_coaching%rowtype;
  v_fiche_ok  boolean;
begin
  if coalesce(btrim(p_preoccupation), '') = ''
     or coalesce(btrim(p_attente), '') = '' then
    raise exception 'Les deux réponses sont obligatoires' using errcode = 'EM422';
  end if;

  -- Le verrou de ligne sérialise les réservations concurrentes : c'est lui qui
  -- rend fiable la comparaison places/inscrits qui suit.
  select * into v_session
    from sessions_coaching
   where id = p_session_id
     for update;

  if not found or v_session.statut <> 'planifiee' then
    raise exception 'Session introuvable ou annulée' using errcode = 'EM404';
  end if;

  select fiche_completee into v_fiche_ok
    from utilisateurs
   where id = p_utilisateur_id;

  if not found then
    raise exception 'Apprenant introuvable' using errcode = 'EM404';
  end if;

  if not v_fiche_ok then
    raise exception 'Complétez votre fiche apprenant avant de réserver'
      using errcode = 'EM403';
  end if;

  if not exists (
    select 1
      from acces a
      join modules m on m.id = a.module_id
     where a.utilisateur_id = p_utilisateur_id
       and m.thematique_id = v_session.thematique_id
  ) then
    raise exception 'Cette session est réservée aux acheteurs d''un module de la thématique'
      using errcode = 'EM403';
  end if;

  if exists (
    select 1
      from inscriptions_sessions
     where session_id = p_session_id
       and utilisateur_id = p_utilisateur_id
  ) then
    raise exception 'Vous êtes déjà inscrit à cette session' using errcode = 'EM409';
  end if;

  if v_session.inscrits >= v_session.places then
    raise exception 'Session complète' using errcode = 'EM409';
  end if;

  -- Le compteur est incrémenté par le déclencheur sur inscriptions_sessions.
  insert into inscriptions_sessions (session_id, utilisateur_id)
  values (p_session_id, p_utilisateur_id);

  insert into sujets_sessions (session_id, utilisateur_id, apprenant, preoccupation, attente)
  values (p_session_id, p_utilisateur_id, p_apprenant, btrim(p_preoccupation), btrim(p_attente));

  return v_session.inscrits + 1;
end;
$$;

-- ---------------------------------------------------------------------------
-- Délivrance d'un certificat de participation
--
-- Le numéro suit le format EMBF-<code programme>-<année>-<séquence sur 6>.
-- La séquence Postgres remplace le compteur dérivé de la taille du tableau :
-- deux délivrances simultanées ne peuvent plus produire le même numéro.
-- ---------------------------------------------------------------------------

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

  if not found or v_acces.progression < 100 then
    raise exception 'Le module doit être réalisé intégralement avant la délivrance'
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
    format('EMBF-%s-%s-%s', v_code, extract(year from current_date)::int,
           lpad(nextval('seq_certificat')::text, 6, '0')),
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

-- ---------------------------------------------------------------------------
-- Attribution d'un accès gratuit par un administrateur
--
-- Distincte d'un achat : motif obligatoire et action journalisée.
-- ---------------------------------------------------------------------------

create or replace function attribuer_acces(
  p_utilisateur_id text,
  p_module_id      text,
  p_motif          text,
  p_auteur         text
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_apprenant text;
  v_titre     text;
begin
  if coalesce(btrim(p_motif), '') = '' then
    raise exception 'Le motif est obligatoire' using errcode = 'EM422';
  end if;

  select prenom || ' ' || nom into v_apprenant
    from utilisateurs where id = p_utilisateur_id;
  select titre into v_titre
    from modules where id = p_module_id;

  if v_apprenant is null or v_titre is null then
    raise exception 'Apprenant ou module introuvable' using errcode = 'EM404';
  end if;

  if exists (
    select 1 from acces
     where utilisateur_id = p_utilisateur_id and module_id = p_module_id
  ) then
    raise exception 'Cet apprenant possède déjà ce module' using errcode = 'EM409';
  end if;

  insert into acces (utilisateur_id, module_id) values (p_utilisateur_id, p_module_id);

  insert into journal (auteur, action, cible)
  values (
    p_auteur,
    'a attribué un accès gratuit',
    format('%s — %s (motif : %s)', v_apprenant, v_titre, btrim(p_motif))
  );
end;
$$;
