import type { H3Event } from 'h3'
import { compterTentativesPubliques, enregistrerTentativePublique } from '../database/debit'
import { adresseAppelant } from './reseau'

/**
 * Plafond d'appels par adresse sur les routes publiques d'écriture.
 *
 * Le verrou de connexion compte par compte : il ne protège ni l'inscription, ni
 * le mot de passe oublié, ni les trois formulaires publics, où il n'y a pas
 * toujours de compte en face. Ces routes n'avaient donc aucune limite — on
 * pouvait créer des comptes en série, chacun coûtant un scrypt de 16 Mo, ou
 * faire partir autant d'e-mails qu'on voulait vers une adresse choisie.
 *
 * Même forme que le comptage de `/verifier` (`server/api/verifier/[numero]`) :
 * une ligne par appel, une fenêtre glissante, et la purge de nuit qui efface le
 * reste — passé la fenêtre, ces lignes ne sont plus qu'un journal d'adresses IP
 * dont personne n'a l'usage.
 *
 * `adresseAppelant` donne la priorité à `x-vercel-forwarded-for`, posé par la
 * plateforme et non forgeable, là où `x-forwarded-for` seul se falsifie.
 */
export const FENETRE_DEBIT_MINUTES = 60

/** Plafonds par route, sur la fenêtre. Généreux pour un humain, serré pour un script. */
export const PLAFONDS = {
  inscription: 5,
  'mot-de-passe-oublie': 5,
  contact: 5,
  candidature: 3,
  'alerte-lancement': 5,
} as const

export type RoutePublique = keyof typeof PLAFONDS

/**
 * Compte l'appel et refuse au-delà du plafond. À appeler **avant** le travail
 * coûteux — le hachage, l'écriture, l'envoi — pour que le refus soit bon marché.
 *
 * Une base injoignable ne doit pas fermer le formulaire : le comptage échoue en
 * silence et laisse passer. Le plafond est une digue contre l'abus, pas un
 * élément du contrôle d'accès.
 */
export async function limiterDebit(event: H3Event, route: RoutePublique): Promise<void> {
  const ip = adresseAppelant(event)
  try {
    const appels = await compterTentativesPubliques(ip, route)
    if (appels >= PLAFONDS[route]) {
      throw createError({
        statusCode: 429,
        statusMessage: `Trop de tentatives depuis cette adresse. Réessayez dans ${FENETRE_DEBIT_MINUTES} minutes.`,
      })
    }
    await enregistrerTentativePublique(ip, route)
  } catch (erreur) {
    if ((erreur as { statusCode?: number }).statusCode === 429) throw erreur
  }
}
