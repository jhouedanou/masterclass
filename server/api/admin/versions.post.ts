import { enregistrerJournal } from '../../database/administration'
import { majBlocVitrine, trouverVersion } from '../../database/backoffice'
import { majArticle } from '../../database/blog'
import { majModule, trouverModule } from '../../database/catalogue'
import type { CleBlocVitrineSql } from '../../database/types'
import { exigerSection } from '../../utils/session'
import { assainirContenuCms, assainirHtml } from '../../utils/texteRiche'

/** Un champ riche d'une version : repassé par la liste blanche, comme à
 *  l'enregistrement. Absent ou d'un autre type, il est laissé tel quel. */
function riche(valeur: unknown): never {
  return (typeof valeur === 'string' ? assainirHtml(valeur) : valeur) as never
}

/**
 * Restauration en un clic (planche C, écran 06).
 *
 * La version contient l'état complet d'avant modification : la remettre revient
 * à réécrire l'objet avec ce contenu. La restauration est elle-même journalisée.
 *
 * Les champs riches repassent par l'assainissement : une version peut dater
 * d'avant la liste blanche, ou avoir été écrite en base par un autre chemin,
 * et la restauration la remettait telle quelle en `v-html` sur les pages
 * publiques. Et une version qui change le prix d'un module demande, comme une
 * modification directe, la section « Offres commerciales ».
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
        {
          contenu: (c.contenu && typeof c.contenu === 'object' ? assainirContenuCms(c.contenu) : c.contenu) as never,
          statut: c.statut,
        },
        auteur,
      )
      break

    case 'modules': {
      const actuel = await trouverModule(version.entiteId)
      if (c.prixFcfa !== undefined && c.prixFcfa !== actuel?.prixFcfa) {
        await exigerSection(event, 'offres-commerciales')
      }
      await majModule(version.entiteId, {
        titre: c.titre,
        promesse: c.promesse,
        pourquoi: riche(c.pourquoi),
        pourQui: c.pourQui,
        prerequis: c.prerequis,
        acquis: c.acquis,
        livrable: riche(c.livrable),
        faq: c.faq,
        prixFcfa: c.prixFcfa,
        // Les champs de la fiche commerciale font partie de la version
        // enregistrée : les omettre ici laisserait une restauration à moitié
        // faite, avec des points forts d'une version et un texte d'une autre.
        pointsForts: c.pointsForts,
        dateLancement: c.dateLancement,
        prixMasque: c.prixMasque,
      })
      break
    }

    case 'articles':
      await majArticle(version.entiteId, {
        titre: c.titre,
        chapo: c.chapo,
        contenu: riche(c.contenu),
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
