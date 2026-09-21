import {
  creerChapitre,
  dupliquerChapitre,
  listerChapitres,
  majChapitre,
  reordonnerChapitres,
  supprimerChapitre,
} from '../../database/catalogue'
import { exigerSection } from '../../utils/session'

/** Chapitres d'un module : ajout illimité, réordonnancement par glisser-déposer. */
export default defineEventHandler(async (event) => {
  await exigerSection(event, 'modules-chapitres')
  const body = await readBody<{
    action: 'creer' | 'modifier' | 'supprimer' | 'reordonner' | 'dupliquer'
    moduleId: string
    id?: string
    libelle?: string
    titre?: string
    dureeMinutes?: number
    ordre?: string[]
  }>(event)

  switch (body.action) {
    case 'creer':
      if (!body.titre?.trim()) {
        throw createError({ statusCode: 422, statusMessage: 'Le titre du chapitre est requis' })
      }
      await creerChapitre(body.moduleId, {
        libelle: body.libelle?.trim() || 'Chapitre',
        titre: body.titre.trim(),
        dureeMinutes: body.dureeMinutes,
      })
      break

    case 'modifier':
      if (!body.id) throw createError({ statusCode: 422, statusMessage: 'Chapitre non précisé' })
      await majChapitre(body.id, {
        libelle: body.libelle,
        titre: body.titre,
        dureeMinutes: body.dureeMinutes,
      })
      break

    // La copie reprend le texte et la transcription, jamais le fichier vidéo :
    // deux chapitres ne peuvent pas partager la même clé de dépôt.
    case 'dupliquer':
      if (!body.id) throw createError({ statusCode: 422, statusMessage: 'Chapitre non précisé' })
      await dupliquerChapitre(body.id, { moduleId: body.moduleId })
      break

    case 'supprimer':
      if (!body.id) throw createError({ statusCode: 422, statusMessage: 'Chapitre non précisé' })
      await supprimerChapitre(body.id)
      break

    case 'reordonner':
      if (!body.ordre?.length) {
        throw createError({ statusCode: 422, statusMessage: 'Ordre des chapitres manquant' })
      }
      await reordonnerChapitres(body.moduleId, body.ordre)
      break
  }

  return { chapitres: await listerChapitres(body.moduleId) }
})
