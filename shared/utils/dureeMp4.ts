/**
 * Durée d'un MP4, lue dans le fichier lui-même.
 *
 * La durée déclarée au dépôt vient du navigateur de l'administrateur : c'est
 * lui qui décode le fichier et rapporte `video.duration`. Cette valeur est une
 * mesure, pas une lecture — elle dépend du décodeur, s'arrondit, et vaut
 * parfois `Infinity` sur un fichier à images-clés espacées. Le MP4, lui, porte
 * la réponse : la boîte `mvhd`, dans `moov`, donne une échelle de temps et un
 * nombre d'unités. Le quotient est la durée, au dix-millième de seconde près,
 * identique quel que soit le lecteur.
 *
 * Tout tient dans les premiers octets du fichier, à une condition : que `moov`
 * précède `mdat`. C'est exactement ce que le contrôle « optimisé pour le web »
 * impose au dépôt, et ce que le stockage sert volontiers par plage — lire une
 * durée coûte alors un mégaoctet, pas sept cents.
 */

/** Assez pour contenir `ftyp` puis `moov` en tête ; un `moov` d'une heure de
 *  vidéo pèse quelques centaines de kilo-octets. */
export const OCTETS_ENTETE_MP4 = 1024 * 1024

interface Boite {
  type: string
  debut: number
  finContenu: number
}

/** Parcours des boîtes d'un niveau. Une boîte se lit « taille, type, contenu »
 *  — la taille inclut ces huit octets, et vaut 1 quand elle est portée sur
 *  soixante-quatre bits, 0 quand elle court jusqu'à la fin. */
function* boites(vue: DataView, debut: number, fin: number): Generator<Boite> {
  let position = debut
  while (position + 8 <= fin) {
    let taille = vue.getUint32(position)
    let entete = 8
    if (taille === 1) {
      if (position + 16 > fin) return
      taille = Number(vue.getBigUint64(position + 8))
      entete = 16
    } else if (taille === 0) {
      taille = fin - position
    }
    if (taille < entete) return
    yield { type: texte(vue, position + 4), debut: position + entete, finContenu: position + taille }
    position += taille
  }
}

function texte(vue: DataView, position: number): string {
  return String.fromCharCode(
    vue.getUint8(position),
    vue.getUint8(position + 1),
    vue.getUint8(position + 2),
    vue.getUint8(position + 3),
  )
}

/**
 * Durée en secondes, ou `null` si l'en-tête ne permet pas de conclure — fichier
 * tronqué, `moov` rejeté en fin, ou durée nulle comme sur un MP4 fragmenté.
 *
 * Renvoyer `null` plutôt qu'une approximation est délibéré : l'appelant garde
 * alors la valeur qu'il avait, au lieu d'en écrire une fausse avec l'autorité
 * d'une lecture.
 */
export function dureeMp4(octets: ArrayBuffer | Uint8Array): number | null {
  const vue =
    octets instanceof Uint8Array
      ? new DataView(octets.buffer, octets.byteOffset, octets.byteLength)
      : new DataView(octets)

  for (const boite of boites(vue, 0, vue.byteLength)) {
    // Les données précèdent la table : la suite du fichier n'est pas ici, et
    // la lire demanderait de tout télécharger.
    if (boite.type === 'mdat') return null
    if (boite.type !== 'moov') continue

    for (const enfant of boites(vue, boite.debut, Math.min(boite.finContenu, vue.byteLength))) {
      if (enfant.type !== 'mvhd') continue
      if (enfant.debut + 4 > vue.byteLength) return null

      const version = vue.getUint8(enfant.debut)
      // Les dates de création et de modification occupent quatre octets en
      // version 0, huit en version 1 ; l'échelle et la durée suivent.
      const position = enfant.debut + 4 + (version === 1 ? 16 : 8)
      if (position + (version === 1 ? 12 : 8) > vue.byteLength) return null

      const echelle = vue.getUint32(position)
      const unites =
        version === 1 ? Number(vue.getBigUint64(position + 4)) : vue.getUint32(position + 4)

      if (!echelle || !unites) return null
      // 0xFFFFFFFF en version 0 signifie « durée inconnue ».
      if (version !== 1 && unites === 0xffffffff) return null
      return unites / echelle
    }
    return null
  }
  return null
}
