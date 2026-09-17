import { listerModules } from '../../database/catalogue'
import { listerNotesFormateur, listerSujetsSessions } from '../../database/coaching'
import {
  aTraiterFormateur,
  bornesDuMois,
  moisCourant,
  presenceMoyenne,
  revenusFormateur,
  sessionsFormateur,
  statistiquesModules,
} from '../../utils/formateur'
import { exigerFormateur } from '../../utils/session'

/**
 * Vue d'ensemble du formateur (planche D, écran 01).
 *
 * Deux filtres d'en-tête : le mois (« Septembre 2026 ▾ ») et le module
 * (« Tous mes modules ▾ »). Le mois cadre les compteurs de flux — nouveaux
 * inscrits, rémunération — pas les états cumulés comme le nombre d'inscrits.
 *
 * Le bloc « À traiter » compte trois choses qui appellent un geste : les
 * séances privées payées qu'il reste à animer, les sujets encore non lus
 * avant la prochaine session, et les notes reçues depuis un mois.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerFormateur(event)
  const formateurId = utilisateur.formateurId!

  const requete = getQuery(event)
  const mois =
    typeof requete.mois === 'string' && /^\d{4}-\d{2}$/.test(requete.mois)
      ? requete.mois
      : moisCourant()
  const moduleId = typeof requete.module === 'string' && requete.module ? requete.module : undefined
  const { du, au } = bornesDuMois(mois)
  const filtre = { du, au, moduleId }

  // Les notes d'abord : `sessionsFormateur` et `aTraiterFormateur` les lisaient
  // chacun de leur côté, et le gabarit de l'espace rejouait `aTraiterFormateur`
  // en parallèle. Un seul chargement, partagé.
  const notes = await listerNotesFormateur(formateurId)
  const [mesModules, tousMesModules, toutesSessions, revenus, catalogue] = await Promise.all([
    statistiquesModules(formateurId, filtre),
    statistiquesModules(formateurId),
    sessionsFormateur(formateurId, {}, notes),
    revenusFormateur(formateurId, filtre),
    listerModules(),
  ])

  const publies = mesModules.filter((m) => m.statut === 'disponible')

  // La prochaine séance ne dépend pas du mois affiché : c'est toujours la
  // prochaine à animer.
  const aujourdhui = new Date().toISOString().slice(0, 10)
  const prochaine =
    toutesSessions
      .filter((s) => s.statut === 'planifiee' && s.date >= aujourdhui)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null

  const sujets = prochaine ? await listerSujetsSessions([prochaine.id]) : []

  // « À traiter » repart des mêmes séances, des mêmes notes et des mêmes sujets
  // que ci-dessus : il ne refait aucune lecture.
  const aTraiter = await aTraiterFormateur(formateurId, {
    sessions: toutesSessions,
    notes,
    sujetsProchaineSession: sujets,
  })

  // « modules 04, 05, 06 » : les modules publiés de la thématique couverte.
  const modulesCouverts = prochaine
    ? catalogue
        .filter((m) => m.thematiqueId === prochaine.thematiqueId && m.statut === 'disponible')
        .map((m) => m.numero)
        .sort((a, b) => a - b)
    : []

  return {
    mois,
    moduleId: moduleId ?? '',
    // Liste du sélecteur « Tous mes modules ▾ », jamais restreinte par le filtre.
    mesModules: tousMesModules.map((m) => ({ id: m.id, titre: m.titre })),

    inscrits: publies.reduce((somme, m) => somme + m.inscrits, 0),
    nouveaux: publies.reduce((somme, m) => somme + m.nouveaux, 0),
    completionMoyenne: publies.length
      ? Math.round(publies.reduce((somme, m) => somme + m.completion, 0) / publies.length)
      : 0,
    nbModules: publies.length,
    // `null` tant qu'aucune présence n'a été relevée en séance.
    presenceMoyenne: presenceMoyenne(toutesSessions),
    noteMoyenne: notes.length
      ? Math.round((notes.reduce((somme, n) => somme + n.note, 0) / notes.length) * 10) / 10
      : null,
    nbNotes: notes.length,
    remunerationDuMois: revenus.total.remuneration,

    prochaineSession: prochaine ? { ...prochaine, modulesCouverts, nbSujets: sujets.length } : null,
    // Sujets réellement soumis par les apprenants avant la prochaine session.
    sujets: sujets.map((s) => ({
      utilisateurId: s.utilisateurId,
      apprenant: s.apprenant,
      sujet: s.preoccupation,
      lu: Boolean(s.luLe),
    })),

    aTraiter,

    dernieresNotes: notes
      .slice(-3)
      .reverse()
      .map((n) => ({
        note: n.note,
        commentaire: n.commentaire ?? '',
        // « session » ou « privé » ; la page y accole la date au format 12/08.
        origine: n.origine === 'collective' ? 'session' : 'privé',
        date: n.date,
      })),
  }
})
