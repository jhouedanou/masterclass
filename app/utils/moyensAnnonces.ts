/**
 * Les moyens de paiement annoncés au public (fiche module, FAQ), dans l'ordre
 * du tunnel. Visa et Djamo suivent `FEEXPAY_CARTE_ACTIVE` (KYC carte), Wave
 * suit `FEEXPAY_WAVE_ACTIVE` (activation de Wave sur le compte marchand) :
 * on n'annonce pas un moyen que FeexPay refuserait.
 */
export function moyensAnnonces(public_: { feexpayCarteActive?: boolean; feexpayWaveActive?: boolean }): string[] {
  return [
    'Mobile Money',
    ...(public_.feexpayCarteActive ? ['Djamo'] : []),
    ...(public_.feexpayWaveActive ? ['Wave'] : []),
    ...(public_.feexpayCarteActive ? ['Visa'] : []),
  ]
}

/** « Mobile Money », « Mobile Money et Wave », « Mobile Money, Djamo, Wave et Visa ». */
export function enumerer(elements: string[]): string {
  return elements.length < 2 ? (elements[0] ?? '') : `${elements.slice(0, -1).join(', ')} et ${elements.at(-1)}`
}
