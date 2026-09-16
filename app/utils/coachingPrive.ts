import type { StatutCoachingPrive } from '#shared/types'

/** Les six statuts d'une demande (planche B, écran 10), partagés entre
 *  l'espace apprenant, le back-office et l'espace formateur. */
export const LIBELLES_COACHING_PRIVE: Record<StatutCoachingPrive, string> = {
  'en-attente': 'En attente',
  'en-etude': 'En étude',
  'confirmee-attente-paiement': 'Créneau proposé',
  payee: 'Confirmée (payée)',
  realisee: 'Réalisée',
  refusee: 'Refusée',
  expiree: 'Expirée',
  annulee: 'Annulée',
}

export const CLASSES_COACHING_PRIVE: Record<StatutCoachingPrive, string> = {
  'en-attente': 'bg-alerte-voile text-alerte',
  'en-etude': 'bg-fond-voile text-texte',
  'confirmee-attente-paiement': 'bg-social-voile text-social',
  payee: 'bg-succes-voile text-succes',
  realisee: 'bg-fond-voile text-discret',
  refusee: 'bg-[#fdeeee] text-erreur',
  expiree: 'bg-fond-voile text-discret',
  annulee: 'bg-fond-voile text-discret',
}

/** Ordre de la planche « Les 6 statuts d'une demande ». */
export const STATUTS_COACHING_PRIVE: { statut: StatutCoachingPrive; numero: number; libelle: string }[] = [
  { statut: 'en-attente', numero: 1, libelle: 'En attente' },
  { statut: 'en-etude', numero: 2, libelle: 'En étude' },
  { statut: 'confirmee-attente-paiement', numero: 3, libelle: 'Créneau proposé' },
  { statut: 'payee', numero: 4, libelle: 'Confirmée (payée)' },
  { statut: 'realisee', numero: 5, libelle: 'Réalisée' },
  { statut: 'refusee', numero: 6, libelle: 'Refusée / expirée' },
]

/** « Mardi 18h – 20h » (jour de semaine) ou « lundi 6 octobre, 18:30 – 20:30 » (ancienne forme datée). */
export function formatCreneau(c: { jour?: string; date?: string; debut: string; fin: string }): string {
  const heure = (h: string) => (h.endsWith(':00') ? `${Number(h.slice(0, 2))}h` : h.replace(':', 'h'))
  if (c.jour) return `${c.jour.charAt(0).toUpperCase()}${c.jour.slice(1)} ${heure(c.debut)} – ${heure(c.fin)}`
  if (c.date) {
    const date = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(
      new Date(`${c.date}T00:00:00`),
    )
    return `${date}, ${c.debut} – ${c.fin}`
  }
  return `${c.debut} – ${c.fin}`
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
