import type { CodeEchecPaiement } from '#shared/types'

/**
 * Les six cas d'erreur du tunnel (planche A, écran 04c) : titre, message tel
 * que la maquette le formule, conseil et action proposée. Deux motifs
 * internes (annulation par l'utilisateur, erreur inconnue) complètent la
 * liste sans figurer sur la planche.
 */
export const ECHECS_PAIEMENT: Record<
  CodeEchecPaiement,
  {
    titre: string
    message: string
    conseil: string
    action: 'reessayer' | 'changer-moyen' | 'contacter' | 'acceder' | 'attendre'
  }
> = {
  'solde-insuffisant': {
    titre: 'Solde insuffisant',
    message: 'Solde insuffisant sur votre compte Mobile Money. Aucune somme n’a été débitée.',
    conseil: 'Rechargez votre compte ou choisissez un autre moyen de paiement, puis réessayez.',
    action: 'changer-moyen',
  },
  'delai-depasse': {
    titre: 'Validation expirée',
    message: 'Vous n’avez pas validé à temps. Aucune somme n’a été débitée.',
    conseil: 'Relancez le paiement et validez la demande dès qu’elle s’affiche sur votre téléphone.',
    action: 'reessayer',
  },
  'reseau-operateur': {
    titre: 'Refus opérateur',
    message: 'Rejeté par votre opérateur. Aucune somme n’a été débitée.',
    conseil: 'Vérifiez que votre ligne est active et autorisée aux paiements, ou essayez un autre moyen.',
    action: 'changer-moyen',
  },
  'carte-refusee': {
    titre: 'Carte refusée',
    message: 'Vérifiez vos informations Visa. Aucune somme n’a été débitée.',
    conseil: 'Contrôlez le numéro, la date d’expiration et le plafond de paiement en ligne, ou utilisez une autre carte.',
    action: 'changer-moyen',
  },
  'interruption-reseau': {
    titre: 'Interruption réseau',
    message: 'Vérification en cours… Votre paiement n’a pas pu être confirmé tout de suite.',
    conseil: 'Vous recevrez un email dès que le prestataire aura répondu. Ne relancez pas le paiement d’ici là.',
    action: 'attendre',
  },
  doublon: {
    titre: 'Double paiement détecté',
    message: 'Achat déjà confirmé : ce module est déjà dans votre espace.',
    conseil: 'Aucun nouveau débit n’a été effectué. Reprenez le module depuis votre espace apprenant.',
    action: 'acceder',
  },
  'annule-utilisateur': {
    titre: 'Paiement annulé',
    message: 'Vous avez refusé ou fermé la demande de paiement. Aucune somme n’a été débitée.',
    conseil: 'Relancez le paiement quand vous êtes prêt.',
    action: 'reessayer',
  },
  'erreur-inconnue': {
    titre: 'Paiement non abouti',
    message: 'Une erreur est survenue chez le prestataire.',
    conseil: 'Si un montant a été débité, contactez-nous avec votre référence.',
    action: 'contacter',
  },
}

/** Les six cas de la planche 04c, dans son ordre. */
export const CAS_ECHEC_MAQUETTE: CodeEchecPaiement[] = [
  'solde-insuffisant',
  'delai-depasse',
  'reseau-operateur',
  'carte-refusee',
  'interruption-reseau',
  'doublon',
]

export const LIBELLES_ECHEC: Record<CodeEchecPaiement, string> = Object.fromEntries(
  Object.entries(ECHECS_PAIEMENT).map(([code, e]) => [code, e.titre]),
) as Record<CodeEchecPaiement, string>
