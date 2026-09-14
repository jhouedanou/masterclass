import type { SessionCoaching, Thematique } from '#shared/types'
import { listerFormateurs, listerModules, listerThematiques, trouverFormateur } from '../database/catalogue'
import { listerAcces } from '../database/comptes'
import {
  listerDemandesCoachingPrive,
  listerDemandesCoachingPriveFormateur,
  listerNotesFormateur,
  listerSessions,
  listerSujetsSessions,
} from '../database/coaching'
import { listerCertificats, listerTransactions } from '../database/commerce'
import { lireReglagesFinanciers } from '../database/administration'

/**
 * Statistiques des formateurs, calculées sur les données réelles.
 *
 * Il n'y a plus aucun compteur simulé ici : les inscriptions viennent de la
 * table `acces`, le chiffre d'affaires des transactions réussies, la complétion
 * de la progression enregistrée. Les indicateurs sans source en base — la
 * présence en séance tant que `sessions_coaching.presents` n'est pas relevé,
 * la note par session, qui n'est rattachée à aucune séance — valent `null`
 * plutôt qu'une valeur inventée.
 */

/** Fenêtre du compteur « nouveaux », telle qu'affichée dans l'en-tête du
 *  tableau des modules (« Nouveaux (30 j) »). */
const FENETRE_NOUVEAUX_JOURS = 30

function ilYaJours(jours: number): string {
  return new Date(Date.now() - jours * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/**
 * Filtres « 🗓 Période » et « Module » des écrans 03 et 06, et « Septembre 2026 ▾
 * / Tous mes modules ▾ » de l'écran 01. Bornes au format « AAAA-MM-JJ »,
 * incluses ; absentes, la fenêtre reste celle par défaut de chaque indicateur.
 */
export interface FiltreFormateur {
  du?: string
  au?: string
  moduleId?: string
}

/** Bornes du mois « AAAA-MM », pour le sélecteur de l'écran 01. */
export function bornesDuMois(mois: string): { du: string; au: string } {
  const [annee, m] = mois.split('-').map(Number)
  const debut = new Date(Date.UTC(annee!, (m ?? 1) - 1, 1))
  const fin = new Date(Date.UTC(annee!, m ?? 1, 0))
  return { du: debut.toISOString().slice(0, 10), au: fin.toISOString().slice(0, 10) }
}

/** Le mois en cours, « AAAA-MM ». */
export function moisCourant(): string {
  return new Date().toISOString().slice(0, 7)
}

function dansPeriode(date: string, filtre: FiltreFormateur): boolean {
  if (filtre.du && date < filtre.du) return false
  if (filtre.au && date > filtre.au) return false
  return true
}

/**
 * Lecture des filtres d'une requête, commune aux écrans 01, 03 et 06 : un
 * nombre de jours glissants (`jours=30`), un mois (`mois=2026-09`) ou deux
 * bornes (`du` / `au`), plus le module.
 */
export function filtreDepuisRequete(requete: Record<string, unknown>): FiltreFormateur {
  const texte = (cle: string) => (typeof requete[cle] === 'string' ? (requete[cle] as string) : '')

  const moduleId = texte('module') || undefined
  const mois = texte('mois')
  if (/^\d{4}-\d{2}$/.test(mois)) return { ...bornesDuMois(mois), moduleId }

  const du = texte('du')
  const au = texte('au')
  if (du || au) return { du: du || undefined, au: au || undefined, moduleId }

  const jours = Number(texte('jours'))
  if (Number.isFinite(jours) && jours > 0) {
    return { du: ilYaJours(jours), moduleId }
  }
  return { moduleId }
}

export interface StatistiqueModule {
  id: string
  slug: string
  titre: string
  programme: string
  statut: string
  thematique: string
  inscrits: number
  nouveaux: number
  completion: number
  certificats: number
}

export async function statistiquesModules(
  formateurId: string,
  filtre: FiltreFormateur = {},
): Promise<StatistiqueModule[]> {
  const [modules, thematiques, acces, certificats] = await Promise.all([
    listerModules(),
    listerThematiques(),
    listerAcces(),
    listerCertificats(),
  ])

  // « Nouveaux » suit la période choisie ; sans période, les trente derniers
  // jours, comme l'annonce l'en-tête de colonne.
  const du = filtre.du ?? ilYaJours(FENETRE_NOUVEAUX_JOURS)
  const au = filtre.au

  return modules
    .filter((m) => m.formateurId === formateurId)
    .filter((m) => !filtre.moduleId || m.id === filtre.moduleId)
    .map((m) => {
      // Un accès révoqué ne compte plus parmi les inscrits.
      const siens = acces.filter((a) => a.moduleId === m.id && !a.revoqueLe)
      const cumul = siens.reduce((somme, a) => somme + a.progression, 0)
      return {
        id: m.id,
        slug: m.slug,
        titre: m.titre,
        programme: m.programme,
        statut: m.statut,
        thematique: thematiques.find((t) => t.id === m.thematiqueId)?.nom ?? '',
        inscrits: siens.length,
        nouveaux: siens.filter((a) => a.acheteLe >= du && (!au || a.acheteLe <= au)).length,
        completion: siens.length ? Math.round(cumul / siens.length) : 0,
        certificats: certificats.filter((c) => c.moduleId === m.id).length,
      }
    })
}

/**
 * Rémunération du formateur.
 *
 * Le chiffre d'affaires provient des transactions réussies — un accès offert
 * par l'administration n'en génère pas. Le coaching privé est porté par le
 * formateur ; le collectif est compris dans le prix du module.
 */
export async function revenusFormateur(formateurId: string, filtre: FiltreFormateur = {}) {
  const [modules, transactions, demandes, reglages, formateur] = await Promise.all([
    listerModules(),
    listerTransactions(),
    listerDemandesCoachingPrive(),
    lireReglagesFinanciers(),
    trouverFormateur(formateurId),
  ])

  const tauxFrais = reglages.fraisPaiementPourcent / 100
  const partFormateur = reglages.partFormateurPourcent / 100
  const partPlateforme = reglages.partBigFivePourcent / 100

  const siens = modules
    .filter((m) => m.formateurId === formateurId)
    .filter((m) => !filtre.moduleId || m.id === filtre.moduleId)
  const reussies = transactions.filter(
    (t) => t.statut === 'reussie' && dansPeriode(t.date.slice(0, 10), filtre),
  )

  const lignes = siens
    .map((m) => {
      const ventes = reussies.filter((t) => t.moduleId === m.id)
      const ca = ventes.reduce((somme, t) => somme + t.montant, 0)
      const marge = Math.round(ca * (1 - tauxFrais))
      return {
        libelle: m.titre,
        ventes: ventes.length,
        ca,
        marge,
        part: Math.round(marge * partFormateur),
      }
    })
    .filter((ligne) => ligne.ventes > 0)

  // Séances payées ou déjà réalisées sur les modules du formateur, dans la
  // période retenue — la date du créneau à défaut de celle de la demande.
  const idsModules = new Set(siens.map((m) => m.id))
  const seances = demandes.filter(
    (d) =>
      idsModules.has(d.moduleId) &&
      (d.statut === 'payee' || d.statut === 'realisee') &&
      dansPeriode((d.creneauRetenuLe ?? d.recueLe).slice(0, 10), filtre),
  )
  const heures = seances.reduce((somme, d) => somme + d.heures, 0)

  if (heures > 0) {
    const tarif = formateur?.coachingPriveFcfaHeure ?? 50_000
    const caCoaching = heures * tarif
    const margeCoaching = Math.round(caCoaching * (1 - tauxFrais))
    lignes.push({
      libelle: `Coaching privé — ${heures} h à ${new Intl.NumberFormat('fr-FR').format(tarif)} F`,
      ventes: seances.length,
      ca: caCoaching,
      marge: margeCoaching,
      part: Math.round(margeCoaching * partFormateur),
    })
  }

  const ca = lignes.reduce((somme, l) => somme + l.ca, 0)
  const frais = Math.round(ca * tauxFrais)
  const marge = ca - frais

  return {
    lignes,
    total: {
      ca,
      frais,
      marge,
      remuneration: Math.round(marge * partFormateur),
      margePlateforme: Math.round(marge * partPlateforme),
    },
  }
}

export interface SessionFormateur extends SessionCoaching {
  thematique: Thematique | null
  /** Taux de présence, `null` tant que le relevé n'a pas été saisi. */
  participation: number | null
  /** Aucune note n'est rattachée à une séance : le champ reste vide et la vue
   *  affiche le nombre de sujets soumis à la place. */
  note: number | null
}

export async function sessionsFormateur(
  formateurId: string,
  filtre: FiltreFormateur = {},
): Promise<SessionFormateur[]> {
  const [sessions, thematiques] = await Promise.all([listerSessions(), listerThematiques()])

  return sessions
    .filter((s) => s.formateurId === formateurId)
    .filter((s) => dansPeriode(s.date, filtre))
    .map((s) => ({
      ...s,
      thematique: thematiques.find((t) => t.id === s.thematiqueId) ?? null,
      participation:
        s.presents !== null && s.inscrits > 0 ? Math.round((s.presents / s.inscrits) * 100) : null,
      note: null,
    }))
}

export async function ficheFormateur(formateurId: string) {
  return await trouverFormateur(formateurId)
}

/**
 * Moyenne des présences relevées sur les `combien` dernières séances —
 * « moyenne des 6 dernières » sous la carte « Présence en session » (planche D,
 * écran 01). Les séances sans relevé ne comptent pas.
 */
export function presenceMoyenne(sessions: SessionFormateur[], combien = 6): number | null {
  const releves = [...sessions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => s.participation)
    .filter((valeur): valeur is number => valeur !== null)
    .slice(-combien)
  if (!releves.length) return null
  return Math.round(releves.reduce((somme, v) => somme + v, 0) / releves.length)
}

/** Fenêtre de « Nouvelles notes reçues » dans le bloc « À traiter ». */
const FENETRE_NOUVELLES_NOTES_JOURS = 30

export interface ATraiter {
  /** Séances privées payées qu'il reste à animer — la pastille de la nav. */
  coachingPrive: number
  sujetsALire: number
  nouvellesNotes: number
  /** Session dont les sujets sont à lire, pour « avant le 10/09 ». */
  prochaineSessionDate: string | null
}

/**
 * Bloc « À traiter » (planche D, écran 01) et pastille « Coaching privé 2 » de
 * la navigation : trois compteurs qui appellent un geste du formateur.
 */
export async function aTraiterFormateur(formateurId: string): Promise<ATraiter> {
  const [sessions, notes, demandes] = await Promise.all([
    sessionsFormateur(formateurId),
    listerNotesFormateur(formateurId),
    listerDemandesCoachingPriveFormateur(formateurId),
  ])

  const aujourdhui = new Date().toISOString().slice(0, 10)
  const prochaine =
    sessions
      .filter((s) => s.statut === 'planifiee' && s.date >= aujourdhui)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
  const sujets = prochaine ? await listerSujetsSessions([prochaine.id]) : []

  const depuisUnMois = new Date(Date.now() - FENETRE_NOUVELLES_NOTES_JOURS * 86_400_000)
    .toISOString()
    .slice(0, 10)

  return {
    coachingPrive: demandes.filter((d) => d.statut === 'payee').length,
    sujetsALire: sujets.filter((s) => !s.luLe).length,
    nouvellesNotes: notes.filter((n) => n.date >= depuisUnMois).length,
    prochaineSessionDate: prochaine?.date ?? null,
  }
}

/** Statistiques par formateur pour les écrans d'administration. */
export async function statistiquesFormateurs() {
  const [formateurs, modules, acces, sessions, demandes] = await Promise.all([
    listerFormateurs(),
    listerModules(),
    listerAcces(),
    listerSessions(),
    listerDemandesCoachingPrive(),
  ])

  return formateurs.map((f) => {
    const siens = modules.filter((m) => m.formateurId === f.id)
    const idsModules = new Set(siens.map((m) => m.id))
    const accesSiens = acces.filter((a) => idsModules.has(a.moduleId))
    const cumul = accesSiens.reduce((somme, a) => somme + a.progression, 0)

    const sesSessions = sessions.filter((s) => s.formateurId === f.id)
    const releves = sesSessions.filter((s) => s.presents !== null && s.inscrits > 0)

    return {
      id: f.id,
      nom: f.nom,
      nbModules: siens.filter((m) => m.statut === 'disponible').length,
      inscrits: accesSiens.length,
      completion: accesSiens.length ? Math.round(cumul / accesSiens.length) : 0,
      presence: releves.length
        ? Math.round(
            releves.reduce((somme, s) => somme + (s.presents! / s.inscrits) * 100, 0) /
              releves.length,
          )
        : null,
      coachingPrive: demandes.filter((d) => idsModules.has(d.moduleId)).length,
    }
  })
}
