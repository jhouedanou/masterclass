-- ---------------------------------------------------------------------------
-- Créneaux de coaching privé (planche B, écran 04 / 10)
--
-- La maquette demande « Vos créneaux disponibles * (3 minimum — jour de la
-- semaine + tranche horaire) » : un créneau est un jour de semaine et une
-- tranche, pas une date ; et il en faut au moins trois, sans plafond à trois.
-- Les créneaux datés déjà en base restent acceptés.
-- ---------------------------------------------------------------------------

alter table demandes_coaching_prive
  drop constraint if exists demandes_coaching_prive_creneaux_tableau;

alter table demandes_coaching_prive
  add constraint demandes_coaching_prive_creneaux_tableau
    check (jsonb_typeof(creneaux) = 'array' and jsonb_array_length(creneaux) <= 14);

comment on column demandes_coaching_prive.creneaux is
  'Créneaux disponibles proposés par l''apprenant : [{ "jour": "mardi", "debut": "18:00", "fin": "20:00" }], trois au minimum (les anciens portent une date). Le créneau retenu est recopié dans `creneau`.';

-- Niveau d'expérience en tranches d'ancienneté, comme la maquette
-- (« 1 à 3 ans », « 3 à 5 ans ») : les anciennes clés sont converties.
update personas set niveau = case niveau
  when 'debutant' then 'moins-1-an'
  when 'intermediaire' then '1-3-ans'
  when 'confirme' then '3-5-ans'
  else niveau end
 where niveau in ('debutant', 'intermediaire', 'confirme');
