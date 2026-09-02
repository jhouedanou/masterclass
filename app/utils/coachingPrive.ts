import type { StatutCoachingPrive } from '#shared/types'

/** Libellés et couleurs des statuts d'une demande de coaching privé, partagés
 *  entre l'espace apprenant, le back-office et l'espace formateur. */
export const LIBELLES_COACHING_PRIVE: Record<StatutCoachingPrive, string> = {
  'en-attente': 'En attente',
  'confirmee-attente-paiement': 'Confirmée — en attente de paiement',
  payee: 'Payée',
  realisee: 'Réalisée',
  refusee: 'Refusée',
  annulee: 'Annulée',
}

export const CLASSES_COACHING_PRIVE: Record<StatutCoachingPrive, string> = {
  'en-attente': 'bg-alerte-voile text-alerte',
  'confirmee-attente-paiement': 'bg-social-voile text-social',
  payee: 'bg-succes-voile text-succes',
  realisee: 'bg-fond-voile text-discret',
  refusee: 'bg-[#fdeeee] text-erreur',
  annulee: 'bg-fond-voile text-discret',
}

/** « lundi 6 octobre, 18:30 – 20:30 » depuis un créneau structuré. */
export function formatCreneau(c: { date: string; debut: string; fin: string }): string {
  const date = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(`${c.date}T00:00:00`),
  )
  return `${date}, ${c.debut} – ${c.fin}`
}

export function formatDateHeure(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}
