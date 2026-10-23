-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — quiz apres videos
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 43 sur 46 · source : 20261020200100_quiz_apres_videos.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- Quiz : ouvert seulement après toutes les vidéos du module.
--
-- L'audit du 20/10 a relevé que le quiz se réussissait par élimination : ✓ ou
-- ✗ par question, options dans un ordre fixe, trois tentatives par jour. Le
-- serveur mélange désormais les options à chaque tentative (voir
-- server/utils/quiz.ts) ; la base, elle, refuse une soumission tant que la
-- progression de l'accès n'est pas à 100 %, comme pour l'attestation.
--
-- Seule la fonction change ; son corps reprend celui de la migration du quiz,
-- refus ajouté après celui d'un quiz déjà réussi : une réussite antérieure à
-- cette règle garde son message.

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

  -- Le quiz suit la formation : il ne s'ouvre qu'une fois toutes les vidéos
  -- vues. Ouvert dès l'achat, il se réussissait par élimination, sans elle.
  if v_acces.progression < 100 then
    raise exception 'Terminez toutes les vidéos du module pour ouvrir le quiz'
      using errcode = 'EM409';
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
  'Corrige une soumission (vidéos vues à 100 %), la compte dans le quota du jour (heure d''Abidjan) et renvoie la note et les corrections, sans jamais la bonne réponse.';
