import { listerRessources } from '../../database/backoffice'
import { listerFormateurs, listerThematiques, trouverModuleParSlug } from '../../database/catalogue'
import { lireSession, sectionsEffectives } from '../../utils/session'
import { secretVideo, signer } from '../../utils/video'
import { memeSecret } from '../../utils/secrets'

/**
 * Module vu comme l'apprenant le verra, quel que soit son statut.
 *
 * Deux façons d'y accéder : une session d'administration disposant du droit
 * sur les contenus — c'est le cas de l'iframe de l'éditeur, qui porte le
 * cookie —, ou un jeton signé, pour envoyer la page à un formateur qui doit
 * relire son module sans avoir de compte d'administration.
 *
 * Le jeton ne vaut qu'une demi-heure, et c'est délibéré : un lien qui fuite ne
 * doit pas rester ouvert. Il ne coûte aucune colonne en base, donc rien à
 * nettoyer. Un paramètre « ?apercu=1 » sur la page publique aurait été plus
 * simple et aurait fini par fuiter en production.
 */
export const DUREE_APERCU_SECONDES = 30 * 60

export function messageApercu(moduleId: string, expiration: number): string {
  return `apercu.${moduleId}.${expiration}`
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const moduleTrouve = await trouverModuleParSlug(slug)
  if (!moduleTrouve) throw createError({ statusCode: 404, statusMessage: 'Module introuvable' })

  const session = await lireSession(event)
  const sections = session ? sectionsEffectives(session) : []
  const estAdmin = sections === 'toutes' || sections.includes('modules-chapitres')

  if (!estAdmin) {
    const { jeton, e } = getQuery(event) as { jeton?: string; e?: string }
    const expiration = Number(e)
    if (!jeton || !expiration || expiration < Math.floor(Date.now() / 1000)) {
      throw createError({ statusCode: 403, statusMessage: 'Lien de prévisualisation expiré' })
    }
    const attendu = await signer(messageApercu(moduleTrouve.id, expiration), secretVideo())
    if (!memeSecret(jeton, attendu)) {
      throw createError({ statusCode: 403, statusMessage: 'Lien de prévisualisation invalide' })
    }
  }

  const [thematiques, formateurs, ressources] = await Promise.all([
    listerThematiques(),
    listerFormateurs(),
    listerRessources(moduleTrouve.id),
  ])

  return {
    module: moduleTrouve,
    thematique: thematiques.find((t) => t.id === moduleTrouve.thematiqueId) ?? null,
    formateur: formateurs.find((f) => f.id === moduleTrouve.formateurId) ?? null,
    ressources,
    statut: moduleTrouve.statut,
    pretLe: moduleTrouve.pretLe,
  }
})
