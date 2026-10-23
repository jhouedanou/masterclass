import { createHmac } from 'node:crypto'
import type { H3Event } from 'h3'
import type { Acces, Module, QuestionQuiz, Utilisateur } from '#shared/types'
import { trouverModuleParSlug } from '../database/catalogue'
import { trouverAcces } from '../database/comptes'
import { cleDerivee, exigerUtilisateur } from './session'

/**
 * Garde commune aux routes du quiz : apprenant connecté, module trouvé par son
 * slug et possédé — accès non révoqué —, comme la fiche module et le lecteur.
 */
export async function exigerModuleAcquis(
  event: H3Event,
): Promise<{ utilisateur: Utilisateur; module: Module; acces: Acces }> {
  const utilisateur = await exigerUtilisateur(event)
  const module = await trouverModuleParSlug(getRouterParam(event, 'slug') ?? '')
  if (!module) {
    throw createError({ statusCode: 404, statusMessage: 'Module introuvable' })
  }
  const acces = await trouverAcces(utilisateur.id, module.id)
  if (!acces || acces.revoqueLe) {
    throw createError({ statusCode: 403, statusMessage: 'Ce module ne fait pas partie de vos accès' })
  }
  return { utilisateur, module, acces }
}

/**
 * Le quiz s'ouvre une fois toutes les vidéos vues (audit du 20/10). Ouvert dès
 * l'achat, il se passait sans la formation, par élimination.
 */
export const PROGRESSION_QUIZ = 100

/**
 * Tentative à laquelle un ordre d'options se rapporte : le jour, à Abidjan, et
 * son rang dans la journée (1, 2, 3). C'est ce que la page reçoit avec les
 * questions et renvoie avec ses réponses.
 */
export interface OrdreQuiz {
  jour: string
  numero: number
}

/**
 * Date du jour à Abidjan, au format AAAA-MM-JJ. Abidjan est à UTC+0 toute
 * l'année : c'est la date UTC, la même que `jour_abidjan()` en base.
 */
export function jourAbidjan(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Ordre de la tentative en cours, d'après le compteur du jour. */
export function ordreCourant(tentativesUtilisees: number): OrdreQuiz {
  return { jour: jourAbidjan(), numero: tentativesUtilisees + 1 }
}

/** `copie` : l'ordre stable dans lequel une copie réussie est relue. */
export type Tirage = OrdreQuiz | 'copie'

const LETTRES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/**
 * Options mélangées et renommées, question par question.
 *
 * Les lettres étaient celles de la livraison, dans un ordre fixe, et la
 * correction dit ✓ ou ✗ par question : trois tentatives par jour suffisaient
 * à réussir sans rien lire, en essayant A, puis B, puis C, et une grille
 * « Q01 : C, Q02 : A… » valait pour tous les apprenants. Chaque tentative
 * reçoit désormais son propre ordre, et la page appelle « A » la première
 * option affichée, quelle qu'elle soit.
 *
 * L'ordre n'est stocké nulle part : il se recalcule à la soumission, par HMAC
 * de l'apprenant, du module, de la tentative et de la question. Il ne dit rien
 * de la bonne réponse, que ce code ne lit d'ailleurs jamais.
 */
export function melangerQuestions(
  questions: QuestionQuiz[],
  utilisateurId: string,
  moduleId: string,
  tirage: Tirage,
): QuestionQuiz[] {
  return questions.map((q) => ({
    ...q,
    options: permutation(q, utilisateurId, moduleId, tirage).map((option, i) => ({
      id: LETTRES[i]!,
      texte: option.texte,
    })),
  }))
}

/**
 * Lettres affichées → lettres de la livraison, pour `soumettre_quiz`. Une
 * lettre qui ne désigne aucune option est rendue telle quelle : la base la
 * refuse comme une réponse manquante, sans consommer de tentative.
 */
export function versLettresOrigine(
  reponses: Record<string, string>,
  questions: QuestionQuiz[],
  utilisateurId: string,
  moduleId: string,
  tirage: Tirage,
): Record<string, string> {
  const origine: Record<string, string> = {}
  for (const q of questions) {
    const affichee = reponses[q.code]
    if (affichee === undefined) continue
    const option = permutation(q, utilisateurId, moduleId, tirage)[LETTRES.indexOf(affichee)]
    origine[q.code] = option?.id ?? affichee
  }
  return origine
}

/** L'inverse, pour relire une copie dans l'ordre où elle est affichée. */
export function versLettresAffichees(
  reponses: Record<string, string>,
  questions: QuestionQuiz[],
  utilisateurId: string,
  moduleId: string,
  tirage: Tirage,
): Record<string, string> {
  const affichees: Record<string, string> = {}
  for (const q of questions) {
    const i = permutation(q, utilisateurId, moduleId, tirage).findIndex((o) => o.id === reponses[q.code])
    if (i !== -1) affichees[q.code] = LETTRES[i]!
  }
  return affichees
}

function permutation(
  question: QuestionQuiz,
  utilisateurId: string,
  moduleId: string,
  tirage: Tirage,
): QuestionQuiz['options'] {
  const libelle = tirage === 'copie' ? 'copie' : `${tirage.jour}#${tirage.numero}`
  const octets = createHmac('sha256', cleDerivee('quiz-ordre-options'))
    .update([utilisateurId, moduleId, libelle, question.code].join('|'))
    .digest()
  // Fisher-Yates, un octet par échange. Quatre options : le biais du modulo
  // (256 n'est pas multiple de 3) est de l'ordre du centième, sans portée ici.
  const options = [...question.options]
  for (let i = options.length - 1; i > 0; i--) {
    const j = octets[(options.length - 1 - i) % octets.length]! % (i + 1)
    ;[options[i], options[j]] = [options[j]!, options[i]!]
  }
  return options
}
