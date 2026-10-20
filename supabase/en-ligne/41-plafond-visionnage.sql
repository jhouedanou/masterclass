-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — plafond visionnage
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 41 sur 41 · source : 20261020160000_plafond_visionnage.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Le relevé de visionnage ne peut plus aller plus vite que la montre
--
-- `enregistrer_visionnage` croyait le lecteur sur parole. Elle gardait le plus
-- grand relevé reçu, sans regarder quand il arrivait : un appel direct à
-- `POST /api/mon-espace/visionnage` avec `secondesVues: 99999`, répété sur
-- chaque chapitre, portait la progression du module à 100 % sans une seconde
-- de vidéo. Le quiz exigé pour l'attestation limite l'effet, mais la
-- progression vidéo restait déclarative.
--
-- La base confronte donc désormais chaque relevé au temps réellement écoulé.
-- Un chapitre ne gagne jamais plus de 2,5 secondes de film par seconde de
-- montre : la barre de lecture propose au plus 2×, et le demi-point restant
-- couvre l'arrondi des relevés et les écarts de réseau.
--
-- La tolérance de 15 secondes n'est pas offerte à chaque appel. Ajoutée telle
-- quelle à chaque relevé, elle se serait additionnée : quarante appels en
-- rafale validaient un chapitre de dix minutes en une seconde. C'est une
-- réserve, rangée dans `visionnages.marge_secondes`, qui se vide quand un
-- relevé avance plus vite que la montre et se remplit à 2,5 secondes par
-- seconde écoulée, sans jamais dépasser 15. Un premier relevé part d'une
-- réserve pleine, donc d'un plafond de 15 secondes depuis zéro.
--
-- Entre deux relevés, le droit acquis n'a pas de limite : un relevé perdu en
-- route ne coûte rien, puisque le lecteur envoie un total de chapitre et que
-- le suivant rattrape le retard. Le plafond rogne un relevé sans le refuser,
-- pour la même raison.
--
-- Ce que la règle ne fait pas : distinguer un apprenant qui regarde d'un
-- script qui attend. Elle oblige seulement à laisser passer le temps de la
-- vidéo, divisé par 2,5.
-- ---------------------------------------------------------------------------

alter table visionnages
  add column marge_secondes numeric not null default 15
    check (marge_secondes between 0 and 15);

comment on column visionnages.marge_secondes is
  'Réserve de tolérance du relevé, en secondes de film. Se vide quand un relevé avance plus vite que 2,5 s par seconde écoulée, se remplit à ce rythme, plafonnée à 15.';

create or replace function enregistrer_visionnage(
  p_utilisateur_id text,
  p_chapitre_id    uuid,
  p_secondes_vues  integer
) returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_module_id    text;
  v_anciennes    integer;
  v_marge        numeric;
  v_maj_le       timestamptz;
  v_disponible   numeric;
  v_retenues     integer;
  v_progression  integer;
begin
  if p_secondes_vues is null or p_secondes_vues < 0 then
    raise exception 'Temps de visionnage invalide' using errcode = 'EM422';
  end if;

  select module_id into v_module_id from chapitres where id = p_chapitre_id;
  if v_module_id is null then
    raise exception 'Chapitre introuvable' using errcode = 'EM404';
  end if;

  -- Le contrôle d'accès est porté par la base : un appel direct à la fonction
  -- ne peut pas contourner ce que l'API vérifie déjà.
  if not exists (
    select 1 from acces
     where utilisateur_id = p_utilisateur_id and module_id = v_module_id
  ) then
    raise exception 'Ce module ne fait pas partie de vos accès' using errcode = 'EM403';
  end if;

  -- La ligne existe avant qu'on la lise, pour qu'il y ait toujours quelque
  -- chose à verrouiller. Le verrou fait passer les relevés simultanés l'un
  -- après l'autre : lancés en parallèle, ils auraient tous lu la même réserve
  -- et l'auraient dépensée chacun de leur côté.
  insert into visionnages (utilisateur_id, chapitre_id)
  values (p_utilisateur_id, p_chapitre_id)
  on conflict (utilisateur_id, chapitre_id) do nothing;

  select secondes_vues, marge_secondes, maj_le
    into v_anciennes, v_marge, v_maj_le
    from visionnages
   where utilisateur_id = p_utilisateur_id and chapitre_id = p_chapitre_id
     for update;

  -- Ce que le relevé peut ajouter : la réserve, plus 2,5 secondes de film par
  -- seconde écoulée depuis le relevé précédent. `greatest` couvre le relevé
  -- concurrent qui a écrit après le début de cette transaction.
  v_disponible := v_marge
                + 2.5 * greatest(0, extract(epoch from now() - v_maj_le));

  -- Monotone : un relevé plus bas ne fait pas reculer, un relevé trop haut est
  -- ramené au plafond plutôt que refusé. Le calcul reste en `numeric` jusqu'au
  -- bout : après une longue absence, le plafond dépasse ce que tient un entier.
  v_retenues := greatest(
    v_anciennes,
    least(p_secondes_vues, v_anciennes + floor(v_disponible))::integer
  );

  -- `maj_le` avance à chaque relevé (déclencheur `touch_maj_le`) : la réserve
  -- recueille ce qui n'a pas été dépensé, dans la limite de 15 secondes.
  update visionnages
     set secondes_vues  = v_retenues,
         marge_secondes = least(15, v_disponible - (v_retenues - v_anciennes))
   where utilisateur_id = p_utilisateur_id and chapitre_id = p_chapitre_id;

  -- Progression du module : part du temps vu sur le temps total. Un chapitre
  -- atteint à 95 % compte pour sa durée entière — c'est le seuil qu'emploie
  -- déjà l'écran du module pour poser sa coche, et les deux doivent dire la
  -- même chose. Les chapitres sans vidéo sont ignorés, faute de quoi un module
  -- en cours de montage plafonnerait bas.
  select coalesce(
           round(
             100.0 * sum(
               case
                 when coalesce(v.secondes_vues, 0) >= c.video_duree_secondes * 0.95
                   then c.video_duree_secondes
                 else least(coalesce(v.secondes_vues, 0), c.video_duree_secondes)
               end
             )
             / nullif(sum(c.video_duree_secondes), 0)
           ),
           0
         )::integer
    into v_progression
    from chapitres c
    left join visionnages v
      on v.chapitre_id = c.id and v.utilisateur_id = p_utilisateur_id
   where c.module_id = v_module_id
     and c.video_duree_secondes is not null;

  update acces
     set progression = greatest(progression, v_progression),
         termine_le  = case
                         when v_progression >= 100 and termine_le is null then current_date
                         else termine_le
                       end
   where utilisateur_id = p_utilisateur_id and module_id = v_module_id;

  return v_progression;
end;
$$;

comment on function enregistrer_visionnage is
  'Cumule le temps vu d''un chapitre et en déduit la progression du module. Un relevé n''avance que de 2,5 s de film par seconde écoulée, plus une réserve de 15 s qui se reconstitue. Un chapitre vu à 95 % compte pour sa durée entière. Monotone : ne fait jamais reculer.';

-- `create or replace` conserve les droits posés en 20260930120000, mais la
-- règle vaut d'être répétée : cette fonction est `security definer` et ne doit
-- jamais être appelable avec la clé publiable.
revoke execute on function
  public.enregistrer_visionnage(text, uuid, integer)
  from anon, authenticated, public;

grant execute on function
  public.enregistrer_visionnage(text, uuid, integer)
  to service_role;
