import { enregistrerJournal } from '../../../../database/administration'
import { majCoachingPriveActif, trouverFormateur } from '../../../../database/catalogue'
import { exigerSection } from '../../../../utils/session'

/**
 * Bascule « Formateur simple » / « Formateur avec coaching privé » (planche C,
 * écran 07b). Réversible : repasser simple referme la section du formateur et
 * le retire des demandes ; les séances déjà payées restent honorées.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'formateurs')
  const id = getRouterParam(event, 'id') ?? ''
  const { actif } = await readBody<{ actif?: boolean }>(event)

  if (typeof actif !== 'boolean') {
    throw createError({ statusCode: 422, statusMessage: 'Valeur « actif » attendue' })
  }
  const existant = await trouverFormateur(id)
  if (!existant) throw createError({ statusCode: 404, statusMessage: 'Formateur introuvable' })

  const formateur = await majCoachingPriveActif(id, actif)
  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    actif ? 'a activé le coaching privé de' : 'a désactivé le coaching privé de',
    formateur.nom,
  )
  return formateur
})
