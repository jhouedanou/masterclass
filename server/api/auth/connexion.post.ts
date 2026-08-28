import { enregistrerTentative, trouverIdentifiants } from '../../database/comptes'
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
  const { email, motDePasse } = await readBody<{ email?: string; motDePasse?: string }>(event)

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
        'Trop de tentatives : ce compte est bloqué 30 minutes. Réessayez plus tard ou réinitialisez votre mot de passe.',
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
          'Trop de tentatives : ce compte est bloqué 30 minutes. Réessayez plus tard ou réinitialisez votre mot de passe.',
      })
    }
    // Message identique que l'adresse existe ou non : rien ne doit permettre de
    // découvrir quels comptes sont ouverts sur la plateforme.
    throw createError({ statusCode: 401, statusMessage: 'Adresse e-mail ou mot de passe incorrect.' })
  }

  await ouvrirSession(event, identifiants.utilisateur)
  return identifiants.utilisateur
})
