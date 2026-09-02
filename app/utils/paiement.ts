import type { CodeEchecPaiement } from '#shared/types'

/** Les six cas d'erreur du tunnel (planche A, écran 04c) : message, conseil
 *  et action proposée. */
export const ECHECS_PAIEMENT: Record<
  CodeEchecPaiement,
  { titre: string; conseil: string; action: 'reessayer' | 'changer-moyen' | 'contacter' }
> = {
  'solde-insuffisant': {
    titre: 'Solde insuffisant',
    conseil: 'Rechargez votre compte ou choisissez un autre moyen de paiement, puis réessayez.',
    action: 'changer-moyen',
  },
  'annule-utilisateur': {
    titre: 'Paiement annulé',
    conseil: 'Vous avez refusé ou fermé la demande de paiement. Rien n’a été débité.',
    action: 'reessayer',
  },
  'delai-depasse': {
    titre: 'Délai dépassé',
    conseil: 'La demande n’a pas été validée à temps sur votre téléphone. Relancez le paiement et validez dès réception.',
    action: 'reessayer',
  },
  'reseau-operateur': {
    titre: 'Opérateur indisponible',
    conseil: 'Le réseau de l’opérateur n’a pas répondu. Patientez quelques minutes ou essayez un autre moyen.',
    action: 'changer-moyen',
  },
  'carte-refusee': {
    titre: 'Carte refusée',
    conseil: 'Votre banque a refusé l’opération. Vérifiez le plafond de paiement en ligne ou utilisez une autre carte.',
    action: 'changer-moyen',
  },
  'erreur-inconnue': {
    titre: 'Paiement impossible',
    conseil: 'Une erreur est survenue chez le prestataire. Si un montant a été débité, contactez-nous avec votre référence.',
    action: 'contacter',
  },
}

export const LIBELLES_ECHEC: Record<CodeEchecPaiement, string> = Object.fromEntries(
  Object.entries(ECHECS_PAIEMENT).map(([code, e]) => [code, e.titre]),
) as Record<CodeEchecPaiement, string>
