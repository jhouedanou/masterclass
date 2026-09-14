import {
  compterTentativesVerification,
  enregistrerTentativeVerification,
  FENETRE_VERIFICATION_MINUTES,
  trouverCertificat,
} from '../../database/commerce'
import { adresseAppelant } from '../../utils/reseau'

/**
 * Vérification publique d'une attestation par son numéro : la cible du QR code
 * imprimé sur le document, et de la saisie manuelle de /verifier.
 *
 * Elle ne renvoie que ce que la page affiche. L'attestation complète — dont
 * l'identifiant de l'apprenant et celui du module — reste derrière
 * `/api/certificats/[numero]`, qui exige une session : un vérificateur n'a pas
 * à savoir quel compte a suivi quel module, seulement que le document qu'il a
 * sous les yeux est authentique.
 *
 * Les numéros sont tirés d'une séquence (`…000128` puis `…000129`) : qui en
 * connaît un les devine tous. Sans le comptage ci-dessous, le nom de chaque
 * apprenant se récolterait un par un.
 */

/** Numéros manqués tolérés sur la fenêtre : un vérificateur légitime lit un
 *  numéro qu'il a sous les yeux, un balayeur tombe presque toujours à côté. */
const MANQUEES_MAX = 10

/** Plafond absolu, qui vaut aussi pour des numéros tous valables. */
const TOTAL_MAX = 60

/** Forme imprimée sur le document : un numéro mal formé ne coûte pas une
 *  lecture en base, ni une ligne de comptage. */
const FORMAT = /^EMBF-[A-Z]{3}-\d{4}-\d{6}$/

export default defineEventHandler(async (event) => {
  // Jamais de mise en cache : la réponse dépend de l'appelant, et une
  // attestation révoquée ne doit pas être resservie valable.
  setResponseHeader(event, 'cache-control', 'no-store')

  const numero = (getRouterParam(event, 'numero') ?? '').replace(/\s+/g, '').toUpperCase()
  if (!FORMAT.test(numero)) {
    throw createError({ statusCode: 404, statusMessage: 'Attestation introuvable' })
  }

  const ip = adresseAppelant(event)

  const { total, manquees } = await compterTentativesVerification(ip)
  if (manquees >= MANQUEES_MAX || total >= TOTAL_MAX) {
    throw createError({
      statusCode: 429,
      statusMessage: `Trop de vérifications depuis cette adresse. Réessayez dans ${FENETRE_VERIFICATION_MINUTES} minutes.`,
    })
  }

  const certificat = await trouverCertificat(numero)
  await enregistrerTentativeVerification(ip, numero, certificat !== null)

  if (!certificat) {
    throw createError({ statusCode: 404, statusMessage: 'Attestation introuvable' })
  }

  return {
    numero: certificat.numero,
    prenomNom: certificat.prenomNom,
    titreModule: certificat.titreModule,
    programme: certificat.programme,
    thematique: certificat.thematique,
    formateur: certificat.formateur,
    dateDelivrance: certificat.dateDelivrance,
    // Le motif de la révocation reste interne : la page dit qu'elle n'est plus
    // valable, pas pourquoi.
    revoqueLe: certificat.revoqueLe ?? null,
  }
})
