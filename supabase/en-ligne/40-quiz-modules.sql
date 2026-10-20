-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — quiz modules
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 40 sur 40 · source : 20261020140000_quiz_modules.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Quiz des modules
--
-- Big Five livre avec chaque module un quiz de dix questions (schéma
-- `emasterclass-quiz/1.1`) et ses règles de passage : quatre propositions, une
-- seule bonne réponse, note sur 100, réussite à 100 %, trois tentatives par
-- jour et par apprenant. Après soumission, une question réussie montre sa
-- justification, une question manquée une piste et le chapitre à revoir ; la
-- bonne réponse n'est jamais affichée.
--
-- La correction se fait donc ici, et nulle part ailleurs : `soumettre_quiz`
-- reçoit les lettres choisies et ne renvoie que ce que l'apprenant a le droit
-- de voir. La bonne réponse et la justification d'une question manquée ne
-- sortent jamais de la base, pas même vers Nitro.
--
-- Le compteur de tentatives vit dans la même fonction. Deux soumissions
-- simultanées — deux onglets, un double clic — passent l'une après l'autre
-- derrière le verrou de la ligne `acces`, et l'unicité (apprenant, module,
-- jour, numéro) interdit de toute façon une quatrième tentative.
--
-- Le « jour » est celui d'Abidjan : le compteur repart à zéro à minuit, heure
-- de Côte d'Ivoire. `jour_abidjan()` en est la seule définition.
--
-- Enfin, l'attestation d'un module qui a un quiz exige désormais sa réussite :
-- `delivrer_certificat` est redéfinie en conséquence.
-- ---------------------------------------------------------------------------

create or replace function jour_abidjan()
returns date
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select (now() at time zone 'Africa/Abidjan')::date;
$$;

comment on function jour_abidjan is
  'Date du jour à Abidjan : borne du compteur de tentatives des quiz.';

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table quiz (
  module_id           text primary key references modules (id) on delete cascade on update cascade,
  -- Code du module dans la livraison Big Five (ENT_M04, SM_M05…).
  code                text not null,
  version             text not null,
  seuil_reussite      integer not null default 100 check (seuil_reussite between 1 and 100),
  tentatives_par_jour integer not null default 3 check (tentatives_par_jour > 0),
  cree_le             timestamptz not null default now(),
  maj_le              timestamptz not null default now()
);

comment on table quiz is
  'Quiz d''un module : un au plus. Sa présence rend la réussite obligatoire pour l''attestation.';

create trigger quiz_maj_le
  before update on quiz
  for each row execute function touch_maj_le();

create table quiz_questions (
  id              uuid primary key default gen_random_uuid(),
  module_id       text not null references quiz (module_id) on delete cascade on update cascade,
  position        integer not null check (position > 0),
  -- Identifiant de la livraison (Q01…Q10) : c'est lui qui indexe les réponses.
  code            text not null,
  niveau          text,
  competence      text,
  enonce          text not null,
  -- [{ id: 'A', texte: '…' }, …]
  options         jsonb not null,
  bonne_reponse   text not null,
  justification   text not null,
  piste_si_erreur text not null,
  -- Chapitres à revoir : [{ position, titre, debut_s, libelle }]. `position`
  -- est celle de `chapitres` (C00 = 0), `debut_s` l'instant à rejoindre.
  renvois         jsonb not null default '[]'::jsonb,
  unique (module_id, position),
  unique (module_id, code),
  constraint quiz_questions_options
    check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  constraint quiz_questions_bonne_reponse
    check (options @> jsonb_build_array(jsonb_build_object('id', bonne_reponse))),
  constraint quiz_questions_renvois
    check (jsonb_typeof(renvois) = 'array')
);

comment on table quiz_questions is
  'Questions d''un quiz. `bonne_reponse` et `justification` ne quittent la base que par soumettre_quiz, et seulement ce qui doit l''être.';

create table quiz_tentatives (
  id             uuid primary key default gen_random_uuid(),
  utilisateur_id text not null references utilisateurs (id) on delete cascade on update cascade,
  module_id      text not null references quiz (module_id) on delete cascade on update cascade,
  jour           date not null default jour_abidjan(),
  -- Rang de la tentative dans la journée : 1, 2, 3.
  numero         integer not null check (numero > 0),
  -- { Q01: 'C', … } : les lettres soumises, pour l'historique.
  reponses       jsonb not null,
  note           integer not null check (note between 0 and 100),
  reussi         boolean not null,
  cree_le        timestamptz not null default now(),
  unique (utilisateur_id, module_id, jour, numero)
);

comment on table quiz_tentatives is
  'Une ligne par soumission. La dernière donne la note affichée ; une ligne `reussi` débloque l''attestation.';

create index quiz_tentatives_apprenant
  on quiz_tentatives (utilisateur_id, module_id, cree_le desc);

-- Fermées comme toutes les autres (voir 20261015120000_fermer_lecture_publique.sql).
alter table quiz enable row level security;
alter table quiz_questions enable row level security;
alter table quiz_tentatives enable row level security;
revoke all on quiz, quiz_questions, quiz_tentatives from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Soumission corrigée
--
-- Renvoie { note, reussi, tentatives_utilisees, tentatives_max, corrections }.
-- Chaque correction porte `justification` si la réponse est juste, `piste` et
-- `renvois` sinon — jamais la bonne réponse.
-- ---------------------------------------------------------------------------

create or replace function soumettre_quiz(
  p_utilisateur_id text,
  p_module_id      text,
  p_reponses       jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_quiz        quiz%rowtype;
  v_acces       acces%rowtype;
  v_jour        date := jour_abidjan();
  v_tentatives  integer;
  v_total       integer;
  v_justes      integer;
  v_note        integer;
  v_reussi      boolean;
  v_corrections jsonb;
  v_reponses    jsonb;
begin
  select * into v_quiz from quiz where module_id = p_module_id;
  if not found then
    raise exception 'Ce module n''a pas de quiz' using errcode = 'EM404';
  end if;

  -- Le verrou de ligne sérialise les soumissions d'un même apprenant sur ce
  -- module : c'est lui qui rend fiable le compte des tentatives qui suit.
  select * into v_acces
    from acces
   where utilisateur_id = p_utilisateur_id
     and module_id = p_module_id
     for update;

  if not found or v_acces.revoque_le is not null then
    raise exception 'Ce module ne fait pas partie de vos accès' using errcode = 'EM403';
  end if;

  if exists (
    select 1 from quiz_tentatives
     where utilisateur_id = p_utilisateur_id
       and module_id = p_module_id
       and reussi
  ) then
    raise exception 'Vous avez déjà réussi ce quiz' using errcode = 'EM409';
  end if;

  select count(*) into v_tentatives
    from quiz_tentatives
   where utilisateur_id = p_utilisateur_id
     and module_id = p_module_id
     and jour = v_jour;

  if v_tentatives >= v_quiz.tentatives_par_jour then
    raise exception 'Plus de tentative aujourd''hui : le compteur repart à zéro à minuit, heure d''Abidjan'
      using errcode = 'EM409';
  end if;

  if p_reponses is null or jsonb_typeof(p_reponses) <> 'object' then
    raise exception 'Réponses illisibles' using errcode = 'EM422';
  end if;

  -- Chaque question attend une lettre parmi ses propres options : une réponse
  -- absente, vide ou inventée refuse la soumission sans consommer de tentative.
  if exists (
    select 1
      from quiz_questions q
     where q.module_id = p_module_id
       and not q.options @> jsonb_build_array(jsonb_build_object('id', p_reponses ->> q.code))
  ) then
    raise exception 'Répondez à toutes les questions avant de soumettre' using errcode = 'EM422';
  end if;

  select count(*),
         count(*) filter (where p_reponses ->> q.code = q.bonne_reponse),
         jsonb_agg(
           case
             when p_reponses ->> q.code = q.bonne_reponse then
               jsonb_build_object(
                 'code', q.code, 'position', q.position, 'correct', true,
                 'justification', q.justification)
             else
               jsonb_build_object(
                 'code', q.code, 'position', q.position, 'correct', false,
                 'piste', q.piste_si_erreur, 'renvois', q.renvois)
           end
           order by q.position),
         jsonb_object_agg(q.code, p_reponses ->> q.code)
    into v_total, v_justes, v_corrections, v_reponses
    from quiz_questions q
   where q.module_id = p_module_id;

  if v_total = 0 then
    raise exception 'Ce quiz n''a pas encore de questions' using errcode = 'EM404';
  end if;

  v_note := round(100.0 * v_justes / v_total);
  v_reussi := v_note >= v_quiz.seuil_reussite;

  insert into quiz_tentatives (utilisateur_id, module_id, jour, numero, reponses, note, reussi)
  values (p_utilisateur_id, p_module_id, v_jour, v_tentatives + 1, v_reponses, v_note, v_reussi);

  return jsonb_build_object(
    'note', v_note,
    'reussi', v_reussi,
    'tentatives_utilisees', v_tentatives + 1,
    'tentatives_max', v_quiz.tentatives_par_jour,
    'corrections', v_corrections
  );
end;
$$;

comment on function soumettre_quiz is
  'Corrige une soumission, la compte dans le quota du jour (heure d''Abidjan) et renvoie la note et les corrections, sans jamais la bonne réponse.';

-- ---------------------------------------------------------------------------
-- État des quiz d'un apprenant
--
-- Une ligne par module à quiz qu'il possède (ou pour le seul module demandé) :
-- c'est ce que lisent l'espace apprenant, la fiche module et le lecteur.
-- ---------------------------------------------------------------------------

create or replace function etats_quiz(
  p_utilisateur_id text,
  p_module_id      text default null
)
returns table (
  module_id       text,
  questions       integer,
  tentatives_max  integer,
  tentatives_jour integer,
  derniere_note   integer,
  derniere_le     timestamptz,
  reussi          boolean,
  reussi_le       timestamptz
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    z.module_id,
    (select count(*)::integer from quiz_questions q where q.module_id = z.module_id),
    z.tentatives_par_jour,
    (select count(*)::integer
       from quiz_tentatives t
      where t.utilisateur_id = p_utilisateur_id
        and t.module_id = z.module_id
        and t.jour = jour_abidjan()),
    derniere.note,
    derniere.cree_le,
    reussite.cree_le is not null,
    reussite.cree_le
  from quiz z
  join acces a
    on a.module_id = z.module_id
   and a.utilisateur_id = p_utilisateur_id
  left join lateral (
    select t.note, t.cree_le
      from quiz_tentatives t
     where t.utilisateur_id = p_utilisateur_id
       and t.module_id = z.module_id
     order by t.cree_le desc, t.numero desc
     limit 1
  ) derniere on true
  left join lateral (
    select min(t.cree_le) as cree_le
      from quiz_tentatives t
     where t.utilisateur_id = p_utilisateur_id
       and t.module_id = z.module_id
       and t.reussi
  ) reussite on true
  where p_module_id is null or z.module_id = p_module_id;
$$;

comment on function etats_quiz is
  'Pour chaque module à quiz que possède l''apprenant : tentatives du jour, dernière note, réussite.';

-- ---------------------------------------------------------------------------
-- Délivrance d'un certificat : le quiz s'ajoute aux conditions
--
-- Corps repris de 20260828120100_fonctions_metier.sql. Seul change le contrôle
-- d'éligibilité : un module qui a un quiz exige en plus sa réussite. Une
-- attestation déjà délivrée reste renvoyée telle quelle — le contrôle
-- d'idempotence passe avant tout le reste.
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
-- Droits : appelables depuis le serveur applicatif seulement
-- ---------------------------------------------------------------------------

revoke execute on function
  public.jour_abidjan(),
  public.soumettre_quiz(text, text, jsonb),
  public.etats_quiz(text, text),
  public.delivrer_certificat(text, text)
  from anon, authenticated, public;

grant execute on function
  public.jour_abidjan(),
  public.soumettre_quiz(text, text, jsonb),
  public.etats_quiz(text, text),
  public.delivrer_certificat(text, text)
  to service_role;
