import type { EtatQuiz } from '#shared/types'

/**
 * Où en est l'attestation d'un module, pour tous les écrans de l'espace
 * apprenant. La règle est celle de `delivrer_certificat` (migration 40) :
 * vidéos vues à 100 % et, quand le module a un quiz, quiz réussi à 100 %.
 * Les écrans la répétaient chacun avec sa propre condition ; elle tient ici.
 */
export type EtatAttestation = 'delivree' | 'a-generer' | 'quiz-a-reussir' | 'en-progression' | 'non-commence'

/** Le module a un quiz, et il n'est pas encore réussi. */
export function quizAReussir(quiz: EtatQuiz | null | undefined): boolean {
  return !!quiz && !quiz.reussi
}

export function etatAttestation(
  progression: number,
  quiz: EtatQuiz | null | undefined,
  delivree: boolean,
): EtatAttestation {
  if (delivree) return 'delivree'
  if (progression >= 100) return quizAReussir(quiz) ? 'quiz-a-reussir' : 'a-generer'
  return progression > 0 ? 'en-progression' : 'non-commence'
}
