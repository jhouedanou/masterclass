import { listerModules, listerThematiques } from '../../../database/catalogue'
import { avancementChapitresModule, listerAccesModule, listerUtilisateurs } from '../../../database/comptes'
import { listerCertificats } from '../../../database/commerce'
import { exigerFormateur } from '../../../utils/session'

/**
 * Détail d'un module du formateur (planche D, écran 03 : « Cliquer un module
 * ouvre le détail : progression chapitre par chapitre, liste des inscrits »).
 *
 * Lecture seule : le contenu est produit avec l'équipe depuis le back-office.
 * Les inscrits n'apparaissent qu'en prénom et initiale, sans coordonnées.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerFormateur(event)
  const id = getRouterParam(event, 'id') ?? ''

  const modules = await listerModules()
  const module = modules.find((m) => m.id === id)
  if (!module) throw createError({ statusCode: 404, statusMessage: 'Module introuvable' })
  if (module.formateurId !== utilisateur.formateurId) {
    throw createError({ statusCode: 403, statusMessage: 'Ce module n’est pas le vôtre' })
  }

  const [thematiques, acces, chapitres, comptes, certificats] = await Promise.all([
    listerThematiques(),
    listerAccesModule(module.id),
    avancementChapitresModule(module.id),
    listerUtilisateurs(),
    listerCertificats(),
  ])

  const actifs = acces.filter((a) => !a.revoqueLe)
  const certifies = new Set(
    certificats.filter((c) => c.moduleId === module.id).map((c) => c.utilisateurId),
  )

  return {
    module: {
      id: module.id,
      numero: module.numero,
      titre: module.titre,
      slug: module.slug,
      programme: module.programme,
      statut: module.statut,
      thematique: thematiques.find((t) => t.id === module.thematiqueId)?.nom ?? '',
      dureeMinutes: module.dureeMinutes,
      nbChapitres: module.chapitres.length,
    },
    inscrits: actifs.length,
    completion: actifs.length
      ? Math.round(actifs.reduce((somme, a) => somme + a.progression, 0) / actifs.length)
      : 0,
    certificats: certifies.size,
    chapitres,
    apprenants: actifs
      .map((a) => {
        const compte = comptes.find((u) => u.id === a.utilisateurId)
        return {
          id: a.utilisateurId,
          nom: compte ? `${compte.prenom} ${compte.nom[0] ?? ''}.` : '—',
          progression: a.progression,
          inscritLe: a.acheteLe,
          termine: Boolean(a.termineLe),
          certifie: certifies.has(a.utilisateurId),
        }
      })
      .sort((a, b) => b.progression - a.progression),
  }
})
