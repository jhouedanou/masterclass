import { trouverFormateur } from '../../../database/catalogue'
import { copieReussie, etatQuiz, listerQuestionsQuiz } from '../../../database/quiz'
import { exigerModuleAcquis } from '../../../utils/quiz'

/**
 * Quiz d'un module acquis : les questions et leurs options, jamais la bonne
 * réponse ni la justification — la correction n'arrive qu'avec la soumission.
 * Un quiz déjà réussi est fermé : on renvoie alors la copie réussie, dont
 * toutes les réponses sont justes.
 */
export default defineEventHandler(async (event) => {
  const { utilisateur, module, acces } = await exigerModuleAcquis(event)

  const [etat, questions, formateur] = await Promise.all([
    etatQuiz(utilisateur.id, module.id),
    listerQuestionsQuiz(module.id),
    trouverFormateur(module.formateurId),
  ])
  if (!etat || !questions.length) {
    throw createError({ statusCode: 404, statusMessage: 'Ce module n’a pas de quiz' })
  }

  return {
    module: { id: module.id, slug: module.slug, titre: module.titre, formateur: formateur?.nom ?? null },
    progression: acces.progression,
    questions,
    etat,
    copie: etat.reussi ? await copieReussie(utilisateur.id, module.id) : null,
  }
})
