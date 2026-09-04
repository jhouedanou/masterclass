import type { Certificat, CodeEchecPaiement, Commande, Transaction } from '#shared/types'
import { supabase } from './client'
import { traduireErreur, verifier, verifierOptionnel } from './erreurs'
import { versCertificat, versCommande, versTransaction } from './mappers'
import type { MoyenCommandeSql, MoyenTransactionSql } from './types'

/** Commandes, paiements et certificats de participation. */

// --- Transactions ----------------------------------------------------------

export async function listerTransactions(): Promise<Transaction[]> {
  const rows = verifier(
    await supabase().from('transactions').select('*').order('date_transaction', { ascending: false }),
    'transactions',
  )
  return rows.map(versTransaction)
}

/** Trace du prestataire, réussie ou échouée avec son motif (planche C, écran 18f). */
export async function enregistrerTransaction(champs: {
  reference: string
  utilisateurId: string
  moduleId: string
  moyen: MoyenTransactionSql
  montant: number
  statut: 'reussie' | 'echouee' | 'en-attente'
  codeEchec?: CodeEchecPaiement
  detailEchec?: string
  commandeReference?: string
  referencePrestataire?: string
  reseau?: string
}): Promise<Transaction> {
  const row = verifier(
    await supabase()
      .from('transactions')
      .insert({
        reference: champs.reference,
        utilisateur_id: champs.utilisateurId,
        module_id: champs.moduleId,
        moyen: champs.moyen,
        montant: champs.montant,
        statut: champs.statut,
        code_echec: champs.statut === 'echouee' ? (champs.codeEchec ?? 'erreur-inconnue') : null,
        detail_echec: champs.detailEchec ?? null,
        commande_reference: champs.commandeReference ?? null,
        reference_prestataire: champs.referencePrestataire ?? null,
        reseau: champs.reseau ?? null,
      })
      .select('*')
      .single(),
    'enregistrement de la transaction',
  )
  return versTransaction(row)
}

export async function transactionsDeCommande(commandeReference: string): Promise<Transaction[]> {
  const rows = verifier(
    await supabase().from('transactions').select('*').eq('commande_reference', commandeReference),
    'transactions de la commande',
  )
  return rows.map(versTransaction)
}

/** Une transaction par sa référence FeexPay (celle que porte le webhook). */
export async function trouverTransactionParPrestataire(
  referencePrestataire: string,
): Promise<Transaction | null> {
  const row = verifierOptionnel(
    await supabase()
      .from('transactions')
      .select('*')
      .eq('reference_prestataire', referencePrestataire)
      .limit(1)
      .maybeSingle(),
    'transaction du prestataire',
  )
  return row ? versTransaction(row) : null
}

/**
 * Clôt les transactions en attente d'une commande d'après la réponse du
 * prestataire : toutes réussies, ou toutes échouées avec le même motif. Les
 * transactions déjà closes ne bougent plus (le webhook et la confirmation
 * client peuvent arriver dans les deux ordres).
 */
export async function cloreTransactionsCommande(
  commandeReference: string,
  resultat: {
    statut: 'reussie' | 'echouee'
    referencePrestataire?: string
    reseau?: string
    moyen?: MoyenTransactionSql
    codeEchec?: CodeEchecPaiement
    detailEchec?: string
  },
): Promise<void> {
  const { error } = await supabase()
    .from('transactions')
    .update({
      statut: resultat.statut,
      reference_prestataire: resultat.referencePrestataire ?? null,
      reseau: resultat.reseau ?? null,
      ...(resultat.moyen ? { moyen: resultat.moyen } : {}),
      code_echec: resultat.statut === 'echouee' ? (resultat.codeEchec ?? 'erreur-inconnue') : null,
      detail_echec: resultat.statut === 'echouee' ? (resultat.detailEchec ?? null) : null,
    })
    .eq('commande_reference', commandeReference)
    .eq('statut', 'en-attente')
  if (error) throw traduireErreur(error, 'clôture des transactions')
}

// --- Certificats -----------------------------------------------------------

export async function listerCertificats(): Promise<Certificat[]> {
  const rows = verifier(await supabase().from('certificats').select('*'), 'certificats')
  return rows.map(versCertificat)
}

export async function listerCertificatsUtilisateur(utilisateurId: string): Promise<Certificat[]> {
  const rows = verifier(
    await supabase()
      .from('certificats')
      .select('*')
      .eq('utilisateur_id', utilisateurId)
      .order('date_delivrance', { ascending: false }),
    'certificats de l’apprenant',
  )
  return rows.map(versCertificat)
}

/** Lecture publique par numéro : c'est la cible du QR code du document. */
export async function trouverCertificat(numero: string): Promise<Certificat | null> {
  const row = verifierOptionnel(
    await supabase().from('certificats').select('*').eq('numero', numero).maybeSingle(),
    'certificat',
  )
  return row ? versCertificat(row) : null
}

/**
 * Délivrance idempotente : la fonction Postgres renvoie le certificat existant
 * s'il y en a un, refuse un module non réalisé, et tire son numéro d'une
 * séquence — deux délivrances simultanées ne peuvent plus se télescoper.
 */
export async function delivrerCertificat(
  utilisateurId: string,
  moduleId: string,
): Promise<Certificat> {
  const { data, error } = await supabase().rpc('delivrer_certificat', {
    p_utilisateur_id: utilisateurId,
    p_module_id: moduleId,
  })
  if (error) throw traduireErreur(error, 'délivrance du certificat')
  return versCertificat(data)
}

// --- Commandes -------------------------------------------------------------

/**
 * Enregistre la commande et son détail. Le prix de chaque module y est figé :
 * un changement de tarif ne réécrira pas l'historique.
 *
 * Avec FeexPay, la commande naît `attente` et passe `confirmee` ou `echec` au
 * retour du prestataire ; en simulation elle est confirmée d'emblée.
 */
export async function enregistrerCommande(champs: {
  utilisateurId: string
  lignes: { moduleId: string; prixFcfa: number }[]
  moyen: MoyenCommandeSql
  statut?: Commande['statut']
}): Promise<Commande> {
  // Référence transmise à FeexPay comme `custom_id` : un suffixe aléatoire
  // évite qu'un même instant produise deux commandes identiques.
  const reference = `CMD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  const total = champs.lignes.reduce((somme, ligne) => somme + ligne.prixFcfa, 0)

  const commande = verifier(
    await supabase()
      .from('commandes')
      .insert({
        reference,
        utilisateur_id: champs.utilisateurId,
        total,
        moyen: champs.moyen,
        statut: champs.statut ?? 'confirmee',
      })
      .select('*')
      .single(),
    'création de la commande',
  )

  const { error } = await supabase()
    .from('commandes_modules')
    .insert(
      champs.lignes.map((ligne) => ({
        commande_reference: reference,
        module_id: ligne.moduleId,
        prix_fcfa: ligne.prixFcfa,
      })),
    )

  if (error) {
    // Une commande sans lignes ne veut rien dire : on la retire plutôt que de
    // laisser une trace incohérente dans l'historique.
    await supabase().from('commandes').delete().eq('reference', reference)
    throw traduireErreur(error, 'détail de la commande')
  }

  return versCommande(commande, champs.lignes.map((ligne) => ligne.moduleId))
}

export async function trouverCommande(reference: string): Promise<Commande | null> {
  const row = verifierOptionnel(
    await supabase().from('commandes').select('*').eq('reference', reference).maybeSingle(),
    'commande',
  )
  if (!row) return null
  const lignes = verifier(
    await supabase().from('commandes_modules').select('module_id').eq('commande_reference', reference),
    'détail de la commande',
  )
  return versCommande(row, lignes.map((l) => l.module_id))
}

export async function changerStatutCommande(
  reference: string,
  statut: Commande['statut'],
): Promise<void> {
  const { error } = await supabase().from('commandes').update({ statut }).eq('reference', reference)
  if (error) throw traduireErreur(error, 'statut de la commande')
}
