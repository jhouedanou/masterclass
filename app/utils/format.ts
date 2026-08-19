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
