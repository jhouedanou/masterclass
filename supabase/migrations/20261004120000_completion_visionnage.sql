-- ---------------------------------------------------------------------------
-- La complétion d'un chapitre cesse d'exiger la perfection
--
-- Deux comptes coexistaient, et ils ne tombaient jamais d'accord.
--
-- L'écran du module accorde une grâce : `listerVisionnagesModule` tient un
-- chapitre pour vu dès 95 % de sa durée, et affiche la coche. La progression du
-- module, elle, était calculée ici sans aucune grâce — le rapport brut du temps
-- vu sur la durée. Un apprenant voyait donc six chapitres cochés sous une
-- progression de 95 %, et l'écran lui promettait une attestation « débloquée
-- automatiquement quand les six chapitres sont vus à 100 % ».
--
-- Les 100 % étaient hors d'atteinte. Le relevé part du lecteur en secondes
-- entières (`Math.floor`), et la dernière fraction de seconde d'un chapitre
-- s'écoule entre le dernier `timeupdate` et la fin de la vidéo : un chapitre
-- regardé jusqu'au bout se déclare une seconde plus court qu'il n'est. La perte
-- est fixe, donc d'autant plus lourde que le chapitre est bref — 97 % sur une
-- vidéo de 31 secondes, et jamais 100 % sur une introduction d'une minute.
--
-- La grâce passe donc dans la fonction, à la valeur que l'application emploie
-- déjà. Un chapitre vu à 95 % compte pour sa durée entière ; en deçà, le temps
-- vu compte tel quel, et l'avance rapide ne valide toujours rien.
--
-- Le lecteur change de son côté : il additionne désormais les secondes de film
-- vues et non les secondes passées devant l'écran, faute de quoi un cours suivi
-- à 2× n'était crédité que de moitié.
-- ---------------------------------------------------------------------------

create or replace function enregistrer_visionnage(
  p_utilisateur_id text,
  p_chapitre_id    uuid,
  p_secondes_vues  integer
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_module_id    text;
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

  insert into visionnages (utilisateur_id, chapitre_id, secondes_vues)
  values (p_utilisateur_id, p_chapitre_id, p_secondes_vues)
  on conflict (utilisateur_id, chapitre_id) do update
    set secondes_vues = greatest(visionnages.secondes_vues, excluded.secondes_vues);

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
  'Cumule le temps vu d''un chapitre et en déduit la progression du module. Un chapitre vu à 95 % compte pour sa durée entière, comme sur l''écran du module. Monotone : ne fait jamais reculer.';

-- `create or replace` conserve les droits posés en 20260930120000, mais la
-- règle vaut d'être répétée : cette fonction est `security definer` et ne doit
-- jamais être appelable avec la clé publiable.
revoke execute on function
  public.enregistrer_visionnage(text, uuid, integer)
  from anon, authenticated, public;

grant execute on function
  public.enregistrer_visionnage(text, uuid, integer)
  to service_role;
