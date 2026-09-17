-- ---------------------------------------------------------------------------
-- Durées déduites des vidéos — base déjà installée
--
-- La durée annoncée d'un chapitre et celle d'un module étaient saisies à la
-- main. Personne ne les tenait à jour : les dix-huit modules annonçaient
-- soixante minutes, et les chapitres dix-huit, y compris sous une vidéo de
-- trois. Un module de onze minutes se vendait donc pour une heure, sur la carte
-- du catalogue, la fiche publique, le récapitulatif d'achat, les données
-- structurées et l'attestation.
--
-- Le code les déduit désormais à chaque dépôt, rattachement ou retrait. Ce
-- fichier remet à niveau ce qui a été enregistré avant.
--
-- À exécuter dans SQL Editor. Rejouable sans effet.
-- ---------------------------------------------------------------------------

-- La vidéo fait foi dès qu'elle est là.
update chapitres
   set duree_minutes = greatest(1, round(video_duree_secondes / 60.0))
 where video_duree_secondes is not null
   and duree_minutes is distinct from greatest(1, round(video_duree_secondes / 60.0));

-- Le module est la somme de ses chapitres : durée filmée quand elle existe,
-- durée annoncée du chapitre à défaut — ce qui laisse une fiche lisible avant
-- le tournage.
update modules m set duree_minutes = greatest(1, round(t.secondes / 60.0))
  from (select module_id,
               sum(coalesce(video_duree_secondes, coalesce(duree_minutes, 0) * 60)) as secondes
          from chapitres group by module_id) t
 where t.module_id = m.id;
