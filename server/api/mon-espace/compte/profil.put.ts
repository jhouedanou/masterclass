import type { Persona } from '#shared/types'
import { cleValide, separerCles, separerPaires } from '#shared/utils/referentiels'
import { validerTelephone } from '#shared/utils/telephone'
import { majPersona, majProfilUtilisateur } from '../../../database/comptes'
import { exigerUtilisateur } from '../../../utils/session'

/** Les champs dont la valeur est une liste de clés de référentiel. */
const CHAMPS_REFERENTIEL = ['reseaux', 'outils', 'canaux', 'presenceEnLigne'] as const

const LIBELLES_REFERENTIEL: Record<(typeof CHAMPS_REFERENTIEL)[number], string> = {
  reseaux: 'Réseaux gérés',
  outils: 'Outils utilisés',
  canaux: 'Canaux de vente actuels',
  presenceEnLigne: 'Présence en ligne existante',
}

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

  // Les quatre champs à choix multiple ne portent que des clés de référentiel.
  // Le contrôle s'arrête à la forme de la clé, sans consulter la table : une
  // fiche enregistrée avant qu'une entrée ne soit retirée doit rester
  // enregistrable telle quelle, même si son propriétaire n'y a pas touché.
  for (const champ of CHAMPS_REFERENTIEL) {
    const valeur = body.persona?.[champ]
    if (valeur && !separerCles(valeur).every(cleValide)) {
      throw createError({
        statusCode: 422,
        statusMessage: `Valeur non reconnue pour « ${LIBELLES_REFERENTIEL[champ]} »`,
      })
    }
  }

  // La taille d'audience porte des paires `reseau:tranche` : les deux moitiés
  // sont des clés de référentiel. Un segment mal formé est ignoré par
  // `separerPaires`, donc on compare les comptes pour ne rien laisser passer en
  // silence.
  const audience = body.persona?.audience
  if (audience) {
    const paires = Object.entries(separerPaires(audience))
    const malForme =
      paires.length !== separerCles(audience).length ||
      paires.some(([reseau, tranche]) => !cleValide(reseau) || !cleValide(tranche))
    if (malForme) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Valeur non reconnue pour « Taille d’audience »',
      })
    }
  }

  // « Clients / marques » reste en saisie libre — ce sont des noms propres à
  // chaque apprenant, aucun référentiel ne peut les couvrir. Seule la forme est
  // tenue : des valeurs courtes, en nombre borné.
  const clients = separerCles(body.persona?.clients)
  if (clients.length > 12 || clients.some((c) => c.length > 60)) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Clients / marques : 12 entrées au maximum, 60 caractères chacune',
    })
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
