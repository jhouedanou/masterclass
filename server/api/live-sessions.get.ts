import type { Formateur, LiveSession } from '#shared/types'
import { listerLiveSessions } from '../database/live'
import { trouverFormateur } from '../database/catalogue'
import { debutSession, salleOuverte } from '../utils/zoom'

type Carte = LiveSession & { formateur: Formateur | null; passee: boolean }

/**
 * Liste publique des Live Sessions.
 *
 * Retourne les sessions publiées ou terminées, séparées en « à venir » et
 * « passées ». Chaque session est enrichie du profil formateur.
 */
export default defineEventHandler(async (): Promise<{ aVenir: Carte[]; passees: Carte[] }> => {
  const sessions = await listerLiveSessions()

  // Seules les sessions publiées ou terminées sont visibles au public.
  const visibles = sessions.filter((s) => s.statut === 'publiee' || s.statut === 'terminee')

  const maintenant = Date.now()
  const cartes: Carte[] = await Promise.all(
    visibles.map(async (s) => {
      const formateur = await trouverFormateur(s.formateurId)
      const debut = debutSession(s.date, s.heure)
      const { fermeture } = salleOuverte(debut, s.dureeMinutes, 15)
      const passee = s.statut === 'terminee' || maintenant > fermeture.getTime()
      return { ...s, formateur, passee }
    }),
  )

  return {
    aVenir: cartes.filter((c) => !c.passee),
    passees: cartes.filter((c) => c.passee),
  }
})
