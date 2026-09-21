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
  // Plus de contrôle d'écart entre durée annoncée et durée filmée : la durée
  // du module est désormais la somme de ses chapitres, calculée à chaque
  // changement. Comparer un nombre à lui-même ne pouvait que produire du bruit
  // — et, tant que les dix-huit modules annonçaient soixante minutes par
  // défaut, un reproche que rien dans l'interface ne permettait de satisfaire.

  return {
    pret: manques.length === 0,
    manques,
    details: {
      chapitres: chapitres.length,
      avecVideo,
      avecScript,
      dureeMinutes,
      dureeCibleMinutes: moduleCourant.dureeMinutes,
    },
  }
}
