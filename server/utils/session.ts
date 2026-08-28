import type { H3Event } from 'h3'
import type { SectionAdmin, Utilisateur } from '#shared/types'
import { trouverUtilisateur } from '../database/comptes'

const COOKIE = 'emc_session'

/** Une semaine, comme la session de démonstration qu'elle remplace. */
const DUREE_SECONDES = 60 * 60 * 24 * 7

interface DonneesSession {
  utilisateurId?: string
}

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

  if (process.env.NODE_ENV === 'production') {
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

function session(event: H3Event) {
  return useSession<DonneesSession>(event, {
    password: secret(),
    name: COOKIE,
    cookie: {
      sameSite: 'lax',
      path: '/',
      maxAge: DUREE_SECONDES,
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

export async function ouvrirSession(event: H3Event, utilisateur: Utilisateur) {
  const courante = await session(event)
  await courante.update({ utilisateurId: utilisateur.id })
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
