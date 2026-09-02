import { attribuerAcces } from '../../database/administration'
import { trouverModule } from '../../database/catalogue'
import { trouverUtilisateur } from '../../database/comptes'
import { notifierCompte } from '../../utils/notifications'
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

  const [apprenant, module] = await Promise.all([trouverUtilisateur(utilisateurId), trouverModule(moduleId)])
  if (apprenant) {
    await notifierCompte(apprenant, 'acces-attribue', {
      prenom: apprenant.prenom,
      module: module?.titre ?? moduleId,
    })
  }

  return { ok: true, notifie: Boolean(apprenant) }
})
