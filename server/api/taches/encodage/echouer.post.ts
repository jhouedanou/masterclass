import { enregistrerJournal } from '../../../database/administration'
import { echouerTravail } from '../../../database/encodage'
import { exigerCleTache } from '../../../utils/taches'

/**
 * Consigne l'échec d'un travail.
 *
 * Il retourne à la file tant qu'il lui reste des tentatives : une coupure au
 * milieu d'un téléversement de segments ne condamne pas un fichier. Passé le
 * plafond il s'arrête, et l'échec se voit dans la médiathèque — une file qui ne
 * peut pas se vider finit par être ignorée.
 */
export default defineEventHandler(async (event) => {
  exigerCleTache(event)

  const { id, erreur } = await readBody<{ id: string; erreur: string }>(event)
  if (!id) throw createError({ statusCode: 422, statusMessage: 'Travail non identifié' })

  const travail = await echouerTravail(
    id,
    erreur || 'Échec sans message de l’exécutant.',
    Number(process.env.ENCODAGE_TENTATIVES_MAX) || 3,
  )

  if (travail.statut === 'echec') {
    await enregistrerJournal(
      'Encodage',
      'a renoncé à transcoder une vidéo',
      `${travail.cle} — ${travail.erreur ?? ''}`.slice(0, 300),
      { type: 'contenu', objet: travail.videoId },
    )
  }

  return { id, statut: travail.statut, tentatives: travail.tentatives }
})
