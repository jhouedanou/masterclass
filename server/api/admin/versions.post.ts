import { enregistrerJournal } from '../../database/administration'
import { majBlocVitrine, trouverVersion } from '../../database/backoffice'
import { majArticle } from '../../database/blog'
import { majModule } from '../../database/catalogue'
import type { CleBlocVitrineSql } from '../../database/types'
import { exigerSection } from '../../utils/session'

/**
 * Restauration en un clic (planche C, écran 06).
 *
 * La version contient l'état complet d'avant modification : la remettre revient
 * à réécrire l'objet avec ce contenu. La restauration est elle-même journalisée.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'historique-versions')
  const { versionId } = await readBody<{ versionId: string }>(event)

  const version = await trouverVersion(versionId)
  if (!version) throw createError({ statusCode: 404, statusMessage: 'Version introuvable' })

  const auteur = `${admin.prenom} ${admin.nom}`
  const c = version.contenu as Record<string, never>

  switch (version.entite) {
    case 'blocs_vitrine':
      await majBlocVitrine(
        version.entiteId as CleBlocVitrineSql,
        { contenu: c.contenu, statut: c.statut },
        auteur,
      )
      break

    case 'modules':
      await majModule(version.entiteId, {
        titre: c.titre,
        promesse: c.promesse,
        pourquoi: c.pourquoi,
        pourQui: c.pourQui,
        prerequis: c.prerequis,
        acquis: c.acquis,
        livrable: c.livrable,
        faq: c.faq,
        prixFcfa: c.prixFcfa,
      })
      break

    case 'articles':
      await majArticle(version.entiteId, {
        titre: c.titre,
        chapo: c.chapo,
        contenu: c.contenu,
        categorie: c.categorie,
        image: c.image,
        imageAlt: c.imageAlt,
      })
      break

    default:
      throw createError({
        statusCode: 422,
        statusMessage: 'Ce type de contenu ne sait pas être restauré.',
      })
  }

  await enregistrerJournal(
    auteur,
    'a restauré une version',
    `${version.libelle} — version du ${new Date(version.creeLe).toLocaleString('fr-FR')}`,
  )
  return { ok: true }
})
