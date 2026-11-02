/** Session publiée telle que `GET /api/live-sessions` la renvoie (sans Zoom ni inscrits). */
export interface SessionLiveListe {
  id: string
  slug: string
  debut: string
  dureeMinutes: number
  prerequis: string[]
  gains: string[]
  module: {
    id: string
    slug: string
    titre: string
    numero: number
    programme: 'social-media' | 'entrepreneurs'
    thematiqueId: string
    promesse: string
    prixFcfa: number
  }
  formateur: { nom: string; slug: string; expertise: string } | null
  inscriptionsOuvertes: boolean
  complet: boolean
}

/** « SOCIAL MÉDIA · MODULE 07 » : référence affichée au-dessus du titre. */
export function referenceLive(module: { programme: string; numero: number }): string {
  return `${module.programme === 'social-media' ? 'Social Média' : 'Entrepreneurs'} · Module ${String(module.numero).padStart(2, '0')}`
}

/**
 * Sessions publiées à venir. Liste vide tant que la fonctionnalité est
 * masquée pour ce visiteur (CDC 10.G).
 */
export function useLiveSessions() {
  const { data } = useFetch<SessionLiveListe[]>('/api/live-sessions', {
    key: 'live-sessions',
    default: () => [],
  })
  return computed(() => data.value ?? [])
}
