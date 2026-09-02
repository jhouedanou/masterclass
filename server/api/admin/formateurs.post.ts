import type { ProgrammeSlug } from '#shared/types'
import { changerStatutCandidature, enregistrerJournal, trouverCandidature } from '../../database/administration'
import { creerFormateur, supprimerFormateur, trouverFormateur } from '../../database/catalogue'
import { creerCompteFormateur, creerReinitialisation } from '../../database/comptes'
import { creerJeton, hacherMotDePasse, refusMotDePasse } from '../../utils/motDePasse'
import { notifierCompte } from '../../utils/notifications'
import { exigerSection } from '../../utils/session'
import { identifiantDepuis, slugifier } from '../../utils/texte'

/** Le lien d'invitation vaut trois jours : le formateur choisit son mot de passe. */
const VALIDITE_INVITATION_HEURES = 72
const PHOTO_PAR_DEFAUT = '/images/formateurs/portrait-defaut.svg'

/**
 * Création d'un formateur (planche C, écrans 07b et 11, parcours 06) : la
 * fiche publique, puis le compte rattaché. Soit un mot de passe temporaire
 * est fourni, soit un lien d'invitation est envoyé. La candidature d'origine,
 * s'il y en a une, passe « acceptée ».
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'formateurs')
  const body = await readBody<{
    candidatureId?: string
    prenom?: string
    nom?: string
    email?: string
    whatsapp?: string
    expertise?: string
    bio?: string
    programmePrincipal?: ProgrammeSlug
    motDePasse?: string
  }>(event)

  const prenom = (body.prenom ?? '').trim()
  const nom = (body.nom ?? '').trim()
  const email = (body.email ?? '').trim().toLowerCase()
  const expertise = (body.expertise ?? '').trim()
  const programme = body.programmePrincipal === 'entrepreneurs' ? 'entrepreneurs' : 'social-media'

  if (!prenom || !nom || !email || !expertise) {
    throw createError({ statusCode: 422, statusMessage: 'Prénom, nom, e-mail et expertise sont obligatoires' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 422, statusMessage: 'Adresse e-mail invalide' })
  }
  if (body.motDePasse) {
    const refus = refusMotDePasse(body.motDePasse)
    if (refus) throw createError({ statusCode: 422, statusMessage: refus })
  }

  const candidature = body.candidatureId ? await trouverCandidature(body.candidatureId) : null
  if (body.candidatureId && !candidature) {
    throw createError({ statusCode: 404, statusMessage: 'Candidature introuvable' })
  }

  const nomComplet = `${prenom} ${nom}`
  const base = identifiantDepuis('for', nom)
  let id = base
  let slug = slugifier(nomComplet)
  // Deux homonymes : le second prend un suffixe plutôt que d'échouer.
  if (await trouverFormateur(id)) {
    const suffixe = Date.now().toString(36).slice(-4)
    id = `${base}${suffixe}`
    slug = `${slug}-${suffixe}`
  }

  const formateur = await creerFormateur({
    id,
    slug,
    nom: nomComplet,
    expertise,
    bio: (body.bio ?? '').trim() || `${nomComplet} rejoint les formateurs E-Masterclass Big Five.`,
    programmePrincipal: programme,
    photo: PHOTO_PAR_DEFAUT,
  })

  let compte
  try {
    compte = await creerCompteFormateur({
      prenom,
      nom,
      email,
      whatsapp: body.whatsapp?.trim() || undefined,
      formateurId: formateur.id,
      motDePasseHache: body.motDePasse ? await hacherMotDePasse(body.motDePasse) : undefined,
    })
  } catch (erreur) {
    // Pas de fiche orpheline : l'e-mail est déjà pris, on retire la fiche.
    await supprimerFormateur(formateur.id)
    throw erreur
  }

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
    await notifierCompte(compte, 'invitation-formateur', {
      prenom,
      lien: lienDefinition,
      validiteHeures: String(VALIDITE_INVITATION_HEURES),
    })
  }

  if (candidature) await changerStatutCandidature(candidature.id, 'acceptee', formateur.id)
  await enregistrerJournal(auteur, 'a créé le compte formateur de', nomComplet)

  return {
    formateur,
    utilisateur: compte,
    // Tant qu'aucun fournisseur d'envoi n'est branché, l'équipe transmet le
    // lien à la main : il est renvoyé à l'écran.
    lienDefinition,
  }
})
