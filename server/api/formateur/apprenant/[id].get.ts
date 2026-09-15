import { libellesReferentiel } from '#shared/utils/referentiels'
import { listerModules } from '../../../database/catalogue'
import {
  listerDemandesCoachingPriveFormateur,
  listerInscriptionsUtilisateur,
  listerSessions,
  listerSujetsSessions,
} from '../../../database/coaching'
import {
  listerAccesUtilisateur,
  listerVisionnagesUtilisateur,
  trouverPersona,
  trouverUtilisateur,
} from '../../../database/comptes'
import { listerReferentiels } from '../../../database/referentiels'
import { exigerFormateur } from '../../../utils/session'

/**
 * Fiche apprenant en lecture seule (planche D, écran 04).
 *
 * Périmètre strict : le formateur ne voit que les apprenants inscrits à l'une
 * de ses sessions, détenteurs de l'un de ses modules, ou demandeurs d'un
 * coaching privé auprès de lui. Hors de ce périmètre, 403.
 *
 * Coordonnées masquées : ni e-mail, ni WhatsApp — « la relation passe par la
 * plateforme ». Seuls le prénom, l'initiale du nom, la ville et le persona
 * servent à préparer la séance.
 */
export default defineEventHandler(async (event) => {
  const formateurUtilisateur = await exigerFormateur(event)
  const formateurId = formateurUtilisateur.formateurId!
  const id = getRouterParam(event, 'id') ?? ''

  const apprenant = await trouverUtilisateur(id)
  if (!apprenant) throw createError({ statusCode: 404, statusMessage: 'Apprenant introuvable' })

  const [modules, sessions, acces, inscriptions, demandes] = await Promise.all([
    listerModules(),
    listerSessions(),
    listerAccesUtilisateur(apprenant.id),
    listerInscriptionsUtilisateur(apprenant.id),
    listerDemandesCoachingPriveFormateur(formateurId),
  ])

  const sesModules = modules.filter((m) => m.formateurId === formateurId)
  const idsModules = new Set(sesModules.map((m) => m.id))
  const sesSessions = sessions.filter((s) => s.formateurId === formateurId)
  const idsSessions = new Set(sesSessions.map((s) => s.id))

  // Les accès révoqués ne donnent plus de visibilité au formateur.
  const accesActifs = acces.filter((a) => idsModules.has(a.moduleId) && !a.revoqueLe)
  const inscriptionsCommunes = inscriptions.filter((i) => idsSessions.has(i.sessionId))
  const demandesCommunes = demandes.filter((d) => d.utilisateurId === apprenant.id)

  if (!accesActifs.length && !inscriptionsCommunes.length && !demandesCommunes.length) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Cet apprenant n’est inscrit à aucun de vos modules, sessions ou coachings',
    })
  }

  const [persona, visionnages, referentiels] = await Promise.all([
    trouverPersona(apprenant.id),
    listerVisionnagesUtilisateur(apprenant.id),
    listerReferentiels(),
  ])

  // « Progression — Accroches & IA : 2 / 3 chapitres », module par module.
  const progressions = accesActifs.map((a) => {
    const module = sesModules.find((m) => m.id === a.moduleId)!
    const chapitres = visionnages.get(a.moduleId) ?? []
    return {
      moduleId: module.id,
      titre: module.titre,
      chapitresVus: chapitres.filter((c) => c.vu).length,
      chapitres: chapitres.length,
      pourcentage: a.progression,
    }
  })

  // « Sujet soumis pour le 10/09 — Oui, à lire » : le sujet de la prochaine
  // séance encore à venir, avec son état de lecture.
  const aVenir = sesSessions
    .filter((s) => s.statut === 'planifiee' && idsSessions.has(s.id))
    .sort((a, b) => a.date.localeCompare(b.date))
  const sujets = await listerSujetsSessions(aVenir.map((s) => s.id))
  const sien = sujets.find((s) => s.utilisateurId === apprenant.id) ?? null
  const sessionDuSujet = sien ? (aVenir.find((s) => s.id === sien.sessionId) ?? null) : null

  return {
    // `nom[0]` seul : la fiche reste anonymisée comme la maquette l'affiche.
    prenom: apprenant.prenom,
    initiales: `${apprenant.prenom[0] ?? ''}${apprenant.nom[0] ?? ''}`.toUpperCase(),
    nomAffiche: `${apprenant.prenom} ${apprenant.nom}`,
    ville: persona?.ville ?? '',
    pays: apprenant.pays ?? '',
    nbModules: accesActifs.length,
    persona: persona
      ? {
          secteur: persona.secteur ?? '',
          experience: persona.experience ?? persona.niveau ?? '',
          // Clés du référentiel en base : le formateur doit lire des libellés.
          reseaux: libellesReferentiel(persona.reseaux ?? persona.canaux, referentiels),
          objectif: persona.objectif ?? persona.defi ?? '',
          entreprise: persona.entreprise ?? '',
          audience: persona.audience ?? '',
        }
      : null,
    progressions,
    sujet: sien
      ? {
          session: sessionDuSujet?.date ?? '',
          preoccupation: sien.preoccupation,
          attente: sien.attente,
          lu: Boolean(sien.luLe),
        }
      : null,
    // « Coaching privé — 1 demande en cours ».
    coachingPriveEnCours: demandesCommunes.filter(
      (d) => d.statut !== 'realisee' && d.statut !== 'refusee' && d.statut !== 'annulee' && d.statut !== 'expiree',
    ).length,
    coachingPriveRealise: demandesCommunes.filter((d) => d.statut === 'realisee').length,
  }
})
