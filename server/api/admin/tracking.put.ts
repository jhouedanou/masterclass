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

/**
 * Formats admis, valeur vide comprise (pour retirer une balise). Un identifiant
 * n'est qu'un identifiant : rien d'autre ne doit pouvoir entrer par ces champs.
 */
const FORMATS: Record<string, RegExp> = {
  gtmConteneur: /^(GTM-[A-Z0-9]{4,12})?$/,
  ga4Mesure: /^(G-[A-Z0-9]{4,15})?$/,
  metaPixelId: /^(\d{5,20})?$/,
  tiktokPixelId: /^([A-Za-z0-9]{10,30})?$/,
  linkedinPartnerId: /^(\d{3,12})?$/,
}

/**
 * Réservés aux administrateurs supérieurs : le conteneur GTM, comme le code
 * personnalisé, revient à exécuter le JavaScript de son choix sur toutes les
 * pages du site — y compris sous la session d'un admin supérieur, qui crée des
 * comptes et ouvre des accès. Un admin-contenu ne peut donc pas les changer.
 */
const RESERVES_SUPERIEUR = ['gtmConteneur', 'codePersonnalise'] as const

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

  const avantControle = await lireReglagesTracking()
  for (const cle of RESERVES_SUPERIEUR) {
    const actuelle = (avantControle as unknown as Record<string, unknown>)[cle]
    if (body[cle] !== undefined && (body[cle] || '') !== (actuelle || '') && admin.role !== 'admin-superieur') {
      throw createError({
        statusCode: 403,
        statusMessage: `Le ${LIBELLES[cle]} est réservé aux administrateurs supérieurs.`,
      })
    }
  }

  for (const [cle, format] of Object.entries(FORMATS)) {
    const valeur = body[cle]
    if (valeur === undefined) continue
    if (typeof valeur !== 'string' || !format.test(valeur.trim())) {
      throw createError({ statusCode: 422, statusMessage: `Format invalide pour le ${LIBELLES[cle]}.` })
    }
    body[cle] = valeur.trim()
  }

  const avant = avantControle
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
