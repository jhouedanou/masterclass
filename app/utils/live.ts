import type { EtatLiveApprenant, EtatQuiz } from '#shared/types'

/** Carte Live Session de l'espace apprenant, telle que `/api/mon-espace` la renvoie (CDC §4.3). */
export interface CarteLiveApprenant {
  inscriptionId: string
  sessionId: string
  slug: string
  etat: EtatLiveApprenant
  debut: string
  dureeMinutes: number
  module: { slug: string; titre: string; programme: 'social-media' | 'entrepreneurs'; thematique: string }
  formateur: string
  support: boolean
  quiz: EtatQuiz | null
}
