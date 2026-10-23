import { etatQuiz, listerQuestionsQuiz, soumettreQuiz } from '../../../database/quiz'
import {
  PROGRESSION_QUIZ,
  exigerModuleAcquis,
  ordreCourant,
  versLettresOrigine,
} from '../../../utils/quiz'

const LETTRE = /^[A-Z]$/

/**
 * Soumission du quiz, corrigée en base (`soumettre_quiz`) : note sur 100,
 * réussite à 100 %, trois tentatives par jour à l'heure d'Abidjan. Pour chaque
 * question, ✓ et justification, ou ✗, piste et chapitres à revoir — jamais la
 * bonne réponse.
 *
 * Les lettres reçues sont celles de l'ordre mélangé que la page a affiché
 * (`ordre`, voir `melangerQuestions`). Cet ordre doit être celui de la
 * tentative en cours : resservir celui d'une tentative passée rendrait aux
 * lettres leur sens d'une fois sur l'autre, et l'élimination redeviendrait
 * mécanique.
 */
export default defineEventHandler(async (event) => {
  const { utilisateur, module, acces } = await exigerModuleAcquis(event)
  const corps = await readBody<{ reponses?: unknown; ordre?: { jour?: unknown; numero?: unknown } }>(event)

  const reponses = corps?.reponses
  if (
    !reponses ||
    typeof reponses !== 'object' ||
    Array.isArray(reponses) ||
    Object.keys(reponses).length > 50 ||
    !Object.values(reponses).every((v) => typeof v === 'string' && LETTRE.test(v))
  ) {
    throw createError({ statusCode: 422, statusMessage: 'Réponses illisibles' })
  }

  if (acces.progression < PROGRESSION_QUIZ) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Terminez toutes les vidéos du module pour ouvrir le quiz.',
    })
  }

  const [etat, questions] = await Promise.all([
    etatQuiz(utilisateur.id, module.id),
    listerQuestionsQuiz(module.id),
  ])
  if (!etat || !questions.length) {
    throw createError({ statusCode: 404, statusMessage: 'Ce module n’a pas de quiz' })
  }

  // Quiz réussi ou tentatives épuisées : la base refuse avec son propre motif,
  // avant toute correction. L'ordre n'importe plus.
  const ordre = ordreCourant(etat.tentativesUtilisees)
  if (!etat.reussi && etat.tentativesRestantes > 0) {
    if (corps.ordre?.jour !== ordre.jour || corps.ordre?.numero !== ordre.numero) {
      throw createError({
        statusCode: 409,
        statusMessage:
          'Ce quiz a été renouvelé depuis l’ouverture de la page (nouvelle tentative ou nouveau jour). Rechargez-la pour répondre.',
      })
    }
  }

  return await soumettreQuiz(
    utilisateur.id,
    module.id,
    versLettresOrigine(reponses as Record<string, string>, questions, utilisateur.id, module.id, ordre),
  )
})
