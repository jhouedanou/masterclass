export function formatFcfa(montant: number, ttc = false): string {
  return `${new Intl.NumberFormat('fr-FR').format(montant)} FCFA${ttc ? ' TTC' : ''}`
}

export function formatDuree(minutes: number): string {
  // La maquette affiche « 60 min » et non « 1 h ».
  if (minutes <= 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m}` : `${h} h`
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso))
}

/** Numéro affiché sur les cartes et fils d'Ariane : « Module 05 ». */
export function numeroModule(n: number): string {
  return String(n).padStart(2, '0')
}

/** « jeu 10 sept », en-tête des séances (planches B et D). */
export function formatDateCourte(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
    .format(new Date(iso))
    .replace('.', '')
}

/** « 10/09 », comme « Sujets à lire avant le 10/09 » (planche D). */
export function formatJourMois(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(new Date(iso))
}

/** « Septembre 2026 », libellé du sélecteur de mois (planche D, écran 01). */
export function formatMois(mois: string): string {
  const [annee, m] = mois.split('-').map(Number)
  const libelle = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(annee!, (m ?? 1) - 1, 1)),
  )
  return libelle.charAt(0).toUpperCase() + libelle.slice(1)
}

/**
 * Horodatage relatif de l'activité récente (planche C, écran 01) : « à
 * l'instant », « il y a 12 s », « il y a 1 h », « hier », « il y a 2 j ».
 * Au-delà d'une semaine, la date courte reprend ses droits.
 */
export function formatRelatif(iso: string | null | undefined, maintenant = Date.now()): string {
  if (!iso) return ''
  const ecart = Math.max(0, Math.round((maintenant - new Date(iso).getTime()) / 1000))
  if (ecart < 5) return 'à l’instant'
  if (ecart < 60) return `il y a ${ecart} s`
  const minutes = Math.floor(ecart / 60)
  if (minutes < 60) return `il y a ${minutes} min`
  const heures = Math.floor(minutes / 60)
  if (heures < 24) return `il y a ${heures} h`
  const jours = Math.floor(heures / 24)
  if (jours === 1) return 'hier'
  if (jours < 7) return `il y a ${jours} j`
  return formatDateCourte(iso)
}
