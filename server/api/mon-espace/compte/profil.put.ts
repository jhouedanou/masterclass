import type { Persona } from '#shared/types'
import { majPersona, majProfilUtilisateur } from '../../../database/comptes'
import { exigerUtilisateur } from '../../../utils/session'

/**
 * Fiche apprenant (planche B, écran 04) : identité et contexte transmis au
 * formateur avant une session. Le pays a été saisi à la création du compte ;
 * l'e-mail se change à part, avec le mot de passe.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const body = await readBody<{
    prenom?: string
    nom?: string
    whatsapp?: string
    pays?: string
    persona?: Persona
  }>(event)

  const prenom = (body.prenom ?? '').trim()
  const nom = (body.nom ?? '').trim()
  if (!prenom || !nom) {
    throw createError({ statusCode: 422, statusMessage: 'Prénom et nom sont obligatoires' })
  }

  const age = body.persona?.age ? Number(body.persona.age) : undefined
  if (age !== undefined && (!Number.isInteger(age) || age < 12 || age > 120)) {
    throw createError({ statusCode: 422, statusMessage: 'Âge invalide' })
  }

  const compte = await majProfilUtilisateur(utilisateur.id, {
    prenom,
    nom,
    whatsapp: body.whatsapp?.trim() || undefined,
    pays: body.pays?.trim() || utilisateur.pays,
  })
  const persona = await majPersona(utilisateur.id, { ...body.persona, age })

  return { utilisateur: { ...compte, ficheCompletee: Boolean(persona.secteur && persona.objectif) }, persona }
})
