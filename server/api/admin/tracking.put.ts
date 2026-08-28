import { enregistrerJournal } from '../../database/administration'
import { lireReglagesTracking, majReglagesTracking } from '../../database/backoffice'
import { trouverIdentifiants } from '../../database/comptes'
import { verifierMotDePasse } from '../../utils/motDePasse'
import { exigerAdmin } from '../../utils/session'

/**
 * Réglages de tracking (planche C, écran 07b).
 *
 * L'écran est verrouillé par défaut : un traqueur cassé, ce sont des données
 * publicitaires perdues sans que personne ne s'en aperçoive. Déverrouiller
 * exige donc de ressaisir son mot de passe, et chaque changement part au
 * journal avec son ancienne valeur.
 */
const LIBELLES: Record<string, string> = {
  gtmConteneur: 'conteneur GTM',
  metaPixelId: 'Meta Pixel',
  metaCapiJeton: 'jeton CAPI Meta',
  ga4Mesure: 'identifiant GA4',
  tiktokPixelId: 'TikTok Pixel',
  linkedinPartnerId: 'LinkedIn Partner',
  codePersonnalise: 'code personnalisé',
}

export default defineEventHandler(async (event) => {
  const admin = await exigerAdmin(event)
  const body = await readBody<Record<string, string | boolean | undefined>>(event)

  const motDePasse = typeof body.motDePasse === 'string' ? body.motDePasse : ''
  const identifiants = await trouverIdentifiants(admin.email)
  if (!(await verifierMotDePasse(motDePasse, identifiants?.motDePasseHache ?? null))) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Mot de passe incorrect : les réglages restent verrouillés.',
    })
  }

  if (body.codePersonnalise !== undefined && admin.role !== 'admin-superieur') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Le code personnalisé est réservé aux administrateurs supérieurs.',
    })
  }

  const avant = await lireReglagesTracking()
  const auteur = `${admin.prenom} ${admin.nom}`
  const { motDePasse: _ignore, ...champs } = body

  const apres = await majReglagesTracking(champs as never, auteur)

  // Un journal par valeur réellement changée : « ancienne → nouvelle ».
  const lire = (r: typeof avant, cle: string) => (r as unknown as Record<string, unknown>)[cle]
  for (const [cle, libelle] of Object.entries(LIBELLES)) {
    const ancienne = lire(avant, cle)
    const nouvelle = lire(apres, cle)
    if (ancienne === nouvelle) continue
    // Le jeton CAPI et le code personnalisé sont des secrets : on journalise
    // le fait qu'ils changent, jamais leur valeur.
    const secret = cle === 'metaCapiJeton' || cle === 'codePersonnalise'
    await enregistrerJournal(
      auteur,
      'a modifié le tracking',
      secret ? `${libelle} — valeur remplacée` : `${libelle} : « ${ancienne || '—'} » → « ${nouvelle || '—'} »`,
    )
  }

  return apres
})
