import { enregistrerJournal } from '../../database/administration'
import { trouverModule } from '../../database/catalogue'
import { retablirAcces, revoquerAcces, trouverUtilisateur } from '../../database/comptes'
import { notifierCompte } from '../../utils/notifications'
import { exigerAdmin } from '../../utils/session'

/**
 * Révocation ou rétablissement de l'accès d'un apprenant à un module
 * (planche C, écran 13).
 *
 * L'accès n'est jamais effacé, seulement daté et motivé : le supprimer ferait
 * perdre la trace de l'achat, et avec elle la justification comptable. Le motif
 * est obligatoire, l'apprenant est prévenu et l'action journalisée — c'est la
 * même exigence que pour la révocation d'une attestation.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerAdmin(event)
  const { utilisateurId, moduleId, action, motif } = await readBody<{
    utilisateurId: string
    moduleId: string
    action: 'revoquer' | 'retablir'
    motif?: string
  }>(event)

  if (!utilisateurId || !moduleId) {
    throw createError({ statusCode: 422, statusMessage: 'Apprenant ou module non précisé' })
  }
  if (action === 'revoquer' && !motif?.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Le motif de révocation est obligatoire' })
  }

  const [apprenant, module] = await Promise.all([
    trouverUtilisateur(utilisateurId),
    trouverModule(moduleId),
  ])
  if (!apprenant) throw createError({ statusCode: 404, statusMessage: 'Apprenant introuvable' })

  const titre = module?.titre ?? moduleId
  const auteur = `${admin.prenom} ${admin.nom}`

  if (action === 'revoquer') {
    await revoquerAcces(utilisateurId, moduleId, motif!.trim())
    await notifierCompte(apprenant, 'acces-revoque', {
      prenom: apprenant.prenom,
      module: titre,
      motif: motif!.trim(),
    })
    await enregistrerJournal(auteur, 'a révoqué l’accès de', `${apprenant.prenom} ${apprenant.nom} — ${titre} (motif : ${motif!.trim()})`, {
      type: 'acces',
      objet: `${utilisateurId}/${moduleId}`,
    })
  } else {
    await retablirAcces(utilisateurId, moduleId)
    await notifierCompte(apprenant, 'acces-attribue', { prenom: apprenant.prenom, module: titre })
    await enregistrerJournal(auteur, 'a rétabli l’accès de', `${apprenant.prenom} ${apprenant.nom} — ${titre}`, {
      type: 'acces',
      objet: `${utilisateurId}/${moduleId}`,
    })
  }

  return { ok: true, notifie: true }
})
