import { enregistrerJournal } from '../../database/administration'
import { creerModule, listerThematiques, reordonnerModules, trouverFormateur } from '../../database/catalogue'
import { exigerSection } from '../../utils/session'

/**
 * Création d'un module, en brouillon — fiche, contenu et offre s'ouvrent
 * ensuite —, et réordonnancement des modules d'une thématique (écran 02).
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'modules-chapitres')
  const body = await readBody<{
    action?: 'creer' | 'reordonner'
    titre: string
    slug: string
    numero: number
    thematiqueId: string
    formateurId: string
    promesse?: string
    /** Réordonnancement : les identifiants de module dans le nouvel ordre. */
    ordre?: string[]
  }>(event)

  if (body.action === 'reordonner') {
    if (!Array.isArray(body.ordre) || body.ordre.length < 2) {
      throw createError({ statusCode: 422, statusMessage: 'Ordre des modules manquant' })
    }
    await reordonnerModules(body.ordre)
    await enregistrerJournal(
      `${admin.prenom} ${admin.nom}`,
      'a réordonné les modules',
      `${body.ordre.length} modules`,
    )
    return { ok: true }
  }

  if (!body.titre?.trim() || !body.slug?.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Titre et URL sont requis' })
  }

  const [thematiques, formateur] = await Promise.all([
    listerThematiques(),
    trouverFormateur(body.formateurId),
  ])
  const thematique = thematiques.find((t) => t.id === body.thematiqueId)
  if (!thematique || !formateur) {
    throw createError({ statusCode: 404, statusMessage: 'Thématique ou formateur introuvable' })
  }

  const moduleCree = await creerModule({
    slug: body.slug.trim(),
    numero: body.numero,
    titre: body.titre.trim(),
    programme: thematique.programme,
    thematiqueId: body.thematiqueId,
    formateurId: body.formateurId,
    promesse: body.promesse,
  })

  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    'a créé le module',
    `${moduleCree.titre} — ${thematique.nom}`,
  )
  return moduleCree
})
