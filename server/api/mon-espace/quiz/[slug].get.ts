import { trouverFormateur } from '../../../database/catalogue'
import { copieReussie, etatQuiz, listerQuestionsQuiz } from '../../../database/quiz'
import {
  PROGRESSION_QUIZ,
  exigerModuleAcquis,
  melangerQuestions,
  ordreCourant,
  versLettresAffichees,
} from '../../../utils/quiz'

/**
 * Quiz d'un module acquis : les questions et leurs options, jamais la bonne
 * réponse ni la justification — la correction n'arrive qu'avec la soumission.
 *
 * Les options arrivent mélangées et renommées pour la tentative en cours
 * (`ordre`), que la page renvoie avec ses réponses. Le quiz reste fermé, sans
 * questions, tant que les vidéos ne sont pas toutes vues.
 *
 * Un quiz déjà réussi est fermé : on renvoie la copie réussie, dans un ordre
 * propre à l'apprenant. Ses lettres ne valent donc pour personne d'autre :
 * la copie n'est plus une grille de réponses à faire circuler.
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

  const entete = {
    module: { id: module.id, slug: module.slug, titre: module.titre, formateur: formateur?.nom ?? null },
    progression: acces.progression,
    etat,
  }

  if (etat.reussi) {
    const copie = await copieReussie(utilisateur.id, module.id)
    return {
      ...entete,
      ouvert: true,
      questions: melangerQuestions(questions, utilisateur.id, module.id, 'copie'),
      ordre: null,
      copie: copie && {
        ...copie,
        reponses: versLettresAffichees(copie.reponses, questions, utilisateur.id, module.id, 'copie'),
      },
    }
  }

  if (acces.progression < PROGRESSION_QUIZ) {
    return { ...entete, ouvert: false, questions: [], ordre: null, copie: null }
  }

  const ordre = ordreCourant(etat.tentativesUtilisees)
  return {
    ...entete,
    ouvert: true,
    questions: melangerQuestions(questions, utilisateur.id, module.id, ordre),
    ordre,
    copie: null,
  }
})
