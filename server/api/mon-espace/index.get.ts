import { listerFormateurs, listerModules, listerThematiques } from '../../database/catalogue'
import { listerDemandesCoachingPriveUtilisateur, listerInscriptionsUtilisateur, listerSessions } from '../../database/coaching'
import { listerCertificatsUtilisateur, listerCommandesUtilisateur } from '../../database/commerce'
import { completionProfil, listerAccesUtilisateur, listerVisionnagesUtilisateur } from '../../database/comptes'
import { etatsQuiz } from '../../database/quiz'
import { listerSessionsLive } from '../../database/live'
import { dateCourteLive } from '#shared/utils/live'
import { cartesLiveApprenant } from '../../utils/liveApprenant'
import { exigerUtilisateur } from '../../utils/session'

/** Nombre de jours entre aujourd'hui et une date « AAAA-MM-JJ » (J-8). */
function joursAvant(date: string): number {
  const cible = new Date(`${date}T00:00:00Z`)
  const aujourdHui = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z')
  return Math.round((cible.getTime() - aujourdHui.getTime()) / 86_400_000)
}

/**
 * Accueil du tableau de bord (planche B, écran 01) : complétion du profil,
 * cartes des modules avec chapitres vus, quiz, prochaine session et formateur,
 * dernière demande de coaching privé, historique d'achats et planning.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)

  const [acces, modules, formateurs, thematiques, sessions, inscriptions, demandes, commandes, certificats, visionnages, completion, quiz, liveSessions, sessionsLive] =
    await Promise.all([
      listerAccesUtilisateur(utilisateur.id),
      listerModules(),
      listerFormateurs(),
      listerThematiques(),
      listerSessions(),
      listerInscriptionsUtilisateur(utilisateur.id),
      listerDemandesCoachingPriveUtilisateur(utilisateur.id),
      listerCommandesUtilisateur(utilisateur.id),
      listerCertificatsUtilisateur(utilisateur.id),
      listerVisionnagesUtilisateur(utilisateur.id),
      completionProfil(utilisateur),
      etatsQuiz(utilisateur.id),
      cartesLiveApprenant(utilisateur),
      listerSessionsLive(),
    ])

  const aujourdHui = new Date().toISOString().slice(0, 10)
  const aVenir = sessions.filter((s) => s.statut !== 'annulee' && s.date >= aujourdHui)
  const inscrit = new Set(inscriptions.map((i) => i.sessionId))

  const cartes = acces
    .filter((a) => !a.revoqueLe)
    .map((a) => {
      const module = modules.find((m) => m.id === a.moduleId)
      // Un module encore en Live Session a sa propre carte (`liveSessions`) :
      // la vidéo n'existe pas encore (RM6).
      if (!module || module.statut === 'live-session') return null
      const vus = visionnages.get(module.id) ?? []
      const chapitresVus = a.progression === 100 ? module.chapitres.length : vus.filter((v) => v.vu).length
      const prochaine = aVenir.find((s) => s.thematiqueId === module.thematiqueId) ?? null
      const formateur = formateurs.find((f) => f.id === module.formateurId) ?? null
      return {
        moduleId: module.id,
        slug: module.slug,
        titre: module.titre,
        programme: module.programme,
        thematique: thematiques.find((t) => t.id === module.thematiqueId)?.nom ?? '',
        formateur: formateur?.nom ?? '',
        progression: a.progression,
        chapitresVus,
        chapitresTotal: module.chapitres.length,
        termineLe: a.termineLe,
        certificat: certificats.find((c) => c.moduleId === module.id)?.numero ?? null,
        /** État du quiz du module, `null` s'il n'en a pas. */
        quiz: quiz.get(module.id) ?? null,
        prochaineSession: prochaine
          ? {
              id: prochaine.id,
              date: prochaine.date,
              heure: prochaine.heure,
              inscrit: inscrit.has(prochaine.id),
              places: prochaine.places,
              inscrits: prochaine.inscrits,
              joursAvant: joursAvant(prochaine.date),
            }
          : null,
      }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => (a.progression === 100 ? 1 : 0) - (b.progression === 100 ? 1 : 0))

  const possedees = new Set(cartes.map((c) => c.moduleId))
  const planning = aVenir
    .filter((s) => modules.some((m) => m.thematiqueId === s.thematiqueId && possedees.has(m.id)))
    .slice(0, 4)
    .map((s) => ({
      id: s.id,
      date: s.date,
      heure: s.heure,
      dureeMinutes: s.dureeMinutes,
      places: s.places,
      inscrits: s.inscrits,
      thematique: thematiques.find((t) => t.id === s.thematiqueId)?.nom ?? '',
      formateur: formateurs.find((f) => f.id === s.formateurId)?.nom ?? '',
      joursAvant: joursAvant(s.date),
      inscrit: inscrit.has(s.id),
    }))

  const derniereDemande = demandes[0]
  // « Live Session · titre · date de session » (CDC 10.C) ; sans module ni
  // session, la commande réglait une séance de coaching privé.
  const libelleAchat = (c: (typeof commandes)[number]): string => {
    if (c.sessionLiveId) {
      const live = sessionsLive.find((s) => s.id === c.sessionLiveId)
      const module = live && modules.find((m) => m.id === live.moduleId)
      return live && module ? `${module.titre} · ${dateCourteLive(live.debut)}` : 'Live Session'
    }
    if (c.demandeCoachingId) return 'Coaching privé'
    return c.moduleIds.map((id) => modules.find((m) => m.id === id)?.titre ?? id).join(' + ')
  }
  return {
    completionProfil: completion,
    /** Cartes Live Session, en tête de « Mes formations » (CDC §4.3). */
    liveSessions,
    cartes,
    coachingPrive: derniereDemande
      ? {
          id: derniereDemande.id,
          date: derniereDemande.recueLe,
          formateur: formateurs.find((f) => f.id === derniereDemande.formateurId)?.nom ?? '',
          statut: derniereDemande.statut,
        }
      : null,
    achats: commandes
      .filter((c) => c.statut === 'confirmee')
      .slice(0, 5)
      .map((c) => ({
        reference: c.reference,
        date: c.creeeLe,
        total: c.total,
        libelle: libelleAchat(c),
        type: c.sessionLiveId ? ('live' as const) : c.demandeCoachingId ? ('coaching' as const) : ('module' as const),
      })),
    planning,
  }
})
