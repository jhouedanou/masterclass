import { enregistrerJournal } from '../../database/administration'
import { listerChapitres, majModule, trouverModule } from '../../database/catalogue'
import { checklistPret } from '../../utils/pret'
import { exigerSection } from '../../utils/session'

/**
 * Marque un module « Prêt », ou lui retire cet état.
 *
 * La checklist est recalculée ici : celle qu'affiche le navigateur ne fait pas
 * foi — un onglet resté ouvert sur un état ancien suffirait à déclarer prêt un
 * module dont la dernière vidéo vient d'être retirée.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'modules-chapitres')
  const { id, pret } = await readBody<{ id: string; pret: boolean }>(event)

  const moduleTrouve = await trouverModule(id)
  if (!moduleTrouve) throw createError({ statusCode: 404, statusMessage: 'Module introuvable' })

  if (pret) {
    const chapitres = await listerChapitres(id)
    const checklist = checklistPret(moduleTrouve, chapitres)
    if (!checklist.pret) {
      throw createError({
        statusCode: 409,
        statusMessage: `Il manque encore ${checklist.manques.join(', ')}.`,
      })
    }
  }

  const modifie = await majModule(id, { pretLe: pret ? new Date().toISOString() : null })

  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    pret ? 'a marqué le module « Prêt »' : 'a retiré l’état « Prêt » du module',
    modifie.titre,
    { type: 'contenu', objet: id },
  )

  return { pretLe: modifie.pretLe }
})
