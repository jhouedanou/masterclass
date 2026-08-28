import { attribuerAcces } from '../../database/administration'
import { exigerAdmin } from '../../utils/session'

/**
 * Attribution d'un accès gratuit : distincte d'un achat, motif obligatoire,
 * action journalisée et apprenant notifié. Les vérifications et l'écriture du
 * journal se font dans la même transaction.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerAdmin(event)
  const { utilisateurId, moduleId, motif } = await readBody<{
    utilisateurId: string
    moduleId: string
    motif: string
  }>(event)

  await attribuerAcces(utilisateurId, moduleId, motif ?? '', `${admin.prenom} ${admin.nom}`)

  return { ok: true, notifie: true }
})
