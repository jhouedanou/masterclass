-- ---------------------------------------------------------------------------
-- Rattrapage — données de démonstration des parcours de la planche E
--
-- À exécuter une seule fois, après 07-parcours-planche-e.sql, sur une base
-- installée AVANT cette migration : elle complète les lignes de démonstration
-- que le jeu de données (non rejouable) ne peut plus atteindre.
-- Sans effet sur une base neuve installée avec 99-donnees.sql.
-- ---------------------------------------------------------------------------

update formateurs set coaching_prive_actif = true where id in ('for-othniel', 'for-waffo', 'for-soboro');

update demandes_coaching_prive set formateur_id = 'for-othniel',
  creneaux = '[{"date":"2026-10-06","debut":"18:30","fin":"20:30"},{"date":"2026-10-10","debut":"09:00","fin":"11:00"}]'::jsonb
 where id = 'dcp-001' and creneaux = '[]'::jsonb;
update demandes_coaching_prive set formateur_id = 'for-soboro',
  creneaux = '[{"date":"2026-09-12","debut":"10:00","fin":"12:00"}]'::jsonb,
  lien_session = 'https://zoom.us/j/00000000000'
 where id = 'dcp-002' and creneaux = '[]'::jsonb;
update demandes_coaching_prive set formateur_id = 'for-waffo',
  creneaux = '[{"date":"2026-09-30","debut":"14:00","fin":"15:00"}]'::jsonb
 where id = 'dcp-003' and creneaux = '[]'::jsonb;

insert into historique_coaching_prive (demande_id, statut, auteur, commentaire, cree_le)
select * from (values
  ('dcp-002', 'confirmee-attente-paiement'::statut_coaching_prive, 'Équipe Big Five', 'Créneau retenu : samedi 12/09, 10h – 12h. Lien de paiement envoyé.', '2026-09-03T14:05:00Z'::timestamptz),
  ('dcp-002', 'payee'::statut_coaching_prive, 'Équipe Big Five', null, '2026-09-04T09:40:00Z'::timestamptz),
  ('dcp-003', 'confirmee-attente-paiement'::statut_coaching_prive, 'Équipe Big Five', 'Créneau retenu : mercredi 30/09, 14h – 15h.', '2026-09-19T11:00:00Z'::timestamptz)
) as v(demande_id, statut, auteur, commentaire, cree_le)
where not exists (select 1 from historique_coaching_prive h where h.demande_id = v.demande_id and h.statut = v.statut);

update candidatures_formateurs set email = 'eric.nguessan@example.ci' where id = 'cand-001' and email is null;
update candidatures_formateurs set email = 'salimata.traore@example.ci' where id = 'cand-002' and email is null;

update transactions set code_echec = 'carte-refusee', detail_echec = 'Carte refusée par la banque émettrice.'
 where reference = 'FP-2609-0410' and statut = 'echouee' and code_echec is null;
