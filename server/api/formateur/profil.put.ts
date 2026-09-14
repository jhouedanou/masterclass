import type { Formateur } from '#shared/types'
import { majFormateur, trouverFormateur, type ChampsProfilFormateur } from '../../database/catalogue'
import { exigerFormateur } from '../../utils/session'

/**
 * Profil formateur (planche D, écran 02). Le formateur pilote son identité
 * publique — nom, spécialité, bio — et ses coordonnées internes : e-mail
 * professionnel et WhatsApp. Le tarif de coaching privé, son activation et la
 * liste des modules restent pilotés par l'équipe.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerFormateur(event)
  const formateurId = utilisateur.formateurId!

  if (!(await trouverFormateur(formateurId))) {
    throw createError({ statusCode: 404, statusMessage: 'Profil introuvable' })
  }

  const body = await readBody<
    Partial<Pick<Formateur, 'nom' | 'expertise' | 'bio' | 'emailPro' | 'whatsapp'>>
  >(event)

  const champs: ChampsProfilFormateur = {}
  if (body.nom !== undefined) {
    if (!body.nom.trim()) throw createError({ statusCode: 422, statusMessage: 'Le nom public est obligatoire' })
    champs.nom = body.nom.trim()
  }
  if (body.expertise !== undefined) champs.expertise = body.expertise.trim()
  if (body.bio !== undefined) champs.bio = body.bio.trim()
  if (body.emailPro !== undefined) {
    const email = body.emailPro.trim()
    // Un champ vidé est accepté : il n'est pas obligatoire.
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw createError({ statusCode: 422, statusMessage: 'Adresse e-mail professionnelle invalide' })
    }
    champs.emailPro = email
  }
  if (body.whatsapp !== undefined) champs.whatsapp = body.whatsapp.trim()

  if (!Object.keys(champs).length) return await trouverFormateur(formateurId)
  return await majFormateur(formateurId, champs)
})
