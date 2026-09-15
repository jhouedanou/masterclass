import { attribuerAcces, enregistrerJournal } from '../../database/administration'
import { trouverModule } from '../../database/catalogue'
import { creerReinitialisation, creerUtilisateur } from '../../database/comptes'
import { creerJeton, hacherMotDePasse, refusMotDePasse } from '../../utils/motDePasse'
import { notifierCompte } from '../../utils/notifications'
import { exigerAdmin } from '../../utils/session'

/** Le lien de définition vaut trois jours, comme l'invitation formateur. */
const VALIDITE_INVITATION_HEURES = 72

/**
 * Ajout d'un apprenant par l'équipe (planche C, écran 13).
 *
 * Le compte naît sans mot de passe utilisable : l'apprenant le choisit par un
 * lien à validité limitée. L'équipe peut en poser un temporaire, auquel cas il
 * lui est rendu à l'écran — aucun envoi n'est encore branché.
 *
 * L'accès éventuellement attribué au passage est marqué « attribution », jamais
 * « achat » : la distinction porte les statistiques de revenus.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerAdmin(event)
  const body = await readBody<{
    prenom?: string
    nom?: string
    email?: string
    whatsapp?: string
    pays?: string
    motDePasse?: string
    moduleId?: string
    motif?: string
  }>(event)

  const prenom = (body.prenom ?? '').trim()
  const nom = (body.nom ?? '').trim()
  const email = (body.email ?? '').trim().toLowerCase()

  if (!prenom || !nom || !email) {
    throw createError({ statusCode: 422, statusMessage: 'Prénom, nom et e-mail sont obligatoires' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 422, statusMessage: 'Adresse e-mail invalide' })
  }
  if (body.motDePasse) {
    const refus = refusMotDePasse(body.motDePasse)
    if (refus) throw createError({ statusCode: 422, statusMessage: refus })
  }
  // Attribuer un accès engage un module gratuit : le motif est exigé ici comme
  // partout ailleurs, et il est journalisé.
  if (body.moduleId && !body.motif?.trim()) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Le motif est obligatoire pour attribuer un accès',
    })
  }

  const compte = await creerUtilisateur({
    prenom,
    nom,
    email,
    whatsapp: body.whatsapp?.trim() || undefined,
    pays: body.pays?.trim() || undefined,
    // Une empreinte impossible à retrouver : le compte ne peut pas se
    // connecter tant que le mot de passe n'a pas été choisi.
    motDePasseHache: body.motDePasse
      ? await hacherMotDePasse(body.motDePasse)
      : await hacherMotDePasse(creerJeton().clair),
  })

  const auteur = `${admin.prenom} ${admin.nom}`
  let lienDefinition: string | undefined
  if (!body.motDePasse) {
    const { clair, hache } = creerJeton()
    await creerReinitialisation(
      compte.id,
      hache,
      new Date(Date.now() + VALIDITE_INVITATION_HEURES * 60 * 60 * 1000),
    )
    lienDefinition = `${useRuntimeConfig().public.siteUrl}/reinitialiser-mot-de-passe?jeton=${clair}`
    await notifierCompte(compte, 'invitation-apprenant', {
      prenom,
      lien: lienDefinition,
      validiteHeures: String(VALIDITE_INVITATION_HEURES),
    })
  }

  let moduleAttribue: string | undefined
  if (body.moduleId) {
    await attribuerAcces(compte.id, body.moduleId, body.motif!.trim(), auteur)
    const module = await trouverModule(body.moduleId)
    moduleAttribue = module?.titre
    await notifierCompte(compte, 'acces-attribue', {
      prenom,
      module: module?.titre ?? body.moduleId,
    })
  }

  await enregistrerJournal(auteur, 'a créé le compte apprenant de', `${prenom} ${nom}`, {
    type: 'compte',
    objet: compte.id,
  })

  return {
    utilisateur: compte,
    moduleAttribue,
    // Tant qu'aucun fournisseur d'envoi n'est branché, l'équipe transmet le
    // lien à la main : il est renvoyé à l'écran.
    lienDefinition,
  }
})
