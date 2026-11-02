import { listerModules } from '../../database/catalogue'
import { listerAcces } from '../../database/comptes'
import { listerChapitresPedagogie, listerToutesTentativesQuiz, listerTousVisionnages } from '../../database/pedagogie'
import { exigerSection } from '../../utils/session'

/**
 * Tableau de bord pédagogique (brief du 02/11) : complétion par module,
 * abandon chapitre par chapitre, réussite aux quiz.
 *
 * Tout vient de la base — accès, visionnages, tentatives de quiz — et non de
 * GA4 : ces chiffres valent pour tous les apprenants, qu'ils aient accepté
 * les cookies ou non. Seuls les accès en cours comptent (pas les révoqués).
 *
 * Un chapitre est « commencé » dès qu'une seconde y a été relevée, « vu » au
 * même seuil que la progression (95 % de sa durée).
 */
export default defineEventHandler(async (event) => {
  await exigerSection(event, 'apprenants')

  const [modules, acces, chapitres, visionnages, tentatives] = await Promise.all([
    listerModules(),
    listerAcces(),
    listerChapitresPedagogie(),
    listerTousVisionnages(),
    listerToutesTentativesQuiz(),
  ])

  const accesEnCours = acces.filter((a) => !a.revoqueLe)
  const vuesParChapitre = new Map<string, Map<string, number>>()
  for (const v of visionnages) {
    const parApprenant = vuesParChapitre.get(v.chapitreId) ?? new Map<string, number>()
    parApprenant.set(v.utilisateurId, v.secondesVues)
    vuesParChapitre.set(v.chapitreId, parApprenant)
  }

  const lignes = modules
    .map((module) => {
      const inscrits = accesEnCours.filter((a) => a.moduleId === module.id)
      const ids = new Set(inscrits.map((a) => a.utilisateurId))
      const termines = inscrits.filter((a) => a.progression >= 100).length
      const commences = inscrits.filter((a) => a.progression > 0).length

      const chapitresDuModule = chapitres
        .filter((c) => c.moduleId === module.id)
        .sort((a, b) => a.position - b.position)
        .map((c) => {
          const vues = vuesParChapitre.get(c.id) ?? new Map<string, number>()
          let commencesChapitre = 0
          let vusChapitre = 0
          for (const [utilisateurId, secondes] of vues) {
            if (!ids.has(utilisateurId) || secondes <= 0) continue
            commencesChapitre++
            if (c.dureeSecondes > 0 && secondes >= c.dureeSecondes * 0.95) vusChapitre++
          }
          return { position: c.position, titre: c.titre, commences: commencesChapitre, vus: vusChapitre }
        })

      // Dernières notes et réussites, apprenant par apprenant.
      const tentativesModule = tentatives.filter((t) => t.moduleId === module.id && ids.has(t.utilisateurId))
      const passes = new Set(tentativesModule.map((t) => t.utilisateurId))
      const reussis = new Set(tentativesModule.filter((t) => t.reussi).map((t) => t.utilisateurId))

      return {
        id: module.id,
        titre: module.titre,
        programme: module.programme,
        inscrits: inscrits.length,
        commences,
        termines,
        progressionMoyenne: inscrits.length
          ? Math.round(inscrits.reduce((somme, a) => somme + a.progression, 0) / inscrits.length)
          : 0,
        quiz: {
          apprenants: passes.size,
          reussis: reussis.size,
          tentatives: tentativesModule.length,
          noteMoyenne: tentativesModule.length
            ? Math.round(tentativesModule.reduce((somme, t) => somme + t.note, 0) / tentativesModule.length)
            : null,
        },
        chapitres: chapitresDuModule,
      }
    })
    .filter((l) => l.inscrits > 0)
    .sort((a, b) => b.inscrits - a.inscrits)

  const total = lignes.reduce(
    (t, l) => ({
      inscrits: t.inscrits + l.inscrits,
      commences: t.commences + l.commences,
      termines: t.termines + l.termines,
      quizApprenants: t.quizApprenants + l.quiz.apprenants,
      quizReussis: t.quizReussis + l.quiz.reussis,
    }),
    { inscrits: 0, commences: 0, termines: 0, quizApprenants: 0, quizReussis: 0 },
  )

  return { total, modules: lignes }
})
