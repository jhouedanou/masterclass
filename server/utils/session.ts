import type { H3Event } from 'h3'
import type { SectionAdmin, Utilisateur } from '#shared/types'
import { trouverUtilisateur } from '../database/comptes'
import { compterTentativesPubliques, enregistrerTentativePublique } from '../database/debit'

const COOKIE = 'emc_session'

/** Une semaine, comme la session de démonstration qu'elle remplace. */
const DUREE_SECONDES = 60 * 60 * 24 * 7
/** « Rester connecté » (planche A, écran 04b) : trente jours. */
const DUREE_LONGUE_SECONDES = 60 * 60 * 24 * 30
/** Un compte d'administration : une journée de travail, « Rester connecté »
 *  ou non. Ses droits ouvrent les paiements, les accès et les attestations. */
const DUREE_ADMIN_SECONDES = 60 * 60 * 12

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
  /**
   * Ouverture de la session, en millisecondes. Elle borne sa durée et la
   * rattache au mot de passe du moment : un changement de mot de passe ferme
   * toutes les sessions ouvertes avant lui, y compris un cookie volé.
   */
  ouverteLe?: number
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
    // Durée de validité du sceau lui-même. Sans elle, h3 ne contrôle pas l'âge
    // du cookie : passé à `cookie` seul, `maxAge` ne règle que son expiration
    // dans le navigateur, et une copie gardée ailleurs restait valable à vie.
    maxAge: DUREE_LONGUE_SECONDES,
    cookie: {
      sameSite: 'lax',
      path: '/',
      maxAge: longue ? DUREE_LONGUE_SECONDES : DUREE_SECONDES,
      httpOnly: true,
      // `Secure` partout sauf en développement. Il était auparavant déduit du
      // protocole vu par h3 : derrière un proxy qui ne pose pas
      // `x-forwarded-proto`, la requête paraît en clair et le cookie de session
      // partait sans `Secure`. Le mode de développement, lui, sert en HTTP :
      // l'y poser rendrait la session inutilisable, le navigateur refusant de
      // la renvoyer.
      secure: !import.meta.dev || getRequestProtocol(event) === 'https',
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
  // Une session sans date d'ouverture est antérieure à ces contrôles : elle
  // n'est plus honorée, et il suffit de se reconnecter.
  if (!data.ouverteLe) return null

  const utilisateur = await trouverUtilisateur(data.utilisateurId)
  if (!utilisateur) return null

  const admin = utilisateur.role === 'admin-contenu' || utilisateur.role === 'admin-superieur'
  const duree = admin ? DUREE_ADMIN_SECONDES : data.longue ? DUREE_LONGUE_SECONDES : DUREE_SECONDES
  if (Date.now() - data.ouverteLe > duree * 1000) return null

  // Mot de passe changé depuis l'ouverture (réinitialisation, changement
  // depuis le profil) : la session appartient à l'ancien mot de passe.
  const majLe = utilisateur.motDePasseMajLe ? Date.parse(utilisateur.motDePasseMajLe) : 0
  if (majLe > data.ouverteLe) return null

  return utilisateur
}

/**
 * Après un changement de mot de passe depuis une session ouverte : celle-ci
 * reprend la date du nouveau mot de passe, les autres restent fermées.
 */
export async function renouvelerSession(event: H3Event): Promise<void> {
  const courante = await session(event)
  if (courante.data.utilisateurId) await courante.update({ ouverteLe: Date.now() })
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
    ouverteLe: Date.now(),
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

/** Essais de second facteur admis par compte sur la fenêtre de comptage des
 *  routes publiques (une heure). */
export const ESSAIS_CODE_ADMIN_MAX = 10

/**
 * Plafond d'essais de second facteur, tenu en base et par compte.
 *
 * Le compteur de la session d'attente (`adminEchecs`) vit dans le cookie : il
 * suffisait de rejouer le cookie émis après le mot de passe, où il vaut zéro,
 * pour essayer autant de codes qu'on voulait, en parallèle. Celui-ci est côté
 * serveur. L'essai est inscrit **avant** d'être compté : des requêtes lancées
 * ensemble se voient donc les unes les autres, et la rafale bute sur le plafond
 * au lieu de passer d'un bloc. Réussites comprises — un admin en tape un ou
 * deux, un script des milliers.
 *
 * Contrairement au plafond des formulaires publics, une base injoignable ferme
 * ici la porte : c'est un contrôle d'accès, pas une digue contre l'abus.
 */
export async function plafonnerEssaisCode(utilisateurId: string): Promise<void> {
  const cle = `compte:${utilisateurId}`
  await enregistrerTentativePublique(cle, 'code-admin')
  if ((await compterTentativesPubliques(cle, 'code-admin')) > ESSAIS_CODE_ADMIN_MAX) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Trop de codes essayés sur ce compte : réessayez dans une heure.',
    })
  }
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

/**
 * Même chose, pour un écran que le menu range sous plusieurs sections.
 *
 * Trois cas dans la planche C : « Coaching privé » et « Statistiques » pointent
 * la même page ; le panneau de référencement est embarqué dans l'éditeur de
 * module comme dans celui d'article ; les candidatures se lisent depuis leur
 * écran et depuis celui des formateurs. Exiger une seule section y fermerait la
 * porte à un administrateur qui a légitimement l'autre.
 */
export async function exigerUneSection(
  event: H3Event,
  sections: SectionAdmin[],
): Promise<Utilisateur> {
  const utilisateur = await exigerAdmin(event)
  if (utilisateur.role === 'admin-superieur') return utilisateur

  const siennes = utilisateur.sectionsAutorisees ?? []
  if (!sections.some((section) => siennes.includes(section))) {
    throw createError({ statusCode: 403, statusMessage: 'Droits insuffisants' })
  }
  return utilisateur
}

/** Les sections non autorisées sont masquées, pas seulement désactivées :
 *  le front a besoin de la liste effective pour construire son menu. */
export function sectionsEffectives(utilisateur: Utilisateur): SectionAdmin[] | 'toutes' {
  return utilisateur.role === 'admin-superieur' ? 'toutes' : (utilisateur.sectionsAutorisees ?? [])
}
