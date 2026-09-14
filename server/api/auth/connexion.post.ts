import { compterEchecsRecents, enregistrerTentative, trouverIdentifiants } from '../../database/comptes'
import { verifierMotDePasse } from '../../utils/motDePasse'
import { ouvrirSession } from '../../utils/session'

/**
 * Connexion par e-mail et mot de passe.
 *
 * Règles reprises de la planche C, écran « Connexion sécurisée » : chaque
 * tentative est journalisée (IP, appareil, horodatage) et cinq échecs en trente
 * minutes verrouillent le compte pour la même durée, avec alerte au journal
 * d'administration.
 *
 * La double vérification par code à six chiffres prévue par la maquette attend
 * un service d'envoi (e-mail et WhatsApp) — voir « Reste à faire » du README.
 */
export default defineEventHandler(async (event) => {
  const { email, motDePasse, resterConnecte } = await readBody<{
    email?: string
    motDePasse?: string
    resterConnecte?: boolean
  }>(event)

  const adresse = (email ?? '').trim()
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? null
  const appareil = getRequestHeader(event, 'user-agent') ?? null

  if (!adresse || !motDePasse) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Renseignez votre adresse e-mail et votre mot de passe.',
    })
  }

  const identifiants = await trouverIdentifiants(adresse)

  // Compte verrouillé : on le dit avant même de regarder le mot de passe, pour
  // que l'utilisateur légitime comprenne ce qui se passe.
  const verrou = identifiants?.utilisateur.verrouilleJusquA
  if (verrou && new Date(verrou) > new Date()) {
    throw createError({
      statusCode: 429,
      statusMessage:
        'Trop de tentatives : ce compte est bloqué 15 minutes. Réessayez plus tard ou réinitialisez votre mot de passe.',
    })
  }

  const valide =
    identifiants !== null &&
    (await verifierMotDePasse(motDePasse, identifiants.motDePasseHache))

  const verrouille = await enregistrerTentative(adresse, ip, appareil, valide)

  if (!valide) {
    if (verrouille) {
      throw createError({
        statusCode: 429,
        statusMessage:
          'Trop de tentatives : ce compte est bloqué 15 minutes. Réessayez plus tard ou réinitialisez votre mot de passe.',
      })
    }
    // Message identique que l'adresse existe ou non : rien ne doit permettre de
    // découvrir quels comptes sont ouverts sur la plateforme. Le compte à
    // rebours (planche A, 04b) est calculé sur l'adresse saisie, existante ou non.
    const tentativesRestantes = Math.max(0, 5 - (await compterEchecsRecents(adresse)))
    throw createError({
      statusCode: 401,
      statusMessage: 'Email ou mot de passe incorrect.',
      data: { tentativesRestantes },
    })
  }

  // Les comptes d'administration passent par leur propre porte, avec la
  // double vérification (planche C, écran 08).
  const role = identifiants.utilisateur.role
  if (role === 'admin-contenu' || role === 'admin-superieur') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Compte d’administration : connectez-vous depuis /admin/login.',
      data: { redirection: '/admin/login' },
    })
  }

  await ouvrirSession(event, identifiants.utilisateur, { longue: resterConnecte === true })

  // Suppression programmée (planche B, écran 12) : la reconnexion ouvre
  // l'écran « Bon retour », qui annule la suppression sur confirmation.
  const suppression = identifiants.utilisateur.suppressionPrevueLe
  const reactivable = Boolean(suppression && new Date(suppression) > new Date())
  return { ...identifiants.utilisateur, reactivable }
})
