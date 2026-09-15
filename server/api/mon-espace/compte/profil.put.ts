import type { Persona } from '#shared/types'
import { validerTelephone } from '#shared/utils/telephone'
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

  // Le numéro est contrôlé sur la seule enveloppe E.164 (8 à 15 chiffres), pas
  // sur une longueur nationale : les plans de numérotation changent, et un
  // compte enregistré sous l'ancien format du Bénin se verrait sinon refuser
  // l'enregistrement d'une fiche qu'il n'a pas modifiée.
  const whatsapp = body.whatsapp?.trim() || undefined
  if (whatsapp && !validerTelephone(whatsapp)) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Numéro WhatsApp invalide : indicatif du pays suivi du numéro',
    })
  }

  const age = body.persona?.age ? Number(body.persona.age) : undefined
  if (age !== undefined && (!Number.isInteger(age) || age < 12 || age > 120)) {
    throw createError({ statusCode: 422, statusMessage: 'Âge invalide' })
  }

  const compte = await majProfilUtilisateur(utilisateur.id, {
    prenom,
    nom,
    whatsapp,
    pays: body.pays?.trim() || utilisateur.pays,
  })
  const { persona, completion } = await majPersona(utilisateur.id, { ...body.persona, age })

  return {
    utilisateur: { ...compte, ficheCompletee: completion === 100, completionProfil: completion },
    persona,
    completion,
  }
})
