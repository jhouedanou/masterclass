import type { SeoFields } from '#shared/types'
import { articles, formateurs, modules, programmes, redirections } from '../../data/db'
import { exigerAdmin } from '../../utils/session'

/** Champs que seul un administrateur supérieur peut modifier (spec SEO §3 et §13). */
const CHAMPS_RESERVES: (keyof SeoFields)[] = ['slug', 'indexable', 'canonical']

export default defineEventHandler(async (event) => {
  const utilisateur = exigerAdmin(event)
  const body = await readBody<{ id: string; seo: SeoFields; confirmationSlug?: boolean }>(event)

  const cible =
    modules.find((m) => m.id === body.id) ??
    formateurs.find((f) => f.id === body.id) ??
    articles.find((a) => a.id === body.id) ??
    programmes.find((p) => p.id === body.id)

  if (!cible) {
    throw createError({ statusCode: 404, statusMessage: 'Page introuvable' })
  }

  const modifie = { ...body.seo }
  if (utilisateur.role !== 'admin-superieur') {
    for (const champ of CHAMPS_RESERVES) delete modifie[champ]
  }

  // Spec §5 : changement de slug => redirection permanente + confirmation.
  const nouveauSlug = modifie.slug?.trim()
  if (nouveauSlug && 'slug' in cible && nouveauSlug !== cible.slug) {
    if (!body.confirmationSlug) {
      throw createError({
        statusCode: 428,
        statusMessage: 'Confirmation requise avant de modifier une URL déjà publiée',
      })
    }
    const prefixe =
      'titre' in cible ? '/modules/' : 'chapo' in cible ? '/blog/' : '/formateurs/'
    redirections.push({
      de: `${prefixe}${cible.slug}`,
      vers: `${prefixe}${nouveauSlug}`,
      creeeLe: new Date().toISOString(),
    })
    cible.slug = nouveauSlug
  }
  delete modifie.slug

  cible.seo = { ...cible.seo, ...modifie }
  return cible
})
