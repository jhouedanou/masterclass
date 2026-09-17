import type { Chapitre, Formateur, Module } from '#shared/types'

/**
 * Projections servies aux routes publiques.
 *
 * `versFormateur` compose l'objet métier complet, coordonnées comprises — le
 * type le dit lui-même : « Coordonnées internes (planche D, écran 02) : jamais
 * publiées sur /formateurs ni sur les fiches modules ». Trois routes non
 * authentifiées les publiaient pourtant telles quelles : `/api/formateurs`,
 * `/api/formateurs/[slug]` et `/api/sessions`, qui joignait l'objet entier pour
 * afficher un nom d'animateur.
 *
 * D'où cette liste blanche. Elle est volontairement écrite champ par champ,
 * plutôt qu'en retranchant `emailPro` et `whatsapp` : un champ interne ajouté
 * demain au type ne doit pas se retrouver publié par défaut.
 */
export type FormateurPublic = Omit<Formateur, 'emailPro' | 'whatsapp' | 'activationCoachingDemandeeLe'>

export function formateurPublic(formateur: Formateur): FormateurPublic {
  return {
    id: formateur.id,
    slug: formateur.slug,
    nom: formateur.nom,
    expertise: formateur.expertise,
    bio: formateur.bio,
    programmePrincipal: formateur.programmePrincipal,
    photo: formateur.photo,
    photoAlt: formateur.photoAlt,
    ficheComplete: formateur.ficheComplete,
    // Le tarif horaire est affiché sur /formateurs : c'est le prix public du
    // coaching privé, pas une donnée interne.
    coachingPriveFcfaHeure: formateur.coachingPriveFcfaHeure,
    position: formateur.position,
    coachingPriveActif: formateur.coachingPriveActif,
    seo: formateur.seo,
  }
}

/**
 * Un module tel qu'une page publique en a besoin.
 *
 * `versModule` recopie chaque chapitre entier, `script` compris — la
 * transcription de la vidéo, ligne à ligne. `/api/modules` renvoyait `{ ...m }`
 * à tout visiteur, et la page d'accueil l'appelle pour lire deux champs :
 * `programme` et `thematiqueId`. Le catalogue entier voyageait avec ses
 * transcriptions à chaque visite.
 *
 * Le tableau `chapitres` reste là — les vues en comptent les éléments — mais
 * allégé de la transcription et de la comptabilité de téléversement, qui ne
 * regardent que l'éditeur du back-office.
 */
export type ChapitrePublic = Omit<
  Chapitre,
  'script' | 'videoNomFichier' | 'videoTailleOctets' | 'videoImporteeLe' | 'scriptNomFichier' | 'scriptImporteLe'
>

export type ModulePublic = Omit<Module, 'chapitres'> & { chapitres: ChapitrePublic[] }

export function modulePublic(module: Module): ModulePublic {
  return {
    ...module,
    chapitres: module.chapitres.map((c) => ({
      libelle: c.libelle,
      titre: c.titre,
      dureeMinutes: c.dureeMinutes,
      videoCle: c.videoCle,
      videoDureeSecondes: c.videoDureeSecondes,
      videoFormat: c.videoFormat,
      scriptFormat: c.scriptFormat,
    })),
  }
}
