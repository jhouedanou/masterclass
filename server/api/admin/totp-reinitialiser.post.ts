import { enregistrerJournal } from '../../database/administration'
import { trouverUtilisateur } from '../../database/comptes'
import { reinitialiserTotp } from '../../database/totp'
import { exigerAdmin } from '../../utils/session'

/**
 * Remet à zéro la double authentification d'un compte d'administration.
 *
 * Dernier recours, quand téléphone **et** codes de secours sont perdus : le
 * compte visé se réenrôle à sa prochaine connexion. Réservé à un administrateur
 * supérieur, et journalisé — c'est un affaiblissement temporaire, pas une
 * opération de routine.
 *
 * Si plus aucun administrateur supérieur ne peut entrer, la sortie est
 * `CODE_ADMIN_FOURNISSEUR=aucun` le temps d'une connexion (voir README).
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerAdmin(event, true)
  const { utilisateurId } = await readBody<{ utilisateurId?: string }>(event)

  if (!utilisateurId) {
    throw createError({ statusCode: 422, statusMessage: 'Compte non précisé.' })
  }

  const cible = await trouverUtilisateur(utilisateurId)
  if (!cible || (cible.role !== 'admin-contenu' && cible.role !== 'admin-superieur')) {
    throw createError({ statusCode: 404, statusMessage: 'Compte d’administration introuvable.' })
  }

  await reinitialiserTotp(cible.id)
  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    'a réinitialisé la double authentification',
    `${cible.email} — le compte devra se réenrôler à sa prochaine connexion`,
  )

  return { ok: true }
})
