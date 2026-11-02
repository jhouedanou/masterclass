import { listerThematiques, trouverFormateur, trouverModule, trouverProgramme } from '../../../database/catalogue'
import { trouverAcces } from '../../../database/comptes'
import { compterPlacesLive, trouverInscriptionLive, trouverSessionLiveParSlug } from '../../../database/live'
import { etatInscriptions, exigerLiveVisible, sessionLivePublique } from '../../../utils/live'

/**
 * Fiche Live Session (planche 03, CDC §5.2) : 404 sur un brouillon ou une
 * session annulée. `inscriptionsOuvertes`, `complet` et `dejaInscrit` pilotent
 * le bouton ; le nombre d'inscrits n'est jamais exposé (RM13).
 */
export default defineEventHandler(async (event) => {
  const { utilisateur } = await exigerLiveVisible(event)
  const session = await trouverSessionLiveParSlug(getRouterParam(event, 'slug') ?? '')
  if (!session || session.statut === 'brouillon' || session.statut === 'annulee') {
    throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable' })
  }
  const module = await trouverModule(session.moduleId)
  if (!module) throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable' })
  // Une fois la vidéo publiée, la session n'est plus affichée côté public (§4.2) :
  // la fiche renvoie vers le module.
  if (module.statut === 'disponible') {
    return { redirection: `/modules/${module.slug}` }
  }

  const [formateur, programme, thematiques, places, inscription, acces] = await Promise.all([
    trouverFormateur(session.formateurId),
    trouverProgramme(module.programme),
    listerThematiques(),
    compterPlacesLive([session.id]),
    utilisateur ? trouverInscriptionLive(session.id, utilisateur.id) : null,
    utilisateur ? trouverAcces(utilisateur.id, module.id) : null,
  ])
  const prises = places.get(session.id)
  const etat = etatInscriptions(session, (prises?.confirmees ?? 0) + (prises?.reservees ?? 0))

  return {
    redirection: null,
    session: {
      ...sessionLivePublique(session, module, formateur),
      formateur: formateur
        ? {
            nom: formateur.nom,
            slug: formateur.slug,
            expertise: formateur.expertise,
            bio: formateur.bio,
            photo: formateur.photo,
            photoAlt: formateur.photoAlt,
          }
        : null,
    },
    programme: programme ? { slug: programme.slug, nom: programme.nom, couleur: programme.couleur } : null,
    thematique: thematiques.find((t) => t.id === module.thematiqueId)?.nom ?? null,
    inscriptionsOuvertes: etat.ouvertes,
    complet: etat.complet,
    closes: etat.closes,
    dejaInscrit: inscription?.statut === 'confirmee' || Boolean(acces && !acces.revoqueLe),
    paiementEnCours: inscription?.statut === 'a-rembourser',
  }
})
