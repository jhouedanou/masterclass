import type { Formateur } from '#shared/types'
import { majFormateur, trouverFormateur } from '../../database/catalogue'
import { exigerFormateur } from '../../utils/session'

/** Le tarif de coaching privé et la liste des modules restent pilotés par l'équipe. */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerFormateur(event)
  const formateurId = utilisateur.formateurId!

  if (!(await trouverFormateur(formateurId))) {
    throw createError({ statusCode: 404, statusMessage: 'Profil introuvable' })
  }

  const body = await readBody<Partial<Pick<Formateur, 'nom' | 'expertise' | 'bio'>>>(event)
  const champs: Partial<Pick<Formateur, 'nom' | 'expertise' | 'bio'>> = {}
  if (body.nom) champs.nom = body.nom
  if (body.expertise) champs.expertise = body.expertise
  if (body.bio) champs.bio = body.bio

  if (!Object.keys(champs).length) return await trouverFormateur(formateurId)
  return await majFormateur(formateurId, champs)
})
