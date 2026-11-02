import type { ChampsLiveSession } from '../database/live'
import { slugifier } from './texte'

/**
 * Lecture et contrôle du formulaire Live Session du back-office. Les listes
 * (prérequis, objectifs) arrivent une ligne par élément ; les lignes vides
 * sont écartées.
 */
export function lireChampsLiveSession(body: Record<string, unknown>): ChampsLiveSession {
  const texte = (cle: string) => (typeof body[cle] === 'string' ? (body[cle] as string).trim() : '')
  const liste = (cle: string) =>
    (Array.isArray(body[cle]) ? (body[cle] as unknown[]) : texte(cle).split('\n'))
      .map((l) => String(l).trim())
      .filter(Boolean)
      .slice(0, 12)
  const entier = (cle: string, defaut: number) => {
    const n = Number(body[cle])
    return Number.isFinite(n) ? Math.round(n) : defaut
  }

  const titre = texte('titre')
  const date = texte('date')
  const heure = texte('heure').slice(0, 5)
  const statut = texte('statut') || 'brouillon'
  const champs: ChampsLiveSession = {
    titre,
    slug: slugifier(texte('slug') || titre).replace(/-+$/, ''),
    resume: texte('resume'),
    description: texte('description'),
    prerequis: liste('prerequis'),
    objectifs: liste('objectifs'),
    formateurId: texte('formateurId'),
    date,
    heure,
    dureeMinutes: entier('dureeMinutes', 90),
    prixFcfa: entier('prixFcfa', 0),
    places: entier('places', 100),
    statut: statut as ChampsLiveSession['statut'],
    image: texte('image') || null,
  }

  const erreurs: string[] = []
  if (!titre) erreurs.push('le titre')
  if (!champs.slug) erreurs.push('l’adresse')
  if (!champs.formateurId) erreurs.push('le formateur')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) erreurs.push('la date')
  if (!/^\d{2}:\d{2}$/.test(heure)) erreurs.push('l’heure')
  if (champs.dureeMinutes <= 0 || champs.dureeMinutes > 600) erreurs.push('la durée (1 à 600 minutes)')
  if (champs.prixFcfa < 0) erreurs.push('le prix')
  if (champs.places <= 0) erreurs.push('le nombre de places')
  if (!['brouillon', 'publiee', 'annulee', 'terminee'].includes(statut)) erreurs.push('le statut')
  if (erreurs.length) {
    throw createError({ statusCode: 422, statusMessage: `À corriger : ${erreurs.join(', ')}.` })
  }
  return champs
}
