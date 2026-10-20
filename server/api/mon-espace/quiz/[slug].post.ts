import { soumettreQuiz } from '../../../database/quiz'
import { exigerModuleAcquis } from '../../../utils/quiz'

const LETTRE = /^[A-Z]$/

/**
 * Soumission du quiz, corrigée en base (`soumettre_quiz`) : note sur 100,
 * réussite à 100 %, trois tentatives par jour à l'heure d'Abidjan. Pour chaque
 * question, ✓ et justification, ou ✗, piste et chapitres à revoir — jamais la
 * bonne réponse.
 */
export default defineEventHandler(async (event) => {
  const { utilisateur, module } = await exigerModuleAcquis(event)
  const corps = await readBody<{ reponses?: unknown }>(event)

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

  return await soumettreQuiz(utilisateur.id, module.id, reponses as Record<string, string>)
})
