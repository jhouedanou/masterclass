import { exigerFormateur } from '../../utils/session'

/** Séances de coaching privé — planification et paiement gérés par l'équipe. */
export default defineEventHandler((event) => {
  exigerFormateur(event)
  return [
    {
      id: 'cp-001',
      apprenant: 'Awa Koné',
      date: '2026-09-12',
      creneau: '10h00 – 12h00',
      dureeMinutes: 120,
      statut: 'confirmee',
      paye: true,
      sujets:
        'Retravailler les accroches de ma marque de cosmétiques — je n’arrive pas à dépasser 2 % d’engagement.',
    },
    {
      id: 'cp-002',
      apprenant: 'Moussa Diabaté',
      date: null,
      creneau: null,
      dureeMinutes: 60,
      statut: 'en-attente',
      paye: false,
      sujets: '',
    },
    {
      id: 'cp-003',
      apprenant: 'Fatou Bamba',
      date: '2026-07-28',
      creneau: '18h00 – 19h00',
      dureeMinutes: 60,
      statut: 'realisee',
      paye: true,
      note: 5,
      sujets: '',
    },
  ]
})
