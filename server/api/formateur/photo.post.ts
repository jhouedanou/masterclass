import { majFormateur, trouverFormateur } from '../../database/catalogue'
import { televerserPortrait, typesPortraitLisibles } from '../../utils/portraits'
import { exigerFormateur } from '../../utils/session'

/** « Changer la photo » (planche D, écran 02). L'image remplace le portrait
 *  publié sur /formateurs et sur le bloc 8 des fiches commerciales. */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerFormateur(event)
  const formateurId = utilisateur.formateurId!
  if (!(await trouverFormateur(formateurId))) {
    throw createError({ statusCode: 404, statusMessage: 'Profil introuvable' })
  }

  const parties = await readMultipartFormData(event)
  const fichier = parties?.find((p) => p.name === 'photo' && p.filename)
  if (!fichier) {
    throw createError({
      statusCode: 422,
      statusMessage: `Aucune image reçue : ${typesPortraitLisibles()}, 2 Mo au maximum.`,
    })
  }

  const url = await televerserPortrait(formateurId, {
    donnees: fichier.data,
    type: fichier.type ?? '',
  })
  return await majFormateur(formateurId, { photo: url })
})
