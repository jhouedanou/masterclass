import type { Certificat, Commande, Transaction } from '#shared/types'
import { supabase } from './client'
import { traduireErreur, verifier, verifierOptionnel } from './erreurs'
import { versCertificat, versCommande, versTransaction } from './mappers'
import type { MoyenCommandeSql } from './types'

/** Commandes, paiements et certificats de participation. */

// --- Transactions ----------------------------------------------------------

export async function listerTransactions(): Promise<Transaction[]> {
  const rows = verifier(
    await supabase().from('transactions').select('*').order('date_transaction', { ascending: false }),
    'transactions',
  )
  return rows.map(versTransaction)
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
 * Le prestataire de paiement (FeexPay) n'étant pas branché, la commande est
 * créée directement au statut `confirmee`.
 */
export async function enregistrerCommande(champs: {
  utilisateurId: string
  lignes: { moduleId: string; prixFcfa: number }[]
  moyen: MoyenCommandeSql
}): Promise<Commande> {
  const reference = `CMD-${Date.now().toString(36).toUpperCase()}`
  const total = champs.lignes.reduce((somme, ligne) => somme + ligne.prixFcfa, 0)

  const commande = verifier(
    await supabase()
      .from('commandes')
      .insert({
        reference,
        utilisateur_id: champs.utilisateurId,
        total,
        moyen: champs.moyen,
        statut: 'confirmee',
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
