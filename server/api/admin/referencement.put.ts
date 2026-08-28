import type { SeoFields } from '#shared/types'
import {
  creerRedirection,
  localiserEntiteSeo,
  majSeoEntite,
  type TableSeo,
} from '../../database/administration'
import { colonnesSeo } from '../../database/mappers'
import { exigerAdmin } from '../../utils/session'

/** Champs que seul un administrateur supérieur peut modifier (spec SEO §3 et §13). */
const CHAMPS_RESERVES: (keyof SeoFields)[] = ['slug', 'indexable', 'canonical']

/** Préfixe d'URL par entité, pour construire la redirection permanente.
 *  Déduire le type depuis la forme de l'objet confondait les articles et les
 *  modules, qui portent tous deux un `titre`. */
const PREFIXES: Record<TableSeo, string> = {
  modules: '/modules/',
  articles: '/blog/',
  formateurs: '/formateurs/',
  programmes: '/programmes/',
}

export default defineEventHandler(async (event) => {
  const utilisateur = await exigerAdmin(event)
  const body = await readBody<{ id: string; seo: SeoFields; confirmationSlug?: boolean }>(event)

  const cible = await localiserEntiteSeo(body.id)
  if (!cible) {
    throw createError({ statusCode: 404, statusMessage: 'Page introuvable' })
  }

  const modifie = { ...body.seo }
  if (utilisateur.role !== 'admin-superieur') {
    for (const champ of CHAMPS_RESERVES) delete modifie[champ]
  }

  const champs: Partial<ReturnType<typeof colonnesSeo>> & { slug?: string } = colonnesSeo(modifie)

  // Spec §5 : changement de slug => redirection permanente + confirmation.
  const nouveauSlug = modifie.slug?.trim()
  if (nouveauSlug && nouveauSlug !== cible.slug && cible.table !== 'programmes') {
    if (!body.confirmationSlug) {
      throw createError({
        statusCode: 428,
        statusMessage: 'Confirmation requise avant de modifier une URL déjà publiée',
      })
    }
    const prefixe = PREFIXES[cible.table]
    await creerRedirection(`${prefixe}${cible.slug}`, `${prefixe}${nouveauSlug}`)
    champs.slug = nouveauSlug
  }

  return await majSeoEntite(cible.table, body.id, champs)
})
