import { interpolerCompteurs, type Compteurs } from '#shared/utils/compteurs'
import type { Chapitre, Formateur, Module, Programme, ProgrammePublic, SeoFields } from '#shared/types'

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

/**
 * Un programme tel qu'une page publique en a besoin : ses textes portent des
 * décomptes, et un décompte n'est juste qu'au moment où il est servi.
 *
 * « Choisissez parmi 9 modules » a été écrit une fois dans la base. Le jour où
 * un module a changé de programme, les deux phrases ont menti sans que rien ne
 * le signale. Les textes gardent donc un jeton — `{modules}`, `{thematiques}` —
 * et c'est ici qu'il devient un nombre, une fois, pour toutes les pages.
 *
 * L'administration passe par ses propres routes : son éditeur continue de voir
 * le jeton, sans quoi le nombre du jour se figerait à la première sauvegarde.
 */
function seoInterpole(seo: SeoFields, compteurs: Compteurs): SeoFields {
  const interpoler = (valeur?: string) =>
    valeur === undefined ? undefined : interpolerCompteurs(valeur, compteurs)
  return {
    ...seo,
    title: interpoler(seo.title),
    metaDescription: interpoler(seo.metaDescription),
    ogTitle: interpoler(seo.ogTitle),
    ogDescription: interpoler(seo.ogDescription),
  }
}

/**
 * Ce qu'un programme pèse réellement, brouillons exclus comme partout sur le
 * public. Les formateurs sont ceux qui interviennent dans le programme, pas
 * ceux qui l'ont pour rattachement principal : c'est le nombre que la page
 * annonce.
 */
export function compteursProgramme(
  slug: string,
  modules: Pick<Module, 'programme' | 'statut' | 'thematiqueId' | 'formateurId'>[],
  thematiques: { programme: string }[],
): Compteurs {
  const siens = modules.filter((m) => m.programme === slug && m.statut !== 'brouillon')
  return {
    modules: siens.length,
    thematiques: thematiques.filter((t) => t.programme === slug).length,
    formateurs: new Set(siens.map((m) => m.formateurId)).size,
  }
}

export function programmePublic(programme: Programme, compteurs: Compteurs): ProgrammePublic {
  const interpoler = (valeur: string) => interpolerCompteurs(valeur, compteurs)
  return {
    ...programme,
    descriptionHero: interpoler(programme.descriptionHero),
    descriptionProgramme: interpoler(programme.descriptionProgramme),
    descriptionCarte: interpoler(programme.descriptionCarte),
    seo: seoInterpole(programme.seo, compteurs),
    nbModules: compteurs.modules ?? 0,
    nbThematiques: compteurs.thematiques ?? 0,
    nbFormateurs: compteurs.formateurs ?? 0,
  }
}
