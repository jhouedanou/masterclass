import type { BloquantsSuppressionFormateur } from '#shared/types'
import { compter } from './compteurs'

/**
 * Ce qui bloque la suppression d'un formateur, en toutes lettres : la modale
 * de l'écran 11 l'affiche avant le clic, et la route le renvoie si on passe
 * outre. Les précisions entre parenthèses répondent d'avance à « mais il est
 * en brouillon » ou « mais elle est passée » : ces liens-là bloquent aussi.
 */
export function motifsBlocageSuppression(b: BloquantsSuppressionFormateur): string[] {
  return [
    b.modules && `${compter(b.modules, 'module')} (brouillons compris)`,
    b.sessions && `${compter(b.sessions, 'session de coaching', 'sessions de coaching')} (passées comprises)`,
    b.demandesCoaching &&
      compter(b.demandesCoaching, 'demande de coaching privé', 'demandes de coaching privé'),
    b.candidatures && compter(b.candidatures, 'candidature acceptée', 'candidatures acceptées'),
    b.articles && compter(b.articles, 'article signé', 'articles signés'),
    b.commandes && compter(b.commandes, 'commande sur son compte', 'commandes sur son compte'),
    b.transactions && compter(b.transactions, 'transaction sur son compte', 'transactions sur son compte'),
    b.certificats &&
      compter(b.certificats, 'attestation délivrée à son compte', 'attestations délivrées à son compte'),
  ].filter((motif): motif is string => Boolean(motif))
}

/** « 3 modules (brouillons compris), 1 session… et 2 articles signés ». */
export function listerMotifs(motifs: string[]): string {
  if (motifs.length < 2) return motifs.join('')
  return `${motifs.slice(0, -1).join(', ')} et ${motifs.at(-1)}`
}
