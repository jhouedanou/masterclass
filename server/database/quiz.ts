import type { PostgrestError } from '@supabase/supabase-js'
import type { CorrectionQuiz, EtatQuiz, QuestionQuiz, QuizAdmin, ResultatQuiz } from '#shared/types'
import { supabase } from './client'
import { traduireErreur, verifier, verifierOptionnel } from './erreurs'
import { versCorrectionsQuiz, versEtatQuiz, versQuestionQuiz, versRenvoiQuiz } from './mappers'

/**
 * Quiz des modules (migration 40).
 *
 * La correction et le compteur de tentatives vivent dans `soumettre_quiz` :
 * ce dépôt ne lit jamais `bonne_reponse` pour un apprenant, et la liste des
 * questions ne sélectionne que les colonnes montrables.
 */

/**
 * Base où la migration 40 n'est pas encore passée : fonction ou table
 * inconnues de PostgREST (PGRST202, PGRST205) ou de Postgres (42883, 42P01).
 * Les lectures qui servent la fiche module, l'accueil et le back-office font
 * alors comme si aucun module n'avait de quiz, plutôt que de casser ces pages
 * le temps que la base rattrape le code.
 */
function migrationAbsente(erreur: PostgrestError): boolean {
  return ['PGRST202', 'PGRST205', '42883', '42P01'].includes(erreur.code)
}

/** Questions dans l'ordre, sans bonne réponse ni justification. Vide si le
 *  module n'a pas de quiz. */
export async function listerQuestionsQuiz(moduleId: string): Promise<QuestionQuiz[]> {
  const rows = verifier(
    await supabase()
      .from('quiz_questions')
      .select('code, position, enonce, options')
      .eq('module_id', moduleId)
      .order('position'),
    'questions du quiz',
  )
  return rows.map(versQuestionQuiz)
}

/** État des quiz d'un apprenant, par module. Un module sans quiz n'y figure pas. */
export async function etatsQuiz(utilisateurId: string, moduleId?: string): Promise<Map<string, EtatQuiz>> {
  const { data, error } = await supabase().rpc('etats_quiz', {
    p_utilisateur_id: utilisateurId,
    ...(moduleId ? { p_module_id: moduleId } : {}),
  })
  if (error) {
    if (migrationAbsente(error)) return new Map()
    throw traduireErreur(error, 'état des quiz')
  }
  return new Map((data ?? []).map((row) => [row.module_id, versEtatQuiz(row)]))
}

export async function etatQuiz(utilisateurId: string, moduleId: string): Promise<EtatQuiz | null> {
  return (await etatsQuiz(utilisateurId, moduleId)).get(moduleId) ?? null
}

/**
 * Soumission corrigée en base. Refus traduits par `traduireErreur` : 404 sans
 * quiz, 403 sans accès, 409 quiz déjà réussi ou tentatives du jour épuisées,
 * 422 réponse manquante.
 */
export async function soumettreQuiz(
  utilisateurId: string,
  moduleId: string,
  reponses: Record<string, string>,
): Promise<ResultatQuiz> {
  const { data, error } = await supabase().rpc('soumettre_quiz', {
    p_utilisateur_id: utilisateurId,
    p_module_id: moduleId,
    p_reponses: reponses,
  })
  if (error) throw traduireErreur(error, 'soumission du quiz')
  const etat = await etatQuiz(utilisateurId, moduleId)
  return {
    note: data.note,
    reussi: data.reussi,
    etat: etat ?? {
      questions: data.corrections.length,
      tentativesMax: data.tentatives_max,
      tentativesUtilisees: data.tentatives_utilisees,
      tentativesRestantes: data.reussi ? 0 : Math.max(data.tentatives_max - data.tentatives_utilisees, 0),
      derniereNote: data.note,
      reussi: data.reussi,
    },
    corrections: versCorrectionsQuiz(data.corrections),
  }
}

/**
 * La copie réussie, pour l'écran d'un quiz fermé : toutes les réponses y sont
 * justes, leurs justifications ne révèlent donc rien que l'apprenant n'ait
 * déjà trouvé. `null` tant que le quiz n'est pas réussi.
 */
export async function copieReussie(
  utilisateurId: string,
  moduleId: string,
): Promise<{ reponses: Record<string, string>; note: number; corrections: CorrectionQuiz[] } | null> {
  const tentative = verifierOptionnel(
    await supabase()
      .from('quiz_tentatives')
      .select('reponses, note')
      .eq('utilisateur_id', utilisateurId)
      .eq('module_id', moduleId)
      .eq('reussi', true)
      .order('cree_le', { ascending: false })
      .limit(1)
      .maybeSingle(),
    'copie réussie',
  )
  if (!tentative) return null
  const questions = verifier(
    await supabase()
      .from('quiz_questions')
      .select('code, position, justification')
      .eq('module_id', moduleId)
      .order('position'),
    'justifications du quiz',
  )
  return {
    reponses: tentative.reponses,
    note: tentative.note,
    corrections: questions.map((q) => ({
      code: q.code,
      position: q.position,
      correct: true as const,
      justification: q.justification,
    })),
  }
}

/** Le quiz complet, bonnes réponses comprises : réservé au back-office. */
export async function quizAdmin(moduleId: string): Promise<QuizAdmin | null> {
  const lecture = await supabase().from('quiz').select('*').eq('module_id', moduleId).maybeSingle()
  if (lecture.error && migrationAbsente(lecture.error)) return null
  const quiz = verifierOptionnel(lecture, 'quiz')
  if (!quiz) return null

  const [questions, tentatives] = await Promise.all([
    supabase().from('quiz_questions').select('*').eq('module_id', moduleId).order('position'),
    supabase()
      .from('quiz_tentatives')
      .select('utilisateur_id, note, reussi, cree_le')
      .eq('module_id', moduleId)
      .order('cree_le', { ascending: false }),
  ])
  const lignes = verifier(tentatives, 'tentatives du quiz')

  // Les tentatives arrivent de la plus récente à la plus ancienne : la première
  // rencontrée pour un apprenant porte sa dernière note.
  const dernieres = new Map<string, number>()
  const reussis = new Set<string>()
  for (const t of lignes) {
    if (!dernieres.has(t.utilisateur_id)) dernieres.set(t.utilisateur_id, t.note)
    if (t.reussi) reussis.add(t.utilisateur_id)
  }
  const notes = [...dernieres.values()]

  return {
    code: quiz.code,
    version: quiz.version,
    seuilReussite: quiz.seuil_reussite,
    tentativesParJour: quiz.tentatives_par_jour,
    majLe: quiz.maj_le,
    questions: verifier(questions, 'questions du quiz').map((q) => ({
      ...versQuestionQuiz(q),
      niveau: q.niveau ?? undefined,
      competence: q.competence ?? undefined,
      bonneReponse: q.bonne_reponse,
      justification: q.justification,
      piste: q.piste_si_erreur,
      renvois: q.renvois.map(versRenvoiQuiz),
    })),
    statistiques: {
      apprenants: dernieres.size,
      reussites: reussis.size,
      tentatives: lignes.length,
      noteMoyenne: notes.length ? Math.round(notes.reduce((a, b) => a + b, 0) / notes.length) : undefined,
    },
  }
}
