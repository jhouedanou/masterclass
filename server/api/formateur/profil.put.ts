import type { Formateur } from '#shared/types'
import { ficheFormateur } from '../../utils/formateur'
import { exigerFormateur } from '../../utils/session'

/** Le tarif de coaching privé et la liste des modules restent pilotés par l'équipe. */
export default defineEventHandler(async (event) => {
  const utilisateur = exigerFormateur(event)
  const fiche = ficheFormateur(utilisateur.formateurId!)
  if (!fiche) throw createError({ statusCode: 404, statusMessage: 'Profil introuvable' })

  const body = await readBody<Partial<Pick<Formateur, 'nom' | 'expertise' | 'bio'>>>(event)
  if (body.nom) fiche.nom = body.nom
  if (body.expertise) fiche.expertise = body.expertise
  if (body.bio) fiche.bio = body.bio
  return fiche
})
