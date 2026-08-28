import type { SectionAdmin } from '#shared/types'
import { enregistrerJournal } from '../../database/administration'
import { creerCompteAdmin, majSectionsAdmin, revoquerCompteAdmin } from '../../database/comptes'
import { hacherMotDePasse, refusMotDePasse } from '../../utils/motDePasse'
import { exigerSection } from '../../utils/session'

/**
 * Création, modification et révocation des comptes d'administration.
 *
 * Deux garde-fous que la maquette impose : « Transactions & paiements » et le
 * rang d'administrateur supérieur ne peuvent être accordés que par un
 * administrateur supérieur — sans quoi un compte de contenu pourrait
 * s'octroyer à lui-même ce qu'on lui a refusé.
 */
const RESERVEES: SectionAdmin[] = ['transactions-paiements', 'referencement-avance']

export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'administration-acces')
  const body = await readBody<{
    action: 'creer' | 'droits' | 'revoquer'
    id?: string
    prenom?: string
    nom?: string
    email?: string
    whatsapp?: string
    motDePasse?: string
    sections?: SectionAdmin[]
    superieur?: boolean
  }>(event)

  const auteur = `${admin.prenom} ${admin.nom}`
  const sections = body.sections ?? []

  if (body.action !== 'revoquer' && admin.role !== 'admin-superieur') {
    const refusees = sections.filter((s) => RESERVEES.includes(s))
    if (refusees.length || body.superieur) {
      throw createError({
        statusCode: 403,
        statusMessage:
          'Seul un administrateur supérieur peut accorder les transactions, le référencement avancé ou son propre rang.',
      })
    }
  }

  if (body.action === 'revoquer') {
    if (!body.id) throw createError({ statusCode: 422, statusMessage: 'Compte non précisé' })
    if (body.id === admin.id) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Vous ne pouvez pas révoquer votre propre compte.',
      })
    }
    await revoquerCompteAdmin(body.id)
    await enregistrerJournal(auteur, 'a révoqué un compte d’administration', body.id)
    return { ok: true }
  }

  if (body.action === 'droits') {
    if (!body.id) throw createError({ statusCode: 422, statusMessage: 'Compte non précisé' })
    const compte = await majSectionsAdmin(body.id, sections)
    await enregistrerJournal(
      auteur,
      'a modifié les droits de',
      `${compte.prenom} ${compte.nom} — ${sections.length} section(s)`,
    )
    return compte
  }

  if (!body.prenom?.trim() || !body.nom?.trim() || !body.email?.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Prénom, nom et e-mail sont requis' })
  }
  const refus = refusMotDePasse(body.motDePasse ?? '')
  if (refus) throw createError({ statusCode: 422, statusMessage: refus })

  const compte = await creerCompteAdmin({
    prenom: body.prenom.trim(),
    nom: body.nom.trim(),
    email: body.email.trim().toLowerCase(),
    whatsapp: body.whatsapp?.trim() || undefined,
    motDePasseHache: await hacherMotDePasse(body.motDePasse!),
    sections,
    superieur: body.superieur === true,
  })

  await enregistrerJournal(
    auteur,
    'a créé un compte d’administration',
    `${compte.prenom} ${compte.nom} — ${body.superieur ? 'administrateur supérieur' : `${sections.length} section(s)`}`,
  )
  return compte
})
