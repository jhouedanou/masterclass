/**
 * Format d'une session de coaching collectif, identique pour les deux
 * programmes : deux heures, vingt-cinq places (planche A, écrans 02 et 02b ;
 * planche C, écran 03, où le back-office affiche ces deux champs verrouillés).
 *
 * Ces valeurs étaient réécrites à la main dans sept écrans. Elles vivent ici
 * pour qu'un changement de format n'en oublie aucun.
 */
export const DUREE_SESSION_MINUTES = 120
export const PLACES_SESSION = 25

/** « 2 heures » : la durée telle que l'annonce le site vitrine. */
export function dureeSessionEnHeures(): string {
  const heures = DUREE_SESSION_MINUTES / 60
  return `${heures} ${heures > 1 ? 'heures' : 'heure'}`
}
