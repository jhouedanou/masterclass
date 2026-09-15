import { validerTelephone } from '#shared/utils/telephone'
import { enregistrerJournal } from '../../database/administration'
import { majProfilUtilisateur } from '../../database/comptes'
import { exigerAdmin } from '../../utils/session'

/**
 * Son propre profil, depuis le back-office (écran 20, volet « Mon profil »).
 *
 * Le compte visé est toujours celui de la session : aucun identifiant n'est lu
 * dans le corps, sinon un administrateur de contenu pourrait renommer un
 * administrateur supérieur. Changer le compte d'autrui passe par
 * « Administration des accès », qui a son propre droit.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerAdmin(event)
  const body = await readBody<{ prenom?: string; nom?: string; whatsapp?: string }>(event)

  const prenom = (body.prenom ?? '').trim()
  const nom = (body.nom ?? '').trim()
  if (!prenom || !nom) {
    throw createError({ statusCode: 422, statusMessage: 'Prénom et nom sont requis' })
  }

  // Le numéro reçoit les codes de vérification : un numéro faux enferme dehors.
  const whatsapp = (body.whatsapp ?? '').trim()
  if (whatsapp && !validerTelephone(whatsapp)) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Numéro WhatsApp invalide : indicatif international attendu (ex. +225…).',
    })
  }

  const compte = await majProfilUtilisateur(admin.id, {
    prenom,
    nom,
    whatsapp: whatsapp || undefined,
  })

  await enregistrerJournal(
    `${prenom} ${nom}`,
    'a modifié son profil d’administration',
    admin.email,
    { type: 'compte', objet: admin.id },
  )

  return { utilisateur: compte }
})
