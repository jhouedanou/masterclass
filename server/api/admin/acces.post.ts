import type { SectionAdmin } from '#shared/types'
import { estSectionAdmin } from '#shared/utils/sectionsAdmin'
import { enregistrerJournal } from '../../database/administration'
import {
  creerCompteAdmin,
  majSectionsAdmin,
  revoquerCompteAdmin,
  trouverUtilisateur,
} from '../../database/comptes'
import { hacherMotDePasse, refusMotDePasse } from '../../utils/motDePasse'
import { exigerSection } from '../../utils/session'

/**
 * Création, modification et révocation des comptes d'administration.
 *
 * Deux garde-fous que la maquette impose : « Transactions & paiements » et le
 * rang d'administrateur supérieur ne peuvent être accordés que par un
 * administrateur supérieur — sans quoi un compte de contenu pourrait
 * s'octroyer à lui-même ce qu'on lui a refusé.
 *
 * Deux autres, que l'audit a rendus nécessaires :
 *
 * - le refus de se prendre soi-même pour cible ne valait que pour « révoquer ».
 *   Un administrateur de contenu détenant cette section pouvait donc s'ajouter
 *   par « droits » toutes les sections non réservées ;
 * - `revoquerCompteAdmin` accepte un `admin-superieur` comme cible et remet son
 *   rôle à « apprenant » en effaçant son empreinte de mot de passe. Un
 *   administrateur de contenu pouvait ainsi mettre un supérieur à la porte de
 *   son propre compte.
 *
 * Et deux encore, depuis l'audit du 20/10 :
 *
 * - un administrateur qui n'est pas supérieur n'accorde que des sections
 *   qu'il détient lui-même. Avant, la seule section « Administration des
 *   accès » suffisait à créer un compte doté de toutes les autres, puis à
 *   s'en servir ;
 * - les sections reçues sont validées contre l'énumération : une chaîne
 *   inconnue était transmise telle quelle à la base, qui la refusait par une
 *   erreur 500.
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
    sections?: unknown
    superieur?: boolean
  }>(event)

  if (!['creer', 'droits', 'revoquer'].includes(body.action)) {
    throw createError({ statusCode: 422, statusMessage: 'Action inconnue' })
  }
  if (body.sections !== undefined && !Array.isArray(body.sections)) {
    throw createError({ statusCode: 422, statusMessage: 'Sections illisibles' })
  }
  const recues: unknown[] = Array.isArray(body.sections) ? body.sections : []
  const inconnue = recues.find((s) => !estSectionAdmin(s))
  if (inconnue !== undefined) {
    throw createError({ statusCode: 422, statusMessage: `Section inconnue : ${String(inconnue).slice(0, 40)}` })
  }
  const sections = [...new Set(recues as SectionAdmin[])]

  const auteur = `${admin.prenom} ${admin.nom}`
  const superieur = admin.role === 'admin-superieur'

  // Les deux actions qui visent un compte existant partagent leurs garde-fous.
  let actuelles: SectionAdmin[] = []
  if (body.action === 'revoquer' || body.action === 'droits') {
    if (!body.id) throw createError({ statusCode: 422, statusMessage: 'Compte non précisé' })
    if (body.id === admin.id) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Vous ne pouvez pas modifier ni révoquer votre propre compte.',
      })
    }
    if (!superieur) {
      const cible = await trouverUtilisateur(body.id)
      if (cible?.role === 'admin-superieur') {
        throw createError({
          statusCode: 403,
          statusMessage: 'Seul un administrateur supérieur peut agir sur un administrateur supérieur.',
        })
      }
      actuelles = cible?.sectionsAutorisees ?? []
    }
  }

  // Seuls les ajouts sont un octroi. Une section que le compte détient déjà
  // et garde n'en est pas un ; en retirer une reste permis, comme révoquer le
  // compte entier : c'est le geste de défense.
  if (body.action !== 'revoquer' && !superieur) {
    const ajoutees = sections.filter((s) => !actuelles.includes(s))
    if (ajoutees.some((s) => RESERVEES.includes(s)) || body.superieur) {
      throw createError({
        statusCode: 403,
        statusMessage:
          'Seul un administrateur supérieur peut accorder les transactions, le référencement avancé ou son propre rang.',
      })
    }
    const siennes = admin.sectionsAutorisees ?? []
    if (ajoutees.some((s) => !siennes.includes(s))) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Vous ne pouvez accorder que des sections que vous détenez vous-même.',
      })
    }
  }

  if (body.action === 'revoquer') {
    await revoquerCompteAdmin(body.id!)
    await enregistrerJournal(auteur, 'a révoqué un compte d’administration', body.id!)
    return { ok: true }
  }

  if (body.action === 'droits') {
    const compte = await majSectionsAdmin(body.id!, sections)
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
