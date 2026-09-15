import type { H3Event } from 'h3'
import type { SectionAdmin, Utilisateur } from '#shared/types'
import { trouverUtilisateur } from '../database/comptes'

const COOKIE = 'emc_session'

/** Une semaine, comme la session de démonstration qu'elle remplace. */
const DUREE_SECONDES = 60 * 60 * 24 * 7
/** « Rester connecté » (planche A, écran 04b) : trente jours. */
const DUREE_LONGUE_SECONDES = 60 * 60 * 24 * 30

interface DonneesSession {
  utilisateurId?: string
  /** Connexion admin en deux temps : mot de passe accepté, code attendu. */
  adminEnAttenteId?: string
  /**
   * Début de cette attente, en millisecondes.
   *
   * Le code par e-mail expirait en base au bout de dix minutes, ce qui bornait
   * l'étape 2 sans que la session s'en mêle. Un TOTP n'expire nulle part : sans
   * cet horodatage, une attente ouverte vivrait aussi longtemps que le cookie,
   * soit une semaine.
   */
  adminEnAttenteDepuis?: number
  /**
   * Codes refusés depuis le début de l'attente.
   *
   * Le plafond de cinq essais tenait à `codes_verification.tentatives`, qui
   * disparaît avec le code en base. Sans compteur ici, quelqu'un tenant le mot
   * de passe pourrait marteler les six chiffres sans limite.
   */
  adminEchecs?: number
  /** Session longue demandée à la connexion (« Rester connecté »). */
  longue?: boolean
}

/** Au-delà, l'étape 2 est refermée : il faut ressaisir le mot de passe. */
export const ATTENTE_ADMIN_MINUTES = 10

/** Nombre de codes refusés avant de refermer l'étape 2. */
export const ECHECS_ADMIN_MAX = 5

/**
 * Session applicative : cookie scellé par h3 (chiffré et signé, iron).
 *
 * L'identifiant n'y est plus lisible ni modifiable côté client — la version
 * précédente le stockait en clair, ce qui permettait à quiconque d'usurper
 * n'importe quel compte en éditant son cookie.
 */
function secret(): string {
  const config = useRuntimeConfig()
  // Même priorité que pour la base : l'exécution prime sur le build.
  const mot = process.env.NUXT_SESSION_PASSWORD || config.sessionPassword || ''

  if (mot.length >= 32) return mot

  // Porte fermée par défaut : le repli n'existe que sous un `NODE_ENV` de
  // développement déclaré. N'interdire que `production` laissait un
  // hébergement qui ne pose pas la variable (`node .output/server/index.mjs`
  // sans environnement) sceller ses sessions avec le mot de passe publié
  // ci-dessous — n'importe qui pouvait alors forger le cookie de n'importe
  // quel compte, administrateur compris.
  if (process.env.NODE_ENV !== 'development') {
    throw createError({
      statusCode: 500,
      statusMessage:
        'NUXT_SESSION_PASSWORD manquant ou trop court (32 caractères minimum) : les sessions ne peuvent pas être scellées.',
    })
  }

  // Repli de développement uniquement : les sessions sont alors scellées avec
  // une valeur connue, sans valeur de sécurité.
  return 'developpement-uniquement-e-masterclass-big-five'
}

function session(event: H3Event, longue = false) {
  return useSession<DonneesSession>(event, {
    password: secret(),
    name: COOKIE,
    cookie: {
      sameSite: 'lax',
      path: '/',
      maxAge: longue ? DUREE_LONGUE_SECONDES : DUREE_SECONDES,
      httpOnly: true,
      // `Secure` dès que la requête arrive en HTTPS — c'est le cas en
      // production, derrière le proxy comme en direct. En HTTP local, le poser
      // rendrait la session inutilisable : le navigateur refuserait de la
      // renvoyer. `getRequestProtocol` tient compte de `x-forwarded-proto`.
      secure: getRequestProtocol(event) === 'https',
    },
  })
}

/**
 * Le compte est relu en base à chaque requête : un changement de rôle, une
 * révocation de droits ou une suppression prend effet immédiatement.
 */
export async function lireSession(event: H3Event): Promise<Utilisateur | null> {
  const { data } = await session(event)
  if (!data.utilisateurId) return null
  return await trouverUtilisateur(data.utilisateurId)
}

export async function ouvrirSession(
  event: H3Event,
  utilisateur: Utilisateur,
  options: { longue?: boolean } = {},
) {
  const courante = await session(event, options.longue === true)
  await courante.update({
    utilisateurId: utilisateur.id,
    adminEnAttenteId: undefined,
    adminEnAttenteDepuis: undefined,
    adminEchecs: undefined,
    longue: options.longue === true,
  })
}

/** Étape 1 de la connexion admin (planche C, écran 08) : le mot de passe est
 *  bon, la session ne s'ouvre qu'après le code. */
export async function ouvrirSessionPartielle(event: H3Event, utilisateurId: string) {
  const courante = await session(event)
  await courante.update({
    adminEnAttenteId: utilisateurId,
    adminEnAttenteDepuis: Date.now(),
    adminEchecs: 0,
  })
}

/**
 * Compte en attente du second facteur, `null` si l'attente est absente,
 * périmée ou épuisée. Une attente hors délai est effacée au passage, pour ne
 * pas laisser traîner un demi-droit dans le cookie.
 */
export async function lireSessionPartielle(event: H3Event): Promise<string | null> {
  const courante = await session(event)
  const { adminEnAttenteId, adminEnAttenteDepuis, adminEchecs } = courante.data
  if (!adminEnAttenteId) return null

  const perimee =
    !adminEnAttenteDepuis || Date.now() - adminEnAttenteDepuis > ATTENTE_ADMIN_MINUTES * 60_000
  if (perimee || (adminEchecs ?? 0) >= ECHECS_ADMIN_MAX) {
    await fermerAttenteAdmin(event)
    return null
  }
  return adminEnAttenteId
}

/** Compte un code refusé et dit s'il reste des essais. */
export async function compterEchecAdmin(event: H3Event): Promise<{ restants: number }> {
  const courante = await session(event)
  const echecs = (courante.data.adminEchecs ?? 0) + 1
  await courante.update({ adminEchecs: echecs })
  if (echecs >= ECHECS_ADMIN_MAX) await fermerAttenteAdmin(event)
  return { restants: Math.max(0, ECHECS_ADMIN_MAX - echecs) }
}

export async function fermerAttenteAdmin(event: H3Event) {
  const courante = await session(event)
  await courante.update({
    adminEnAttenteId: undefined,
    adminEnAttenteDepuis: undefined,
    adminEchecs: undefined,
  })
}

export async function fermerSession(event: H3Event) {
  const courante = await session(event)
  await courante.clear()
}

export async function exigerUtilisateur(event: H3Event): Promise<Utilisateur> {
  const utilisateur = await lireSession(event)
  if (!utilisateur) {
    throw createError({ statusCode: 401, statusMessage: 'Authentification requise' })
  }
  return utilisateur
}

export async function exigerFormateur(event: H3Event): Promise<Utilisateur> {
  const utilisateur = await exigerUtilisateur(event)
  if (utilisateur.role !== 'formateur') {
    throw createError({ statusCode: 403, statusMessage: 'Espace réservé aux formateurs' })
  }
  return utilisateur
}

export async function exigerAdmin(event: H3Event, superieur = false): Promise<Utilisateur> {
  const utilisateur = await exigerUtilisateur(event)
  const autorise = superieur
    ? utilisateur.role === 'admin-superieur'
    : utilisateur.role === 'admin-contenu' || utilisateur.role === 'admin-superieur'
  if (!autorise) {
    throw createError({ statusCode: 403, statusMessage: 'Droits insuffisants' })
  }
  return utilisateur
}

/**
 * Droit fin par section du back-office (planche C, écran « Créer un compte
 * administrateur »). L'administrateur supérieur voit tout ; un administrateur
 * de contenu ne voit que les sections qui lui ont été cochées.
 */
export async function exigerSection(
  event: H3Event,
  section: SectionAdmin,
): Promise<Utilisateur> {
  const utilisateur = await exigerAdmin(event)
  if (utilisateur.role === 'admin-superieur') return utilisateur

  if (!utilisateur.sectionsAutorisees?.includes(section)) {
    throw createError({ statusCode: 403, statusMessage: 'Droits insuffisants' })
  }
  return utilisateur
}

/** Les sections non autorisées sont masquées, pas seulement désactivées :
 *  le front a besoin de la liste effective pour construire son menu. */
export function sectionsEffectives(utilisateur: Utilisateur): SectionAdmin[] | 'toutes' {
  return utilisateur.role === 'admin-superieur' ? 'toutes' : (utilisateur.sectionsAutorisees ?? [])
}
