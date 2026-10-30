import type { EtapeDeroule, Formateur, Module, SessionLive, Utilisateur } from '#shared/types'
import { debutDepuisSaisie } from '#shared/utils/live'
import { liensZoomLive, majSupportLive, supportLive, trouverSessionLive } from '../database/live'
import { envoyerFinLive } from './emailsLive'
import { echeanceVideo, effacerSupport, preparerDepotSupport, supportDepose } from './live'

/**
 * Back-office Live Sessions (planche 07) : lecture du formulaire et ligne de
 * liste. Les admins voient tout, nombre d'inscrits et réunion Zoom compris
 * (RM13, 10.F).
 */

export interface SaisieSessionLive {
  moduleId?: string
  date?: string
  heure?: string
  dureeMinutes?: number
  capacite?: number
  formateurId?: string
  moderateurId?: string | null
  prerequis?: string[]
  gains?: string[]
  deroule?: EtapeDeroule[]
  /** Réunion existante, collée à la main (V1 du CDC) ; vide = créée à la publication. */
  zoomReunionId?: string | null
  zoomMotDePasse?: string | null
  zoomLienParticipation?: string | null
  zoomLienHote?: string | null
  derouleValide?: boolean
  testTechniqueLe?: string | null
}

function textes(valeur: unknown, max = 12): string[] {
  if (!Array.isArray(valeur)) return []
  return valeur
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim().slice(0, 240))
    .filter(Boolean)
    .slice(0, max)
}

function deroule(valeur: unknown): EtapeDeroule[] {
  if (!Array.isArray(valeur)) return []
  return valeur
    .flatMap((e) => {
      const etape = e as Partial<EtapeDeroule>
      const libelle = typeof etape.libelle === 'string' ? etape.libelle.trim().slice(0, 200) : ''
      const decalage = Number(etape.decalageMinutes)
      if (!libelle || !Number.isFinite(decalage) || decalage < 0 || decalage > 600) return []
      return [{ decalageMinutes: Math.round(decalage), libelle, questionsReponses: etape.questionsReponses === true }]
    })
    .sort((a, b) => a.decalageMinutes - b.decalageMinutes)
    .slice(0, 20)
}

function texteOuNul(valeur: unknown, max = 500): string | null {
  return typeof valeur === 'string' && valeur.trim() ? valeur.trim().slice(0, max) : null
}

/** Normalise le corps reçu ; les absents restent `undefined` (PATCH). */
export function lireSaisieSessionLive(corps: Record<string, unknown>): SaisieSessionLive & { debut?: string } {
  const saisie: SaisieSessionLive & { debut?: string } = {}
  if (typeof corps.moduleId === 'string') saisie.moduleId = corps.moduleId
  if (corps.date !== undefined || corps.heure !== undefined) {
    const debut = debutDepuisSaisie(String(corps.date ?? ''), String(corps.heure ?? ''))
    if (!debut) throw createError({ statusCode: 422, statusMessage: 'Date ou heure (GMT) invalide' })
    saisie.debut = debut
  }
  if (corps.dureeMinutes !== undefined) {
    const duree = Number(corps.dureeMinutes)
    if (!Number.isInteger(duree) || duree < 15 || duree > 600) {
      throw createError({ statusCode: 422, statusMessage: 'Durée invalide' })
    }
    saisie.dureeMinutes = duree
  }
  if (corps.capacite !== undefined) {
    const capacite = Number(corps.capacite)
    if (!Number.isInteger(capacite) || capacite < 1 || capacite > 100_000) {
      throw createError({ statusCode: 422, statusMessage: 'Capacité invalide : nombre de participants de la licence Zoom' })
    }
    saisie.capacite = capacite
  }
  if (typeof corps.formateurId === 'string') saisie.formateurId = corps.formateurId
  if (corps.moderateurId !== undefined) saisie.moderateurId = texteOuNul(corps.moderateurId, 64)
  if (corps.prerequis !== undefined) saisie.prerequis = textes(corps.prerequis)
  if (corps.gains !== undefined) saisie.gains = textes(corps.gains)
  if (corps.deroule !== undefined) saisie.deroule = deroule(corps.deroule)
  if (corps.zoomReunionId !== undefined) {
    const id = texteOuNul(corps.zoomReunionId, 32)?.replace(/\s+/g, '') ?? null
    if (id && !/^\d{9,12}$/.test(id)) {
      throw createError({ statusCode: 422, statusMessage: 'ID de réunion Zoom invalide (9 à 12 chiffres)' })
    }
    saisie.zoomReunionId = id
  }
  if (corps.zoomMotDePasse !== undefined) saisie.zoomMotDePasse = texteOuNul(corps.zoomMotDePasse, 64)
  for (const cle of ['zoomLienParticipation', 'zoomLienHote'] as const) {
    if (corps[cle] === undefined) continue
    const lien = texteOuNul(corps[cle], 1000)
    if (lien && !/^https:\/\/([a-z0-9-]+\.)?zoom\.us\//i.test(lien)) {
      throw createError({ statusCode: 422, statusMessage: 'Les liens Zoom doivent commencer par https://…zoom.us/' })
    }
    saisie[cle] = lien
  }
  if (corps.derouleValide !== undefined) saisie.derouleValide = corps.derouleValide === true
  if (corps.testTechniqueLe !== undefined) {
    const t = texteOuNul(corps.testTechniqueLe, 40)
    if (t && Number.isNaN(new Date(t).getTime())) throw createError({ statusCode: 422, statusMessage: 'Date du test technique invalide' })
    saisie.testTechniqueLe = t ? new Date(t).toISOString() : null
  }
  return saisie
}

/** Ligne de la liste admin et contenu du formulaire d'édition. */
export async function ligneAdminLive(
  session: SessionLive,
  contexte: {
    modules: Map<string, Module>
    formateurs: Map<string, Formateur>
    admins: Map<string, Utilisateur>
    places: { confirmees: number; reservees: number } | undefined
    avecZoom?: boolean
  },
) {
  const module = contexte.modules.get(session.moduleId)
  const moderateur = session.moderateurId ? contexte.admins.get(session.moderateurId) : undefined
  return {
    ...session,
    module: module
      ? { id: module.id, slug: module.slug, titre: module.titre, numero: module.numero, programme: module.programme, statut: module.statut }
      : null,
    formateur: contexte.formateurs.get(session.formateurId)?.nom ?? '',
    moderateur: moderateur ? `${moderateur.prenom} ${moderateur.nom}` : '',
    inscrits: contexte.places?.confirmees ?? 0,
    reservees: contexte.places?.reservees ?? 0,
    echeanceVideo: echeanceVideo(session),
    zoom: contexte.avecZoom ? await liensZoomLive(session.id) : null,
  }
}

/**
 * Dépôt du support en deux temps, commun à l'admin et au formateur (RM5) :
 * `preparer` rend une URL d'envoi direct vers le seau privé ; `confirmer`
 * enregistre le fichier une fois envoyé, retire l'ancien et, si la session
 * est terminée, envoie l'e-mail de fin aux inscrits (§4.1).
 */
export async function deposerSupportLive(
  session: SessionLive,
  corps: { etape?: string; nom?: string; taille?: number; chemin?: string },
) {
  if (session.statut === 'annulee') {
    throw createError({ statusCode: 409, statusMessage: 'Session annulée : aucun support à déposer' })
  }
  if (corps.etape === 'preparer') {
    return await preparerDepotSupport(session.id, String(corps.nom ?? ''), Number(corps.taille))
  }
  if (corps.etape === 'confirmer') {
    const chemin = String(corps.chemin ?? '')
    if (!(await supportDepose(session.id, chemin))) {
      throw createError({ statusCode: 422, statusMessage: 'Fichier introuvable : recommencez le dépôt.' })
    }
    const ancien = await supportLive(session.id)
    const nom = String(corps.nom ?? 'Support de cours').replace(/[\\/]/g, '_').slice(0, 120)
    await majSupportLive(session.id, chemin, nom)
    if (ancien && ancien.chemin !== chemin) await effacerSupport(ancien.chemin)
    const aJour = await trouverSessionLive(session.id)
    if (aJour?.statut === 'terminee') await envoyerFinLive(aJour)
    return { supportNom: nom }
  }
  throw createError({ statusCode: 422, statusMessage: 'Étape de dépôt inconnue' })
}
