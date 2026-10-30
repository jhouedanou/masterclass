/**
 * Dates des Live Sessions : stockées en UTC, saisies et affichées en GMT
 * (RM9 — identique pour la Côte d'Ivoire). Le fuseau est fixé ici pour que le
 * serveur, le navigateur et les e-mails écrivent la même heure, quel que soit
 * le fuseau de la machine.
 */

const FUSEAU = 'UTC'

/** « 1h30 », « 1h », « 45 min » : la forme de la maquette (planches 03 et 06). */
export function dureeLive(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

/** « 19h00 » (heure GMT). */
export function heureLive(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getUTCHours()).padStart(2, '0')}h${String(d.getUTCMinutes()).padStart(2, '0')}`
}

function majuscule(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}

/** « Vendredi 6 novembre » (sans l'année, comme la maquette). */
export function dateLongueLive(iso: string, annee = false): string {
  return majuscule(
    new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      ...(annee ? { year: 'numeric' } : {}),
      timeZone: FUSEAU,
    }).format(new Date(iso)),
  )
}

/** Pastille de calendrier : { jourSemaine: 'VEN', jour: '06', mois: 'NOV' }. */
export function pastilleDateLive(iso: string): { jourSemaine: string; jour: string; mois: string } {
  const d = new Date(iso)
  const jourSemaine = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: FUSEAU })
    .format(d)
    .replace('.', '')
    .toUpperCase()
  const mois = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: FUSEAU })
    .format(d)
    .replace('.', '')
    .toUpperCase()
  return { jourSemaine, jour: String(d.getUTCDate()).padStart(2, '0'), mois }
}

/** « Ven 6 nov. » : badges des cartes module et de l'espace apprenant. */
export function dateCourteLive(iso: string): string {
  return majuscule(
    new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: FUSEAU }).format(
      new Date(iso),
    ),
  )
}

/** « Vendredi 6 novembre · 19h00 GMT · 1h30 » : la ligne des e-mails et de la fiche. */
export function ligneHoraireLive(iso: string, dureeMinutes: number): string {
  return `${dateLongueLive(iso)} · ${heureLive(iso)} GMT · ${dureeLive(dureeMinutes)}`
}

/** Saisie du back-office (date + heure GMT) → instant ISO UTC. */
export function debutDepuisSaisie(date: string, heure: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(heure)) return null
  const d = new Date(`${date}T${heure}:00Z`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** Instant ISO → saisie du back-office { date, heure } en GMT. */
export function saisieDepuisDebut(iso: string): { date: string; heure: string } {
  const d = new Date(iso)
  return { date: d.toISOString().slice(0, 10), heure: d.toISOString().slice(11, 16) }
}

/** Délais des envois et de l'ouverture des salles (CDC §4.3, §4.4, §7). */
export const DELAIS_LIVE = {
  /** Lien visible dans l'espace apprenant, rappel J-1. */
  lienApprenantMinutes: 24 * 60,
  /** Bouton « Animer sur Zoom » actif pour le formateur. */
  animerMinutes: 30,
  /** Salle intégrée ouverte aux inscrits avant le début. */
  salleApprenantMinutes: 15,
  /** Rappel H-10. */
  rappelMinutes: 10,
  /** Fin automatique après le début + durée + 60 min. */
  finAutomatiqueMinutes: 60,
  /** Réservation pendant le paiement. */
  reservationMinutes: 15,
  /** Publication de la vidéo montée au plus tard 21 jours après (RM11). */
  publicationVideoJours: 21,
} as const
