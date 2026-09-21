import { enregistrerJournal } from '../../../database/administration'
import { reussirTravail } from '../../../database/encodage'
import { exigerCleTache } from '../../../utils/taches'

/**
 * Clôt un travail réussi : le flux est en ligne, la vidéo change de forme et
 * tous les chapitres qui la servent suivent.
 *
 * Le corps reprend l'`info.json` que le transcodeur écrit à côté du flux —
 * paliers produits, durée mesurée, poids du dossier. L'exécutant ne l'invente
 * pas, il le recopie.
 */
export default defineEventHandler(async (event) => {
  exigerCleTache(event)

  const { id, paliers, dureeSecondes, octets } = await readBody<{
    id: string
    paliers: string[]
    dureeSecondes: number | null
    octets: number | null
  }>(event)

  if (!id || !Array.isArray(paliers) || !paliers.length) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Un travail terminé doit nommer les paliers produits.',
    })
  }

  const { chapitresReportes } = await reussirTravail(id, {
    paliers,
    dureeSecondes: dureeSecondes ?? null,
    octets: octets ?? null,
  })

  await enregistrerJournal(
    'Encodage',
    'a transcodé une vidéo en plusieurs débits',
    `${paliers.join(' · ')} — ${chapitresReportes} chapitre(s) basculé(s)`,
    { type: 'contenu', objet: id },
  )

  return { id, chapitresReportes }
})
