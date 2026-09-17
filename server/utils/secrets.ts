import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Comparaison à temps constant de deux valeurs secrètes.
 *
 * `===` sur une chaîne s'arrête au premier caractère différent : la durée du
 * refus dit alors de combien on s'est approché, et un jeton se devine caractère
 * par caractère. `timingSafeEqual` exige deux tampons de même longueur —
 * l'empreinte SHA-256 les uniformise sans révéler la longueur attendue.
 *
 * Le webhook FeexPay le faisait déjà pour sa clé partagée ; le lien de
 * prévisualisation, lui, comparait son HMAC avec `!==`. La fonction est donc
 * ici, où les deux la prennent.
 */
export function memeSecret(presente: string, attendu: string): boolean {
  return timingSafeEqual(
    createHash('sha256').update(presente).digest(),
    createHash('sha256').update(attendu).digest(),
  )
}
