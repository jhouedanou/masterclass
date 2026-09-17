import { enregistrerJournal } from '../../../database/administration'
import { renommerVideo, trouverVideo } from '../../../database/mediatheque'
import { exigerSection } from '../../../utils/session'

/**
 * Renommage d'une entrée de médiathèque.
 *
 * Seul le titre bouge. La clé de stockage reste celle du dépôt : la renommer
 * imposerait de recopier l'objet entier — un stockage d'objets ne sait pas
 * déplacer, il sait copier puis effacer.
 *
 * L'identifiant voyage dans le corps et non dans le chemin : le reste du
 * back-office fait de même, et une route paramétrée de plus fait déborder le
 * typage des routes de Nitro, qui les énumère toutes.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'modules-chapitres')
  const { id, nom } = await readBody<{ id: string; nom: string }>(event)

  const propre = (nom ?? '').trim()
  if (!propre) throw createError({ statusCode: 422, statusMessage: 'Un titre est attendu.' })
  if (propre.length > 200) {
    throw createError({ statusCode: 422, statusMessage: 'Titre au-delà de 200 caractères.' })
  }

  const video = await trouverVideo(id)
  if (!video) throw createError({ statusCode: 404, statusMessage: 'Vidéo introuvable' })

  await renommerVideo(id, propre)

  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    'a renommé une vidéo de la médiathèque',
    `${video.nom} → ${propre}`,
    { type: 'contenu', objet: id },
  )

  return { id, nom: propre }
})
