import type { EtatLiveApprenant } from '#shared/types'
import { listerFormateurs, listerModules, listerThematiques } from '../database/catalogue'
import { listerInscriptionsLiveUtilisateur, listerSessionsLive } from '../database/live'
import { etatsQuiz } from '../database/quiz'
import { etatApprenant, liveVisiblePour, visibiliteLive } from './live'
import type { Utilisateur } from '#shared/types'

/** Une session annulée reste affichée un mois, avec le message de contact. */
const AFFICHAGE_ANNULEE_JOURS = 30

/**
 * Cartes Live Session de l'espace apprenant (planche 05, CDC §4.3), en tête
 * de « Mes formations ». L'état est dérivé ici, jamais stocké. Une fois la
 * vidéo publiée, la carte disparaît : le module rejoint les cartes classiques.
 * La salle n'est jamais un lien Zoom (option B) : la carte mène à la salle
 * intégrée, dont l'adresse n'est utile qu'aux inscrits connectés.
 */
export async function cartesLiveApprenant(utilisateur: Utilisateur, maintenant = Date.now()) {
  if (!liveVisiblePour(await visibiliteLive(), utilisateur)) return []
  const inscriptions = (await listerInscriptionsLiveUtilisateur(utilisateur.id)).filter((i) => i.statut === 'confirmee')
  if (!inscriptions.length) return []

  const [sessions, modules, formateurs, thematiques, quiz] = await Promise.all([
    listerSessionsLive(),
    listerModules(),
    listerFormateurs(),
    listerThematiques(),
    etatsQuiz(utilisateur.id),
  ])

  return inscriptions.flatMap((inscription) => {
    const session = sessions.find((s) => s.id === inscription.sessionLiveId)
    const module = session && modules.find((m) => m.id === session.moduleId)
    if (!session || !module) return []
    const etat: EtatLiveApprenant = etatApprenant(session, module, maintenant)
    if (etat === 'module-disponible') return []
    if (
      etat === 'annulee' &&
      session.annuleLe &&
      maintenant - new Date(session.annuleLe).getTime() > AFFICHAGE_ANNULEE_JOURS * 86_400_000
    ) {
      return []
    }
    return [{
      inscriptionId: inscription.id,
      sessionId: session.id,
      slug: session.slug,
      etat,
      debut: session.debut,
      dureeMinutes: session.dureeMinutes,
      module: {
        slug: module.slug,
        titre: module.titre,
        programme: module.programme,
        thematique: thematiques.find((t) => t.id === module.thematiqueId)?.nom ?? '',
      },
      formateur: formateurs.find((f) => f.id === session.formateurId)?.nom ?? '',
      /** Support déposé : bouton « Télécharger le support » après la session (RM5). */
      support: etat === 'terminee' && Boolean(session.supportNom),
      /** Quiz du module, `null` s'il n'en a pas. */
      quiz: quiz.get(module.id) ?? null,
    }]
  }).sort((a, b) => a.debut.localeCompare(b.debut))
}
