import type { LigneScript } from '#shared/types'

/**
 * Lecture d'un fichier de sous-titres SRT ou VTT vers le script synchronisé
 * d'un chapitre.
 *
 * Un seul analyseur pour les deux formats : leurs différences se réduisent à
 * trois normalisations en amont. Ce qui demande du soin, ce n'est pas la
 * grammaire — c'est ce que les exportateurs y laissent traîner.
 *
 * Le résultat n'est pas la transcription brute. Une réplique de sous-titre dure
 * deux à cinq secondes ; un chapitre de quarante minutes en produit cinq à huit
 * cents. Affichées telles quelles sous la vidéo, elles sont illisibles et le
 * jsonb enfle pour rien. On les regroupe en passages.
 */

/** Au-delà, le panneau latéral devient un mur : on regroupe plus large. */
const LIGNES_CIBLE = 400
const GROUPE_LARGE = { caracteres: 400, secondes: 35 }
const GROUPE_NORMAL = { caracteres: 220, secondes: 20 }

interface Replique {
  debut: number
  texte: string
  locuteur: string
}

/** « mm:ss », les minutes débordant au-delà de soixante.
 *
 *  Passer à « hh:mm:ss » casserait la lecture de tous les scripts déjà en base :
 *  `versSecondes`, côté navigateur, n'attend que deux segments. « 73:20 » est
 *  laid pour une vidéo de trois heures, mais les chapitres en font quarante-
 *  cinq au plus, et rien à reprendre vaut mieux qu'un format plus joli. */
function versTimecode(secondes: number): string {
  const minutes = Math.floor(secondes / 60)
  const reste = Math.floor(secondes % 60)
  return `${minutes}:${String(reste).padStart(2, '0')}`
}

const ENTITES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&nbsp;': ' ',
  '&#39;': "'",
}

/**
 * Nettoyage du texte d'une réplique.
 *
 * L'ordre n'est pas indifférent : les entités se décodent **après** le retrait
 * des balises. Décoder d'abord transformerait `&lt;i&gt;` en une balise que
 * l'étape suivante mangerait, emportant le texte avec elle.
 */
function nettoyer(brut: string): { texte: string; locuteur: string } {
  let texte = brut

  // Le changement de locuteur sert de coupure au regroupement : on le capture
  // avant de retirer la balise qui le porte.
  const voix = /<v(?:\.[^\s>]+)*\s+([^>]+)>/i.exec(texte)
  const locuteur = voix?.[1]?.trim() ?? ''

  texte = texte
    // Balises de mise en forme, de classe, de rubis, et horodatages internes
    // à une réplique (`<00:01:02.000>`).
    .replace(/<\/?[a-z][^>]*>/gi, '')
    // Reliquats de sous-titrage avancé que les exportateurs laissent passer.
    .replace(/\{\\[^}]*\}/g, '')

  for (const [entite, caractere] of Object.entries(ENTITES)) {
    texte = texte.split(entite).join(caractere)
  }

  return { texte: texte.replace(/\s+/g, ' ').trim(), locuteur }
}

/** `01:02:03,456`, `02:14.500`, `1:2:3.4` — heures optionnelles en VTT,
 *  virgule ou point selon l'exportateur, millisecondes sur un à trois chiffres.
 *  Les exports mélangent les deux séparateurs : on accepte les deux partout. */
const TEMPS = /(?:(\d{1,3}):)?(\d{1,2}):(\d{1,2})[.,](\d{1,3})/
const LIGNE_TEMPS = new RegExp(`^\\s*${TEMPS.source}\\s*-->\\s*${TEMPS.source}`)

function enSecondes(heures: string | undefined, minutes: string, secondes: string, ms: string): number {
  return (
    Number(heures ?? 0) * 3600 +
    Number(minutes) * 60 +
    Number(secondes) +
    Number(ms.padEnd(3, '0')) / 1000
  )
}

function lireRepliques(texte: string): Replique[] {
  const normalise = texte
    // Le marqueur d'ordre des octets est invisible : il fait échouer la
    // reconnaissance de « WEBVTT » et transforme l'index « 1 » en « ﻿1 ».
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')

  const repliques: Replique[] = []

  for (const bloc of normalise.split(/\n\s*\n+/)) {
    const lignes = bloc.split('\n').map((l) => l.trimEnd())
    if (!lignes.length) continue

    const premiere = lignes[0]?.trim() ?? ''
    // En-tête et métadonnées d'un VTT, commentaires, styles et régions.
    if (/^(WEBVTT|NOTE|STYLE|REGION)\b/i.test(premiere)) continue

    // La ligne de temps est celle qui porte la flèche — pas « la ligne 2 ».
    // En VTT l'identifiant de réplique est facultatif et peut être n'importe
    // quoi ; s'y fier par position produirait des décalages silencieux.
    const indexTemps = lignes.findIndex((l) => l.includes('-->'))
    if (indexTemps === -1) continue

    const correspondance = LIGNE_TEMPS.exec(lignes[indexTemps]!)
    if (!correspondance) continue

    const [, h1, m1, s1, ms1] = correspondance
    const debut = enSecondes(h1, m1!, s1!, ms1!)

    // Tout ce qui suit le second horodatage est un réglage de placement
    // (`align:start position:10%`) : sans intérêt ici.
    const corps = lignes.slice(indexTemps + 1).join(' ')
    const { texte: propre, locuteur } = nettoyer(corps)
    if (propre) repliques.push({ debut, texte: propre, locuteur })
  }

  // Un fichier mal ordonné existe — un montage remonté, deux pistes fusionnées.
  // Le regroupement suppose l'ordre, et la page de lecture aussi.
  return repliques.sort((a, b) => a.debut - b.debut)
}

/** Une phrase finie se coupe bien ; une phrase en cours, non. */
function phraseClose(texte: string): boolean {
  return /[.!?…:]$/.test(texte)
}

function regrouper(repliques: Replique[], seuils: typeof GROUPE_NORMAL): LigneScript[] {
  const lignes: LigneScript[] = []
  let courant: { debut: number; texte: string; locuteur: string } | null = null

  const clore = () => {
    if (courant) lignes.push({ temps: versTimecode(courant.debut), texte: courant.texte })
    courant = null
  }

  for (const replique of repliques) {
    if (!courant) {
      courant = { ...replique }
      continue
    }

    const cumul = `${courant.texte} ${replique.texte}`
    const tropLong = cumul.length > seuils.caracteres
    const tropEtale = replique.debut - courant.debut > seuils.secondes
    const changeDeVoix = Boolean(replique.locuteur) && replique.locuteur !== courant.locuteur

    if (tropLong || tropEtale || changeDeVoix || phraseClose(courant.texte)) {
      clore()
      courant = { ...replique }
    } else {
      courant.texte = cumul
    }
  }
  clore()

  return lignes
}

/**
 * Deux passages portant le même timecode produiraient une clé dupliquée dans
 * la liste du lecteur, et Vue rendrait mal — sans rien dire. On fusionne, et
 * la page de lecture emploie de toute façon l'index comme clé : ceinture et
 * bretelles, parce que le symptôme est invisible.
 */
function fusionnerDoublons(lignes: LigneScript[]): LigneScript[] {
  const fusionnees: LigneScript[] = []
  for (const ligne of lignes) {
    const precedente = fusionnees[fusionnees.length - 1]
    if (precedente && precedente.temps === ligne.temps) {
      precedente.texte = `${precedente.texte} ${ligne.texte}`
    } else {
      fusionnees.push({ ...ligne })
    }
  }
  return fusionnees
}

/**
 * Analyse un fichier de sous-titres. Renvoie les passages horodatés, prêts à
 * être rangés dans `chapitres.script`.
 *
 * Le format déclaré ne sert qu'à nommer l'origine : l'analyse est la même, et
 * un SRT renommé en `.vtt` passe sans broncher.
 */
export function analyserSousTitres(contenu: string): LigneScript[] {
  const repliques = lireRepliques(contenu)
  if (!repliques.length) return []

  let lignes = fusionnerDoublons(regrouper(repliques, GROUPE_NORMAL))
  if (lignes.length > LIGNES_CIBLE) {
    lignes = fusionnerDoublons(regrouper(repliques, GROUPE_LARGE))
  }
  return lignes
}
