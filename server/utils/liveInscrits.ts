import { listerUtilisateurs } from '../database/comptes'
import { listerInscriptionsSessionLive, referencesTransactionsLive, trouverSessionLive } from '../database/live'

/**
 * Inscrits d'une session pour le back-office et l'export CSV (CDC §5.2) :
 * nom, e-mail, téléphone, date, référence de transaction. Les « à
 * rembourser » sont listés à part pour le suivi manuel (§6, étape 3).
 */
export async function listerInscriptionsLiveDetaillees(sessionId: string) {
  const session = await trouverSessionLive(sessionId)
  if (!session) throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable' })
  const [inscriptions, utilisateurs] = await Promise.all([
    listerInscriptionsSessionLive(session.id, ['confirmee', 'a-rembourser']),
    listerUtilisateurs(),
  ])
  const references = await referencesTransactionsLive(
    inscriptions.map((i) => i.commandeReference).filter((r): r is string => Boolean(r)),
  )
  const parId = new Map(utilisateurs.map((u) => [u.id, u]))
  return {
    session: { id: session.id, slug: session.slug, capacite: session.capacite },
    inscrits: inscriptions.map((i) => {
      const u = parId.get(i.utilisateurId)
      return {
        id: i.id,
        utilisateurId: i.utilisateurId,
        nom: u ? `${u.prenom} ${u.nom}` : i.utilisateurId,
        email: u?.email ?? '',
        telephone: u?.whatsapp ?? '',
        statut: i.statut,
        confirmeLe: i.confirmeLe,
        commandeReference: i.commandeReference,
        referenceTransaction: (i.commandeReference && references.get(i.commandeReference)) || i.commandeReference || '',
      }
    }),
  }
}
