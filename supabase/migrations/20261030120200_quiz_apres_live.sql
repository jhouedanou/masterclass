-- Quiz et certificat ouverts aux inscrits d'une Live Session terminée (CDC 10.D).
--
-- Le quiz d'un module ne s'ouvre qu'à 100 % de progression vidéo
-- (…_quiz_apres_videos.sql), le certificat aussi. Un inscrit à une Live
-- Session n'a pas de vidéo à voir tant que la version montée n'est pas
-- publiée : la fin de sa session (`live_terminee_pour`) vaut progression
-- complète. Le reste de la mécanique ne change pas.
--
-- Seules les deux conditions changent ; les corps reprennent ceux de
-- …_quiz_apres_videos.sql et …_numero_attestation_imprevisible.sql.

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
  if v_acces.progression < 100 and not live_terminee_pour(p_utilisateur_id, p_module_id) then
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

  if v_acces.progression < 100 and not live_terminee_pour(p_utilisateur_id, p_module_id) then
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

revoke execute on function
  public.soumettre_quiz(text, text, jsonb),
  public.delivrer_certificat(text, text)
  from anon, authenticated, public;

grant execute on function
  public.soumettre_quiz(text, text, jsonb),
  public.delivrer_certificat(text, text)
  to service_role;
