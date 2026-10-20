import {
  compterTentativesVerification,
  enregistrerTentativeVerification,
  FENETRE_VERIFICATION_MINUTES,
  marquerVerificationTrouvee,
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
 * Les numéros délivrés jusqu'au 20/10/2026 sont tirés d'une séquence
 * (`…000128` puis `…000129`) : qui en connaît un les devine tous. Sans le
 * comptage ci-dessous, le nom de chacun de ces apprenants se récolterait un
 * par un. Les suivants portent un suffixe aléatoire (migration 44).
 *
 * Le comptage est atomique : la consultation est inscrite, comme manquée,
 * **avant** d'être comptée, puis marquée trouvée si le numéro existe. Compter
 * d'abord laissait une rafale de requêtes simultanées lire toutes le même
 * compte, sous le plafond, et passer d'un bloc.
 */

/** Numéros manqués tolérés sur la fenêtre : un vérificateur légitime lit un
 *  numéro qu'il a sous les yeux, un balayeur tombe presque toujours à côté. */
const MANQUEES_MAX = 10

/** Plafond absolu, qui vaut aussi pour des numéros tous valables. */
const TOTAL_MAX = 60

/** Forme imprimée sur le document, avec ou sans le suffixe aléatoire : un
 *  numéro mal formé ne coûte pas une lecture en base, ni une ligne de comptage. */
const FORMAT = /^EMBF-[A-Z]{3}-\d{4}-\d{6}(-[0-9A-F]{8})?$/

export default defineEventHandler(async (event) => {
  // Jamais de mise en cache : la réponse dépend de l'appelant, et une
  // attestation révoquée ne doit pas être resservie valable.
  setResponseHeader(event, 'cache-control', 'no-store')

  const numero = (getRouterParam(event, 'numero') ?? '').replace(/\s+/g, '').toUpperCase()
  if (!FORMAT.test(numero)) {
    throw createError({ statusCode: 404, statusMessage: 'Attestation introuvable' })
  }

  const ip = adresseAppelant(event)

  const consultation = await enregistrerTentativeVerification(ip, numero, false)
  // La consultation en cours est comptée : d'où les `>` là où l'on comparait
  // à l'avance avec `>=`. Elle reste inscrite même refusée.
  const { total, manquees } = await compterTentativesVerification(ip)
  if (manquees > MANQUEES_MAX || total > TOTAL_MAX) {
    throw createError({
      statusCode: 429,
      statusMessage: `Trop de vérifications depuis cette adresse. Réessayez dans ${FENETRE_VERIFICATION_MINUTES} minutes.`,
    })
  }

  const certificat = await trouverCertificat(numero)
  if (certificat) await marquerVerificationTrouvee(consultation)

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
