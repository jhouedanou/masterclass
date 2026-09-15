-- ---------------------------------------------------------------------------
-- Quatrième catégorie de référentiel : les tranches d'audience
--
-- La taille d'audience était un choix unique pour toute la fiche, alors qu'un
-- apprenant qui gère cinq réseaux n'a pas la même audience sur chacun. Elle
-- devient une valeur par réseau — voir la migration suivante, qui pose les
-- entrées et convertit l'existant.
--
-- L'ajout de la valeur d'enum est isolé dans son propre fichier : PostgreSQL
-- refuse d'employer une valeur d'énumération dans la transaction qui l'ajoute.
-- Les deux fichiers doivent donc être exécutés séparément.
-- ---------------------------------------------------------------------------

alter type categorie_referentiel add value if not exists 'audience';
