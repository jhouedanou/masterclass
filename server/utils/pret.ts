import type { Module } from '#shared/types'

/**
 * Conditions à remplir avant de marquer un module « Prêt ».
 *
 * Elle est calculée côté serveur, et pas seulement affichée : le bouton refuse
 * si elle n'est pas satisfaite. Celle du navigateur ne fait pas foi — il
 * suffirait d'un onglet resté ouvert sur un état ancien.
 *
 * « Prêt » ne veut pas dire « en vente ». Un module prêt est filmé, transcrit
 * et relu ; l'ouverture de l'offre reste une décision distincte.
 */

interface ChapitreControle {
  libelle: string
  videoCle: string | null
  videoDureeSecondes: number | null
  nbLignesScript: number
}

/** La durée annoncée sur la fiche est éditoriale ; on tolère un écart, mais
 *  pas un module de trente minutes vendu pour une heure. */
const TOLERANCE_DUREE = 0.15

export interface Checklist {
  pret: boolean
  manques: string[]
  details: {
    chapitres: number
    avecVideo: number
    avecScript: number
    dureeMinutes: number
    dureeCibleMinutes: number
  }
}

export function checklistPret(moduleCourant: Module, chapitres: ChapitreControle[]): Checklist {
  const avecVideo = chapitres.filter((c) => c.videoCle).length
  const avecScript = chapitres.filter((c) => c.nbLignesScript > 0).length
  const secondes = chapitres.reduce((somme, c) => somme + (c.videoDureeSecondes ?? 0), 0)
  const dureeMinutes = Math.round(secondes / 60)
  const cible = moduleCourant.dureeMinutes

  const manques: string[] = []
  if (!chapitres.length) manques.push('au moins un chapitre')
  if (avecVideo < chapitres.length) {
    manques.push(`la vidéo de ${chapitres.length - avecVideo} chapitre(s)`)
  }
  if (avecScript < chapitres.length) {
    manques.push(`la transcription de ${chapitres.length - avecScript} chapitre(s)`)
  }
  if (!moduleCourant.promesse) manques.push('la promesse')
  if (!moduleCourant.pourquoi) manques.push('le « pourquoi »')
  // La durée ne se contrôle qu'une fois toutes les vidéos en place : sur un
  // module à moitié filmé, l'écart est attendu et le signaler serait du bruit.
  if (avecVideo === chapitres.length && chapitres.length > 0) {
    const ecart = Math.abs(dureeMinutes - cible) / cible
    if (ecart > TOLERANCE_DUREE) {
      manques.push(`une durée proche de ${cible} min (actuellement ${dureeMinutes} min)`)
    }
  }

  return {
    pret: manques.length === 0,
    manques,
    details: {
      chapitres: chapitres.length,
      avecVideo,
      avecScript,
      dureeMinutes,
      dureeCibleMinutes: cible,
    },
  }
}
