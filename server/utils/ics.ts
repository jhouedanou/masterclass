/**
 * Fichier d'agenda .ics (RFC 5545) : joint à l'e-mail de confirmation d'une
 * Live Session et servi par « Ajouter à mon agenda » (planches 04 et 06).
 *
 * L'événement ne porte aucun lien Zoom (RM4) : seulement l'adresse de
 * l'espace, où la salle s'ouvre le jour J.
 */

function horodatage(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Échappement des valeurs texte (virgules, points-virgules, retours). */
function texte(valeur: string): string {
  return valeur.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** Lignes de 75 octets au plus, continuées par une espace (§3.1). */
function plier(ligne: string): string {
  const octets = Buffer.from(ligne, 'utf8')
  if (octets.length <= 75) return ligne
  const morceaux: string[] = []
  let debut = 0
  while (debut < octets.length) {
    let fin = Math.min(debut + (debut === 0 ? 75 : 74), octets.length)
    // Ne pas couper un caractère UTF-8 en deux.
    while (fin < octets.length && (octets[fin]! & 0xc0) === 0x80) fin--
    morceaux.push(octets.subarray(debut, fin).toString('utf8'))
    debut = fin
  }
  return morceaux.join('\r\n ')
}

export function evenementIcs(champs: {
  uid: string
  debut: string
  dureeMinutes: number
  titre: string
  description: string
  lien: string
}): string {
  const fin = new Date(new Date(champs.debut).getTime() + champs.dureeMinutes * 60_000).toISOString()
  const lignes = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//E-Masterclass Big Five//Live Sessions//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${champs.uid}`,
    `DTSTAMP:${horodatage(new Date().toISOString())}`,
    `DTSTART:${horodatage(champs.debut)}`,
    `DTEND:${horodatage(fin)}`,
    `SUMMARY:${texte(champs.titre)}`,
    `DESCRIPTION:${texte(`${champs.description}\n${champs.lien}`)}`,
    `URL:${champs.lien}`,
    'LOCATION:En ligne · E-Masterclass Big Five',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${texte(champs.titre)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lignes.map(plier).join('\r\n') + '\r\n'
}
