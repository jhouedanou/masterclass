import { attribuerAcces } from '../../database/administration'
import { trouverModule } from '../../database/catalogue'
import { trouverUtilisateur } from '../../database/comptes'
import { notifierCompte } from '../../utils/notifications'
import { exigerSection } from '../../utils/session'

/**
 * Attribution d'un accès gratuit : distincte d'un achat, motif obligatoire,
 * action journalisée et apprenant notifié. Les vérifications et l'écriture du
 * journal se font dans la même transaction.
 *
 * Donner un module, c'est renoncer à sa vente : la décision relève des offres
 * commerciales, pas de la seule gestion des apprenants.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'offres-commerciales')
  const { utilisateurId, moduleId, motif, notifier } = await readBody<{
    utilisateurId: string
    moduleId: string
    motif: string
    /** Case « Prévenir l'apprenant » de l'écran 13 ; absente, on prévient. */
    notifier?: boolean
  }>(event)

  await attribuerAcces(utilisateurId, moduleId, motif ?? '', `${admin.prenom} ${admin.nom}`)

  const [apprenant, module] = await Promise.all([trouverUtilisateur(utilisateurId), trouverModule(moduleId)])
  const prevenir = notifier !== false && Boolean(apprenant)
  if (apprenant && prevenir) {
    await notifierCompte(apprenant, 'acces-attribue', {
      prenom: apprenant.prenom,
      module: module?.titre ?? moduleId,
    })
  }

  return { ok: true, notifie: prevenir }
})
