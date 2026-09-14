import { listerRessources } from '../../../database/backoffice'
import {
  listerThematiques,
  trouverFormateur,
  trouverModuleParSlug,
  trouverProgramme,
} from '../../../database/catalogue'
import { listerInscriptionsUtilisateur, listerSessions } from '../../../database/coaching'
import { completionProfil, listerVisionnagesModule, trouverAcces } from '../../../database/comptes'
import { exigerUtilisateur } from '../../../utils/session'

/**
 * Page module de l'espace apprenant (planche B, écran 02) : chapitres avec
 * leur état (vu / en cours — reprise / à voir), session de coaching du
 * module, condition du certificat, ressources. Réservé aux modules acquis.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const slug = getRouterParam(event, 'slug')

  const moduleTrouve = await trouverModuleParSlug(slug ?? '')
  if (!moduleTrouve) {
    throw createError({ statusCode: 404, statusMessage: 'Module introuvable' })
  }

  const ligne = await trouverAcces(utilisateur.id, moduleTrouve.id)
  if (!ligne || ligne.revoqueLe) {
    throw createError({ statusCode: 403, statusMessage: 'Ce module ne fait pas partie de vos accès' })
  }

  const [formateur, thematiques, programme, ressources, visionnages, sessions, inscriptions, completion] =
    await Promise.all([
      trouverFormateur(moduleTrouve.formateurId),
      listerThematiques(),
      trouverProgramme(moduleTrouve.programme),
      listerRessources(moduleTrouve.id),
      listerVisionnagesModule(utilisateur.id, moduleTrouve.id),
      listerSessions(),
      listerInscriptionsUtilisateur(utilisateur.id),
      completionProfil(utilisateur),
    ])

  const chapitres = moduleTrouve.chapitres.map((c, position) => {
    const v = visionnages.find((x) => x.position === position)
    const duree = c.videoDureeSecondes ?? (c.dureeMinutes ?? 0) * 60
    const vu = ligne.progression === 100 || v?.vu === true
    const secondesVues = v?.secondesVues ?? 0
    return {
      position,
      libelle: c.libelle,
      titre: c.titre,
      dureeSecondes: duree,
      etat: vu ? 'vu' : secondesVues > 0 ? 'en-cours' : 'a-voir',
      pourcentage: vu ? 100 : duree ? Math.min(99, Math.round((secondesVues / duree) * 100)) : 0,
      /** Position de reprise, en secondes : le temps déjà vu, plafonné à la durée. */
      repriseSecondes: vu ? 0 : Math.min(secondesVues, duree),
    }
  })
  const chapitresVus = chapitres.filter((c) => c.etat === 'vu').length

  const aujourdHui = new Date().toISOString().slice(0, 10)
  const session =
    sessions.find((s) => s.thematiqueId === moduleTrouve.thematiqueId && s.statut !== 'annulee' && s.date >= aujourdHui) ??
    null

  return {
    module: moduleTrouve,
    acces: ligne,
    formateur,
    thematique: thematiques.find((t) => t.id === moduleTrouve.thematiqueId) ?? null,
    programme,
    chapitres,
    chapitresVus,
    ressources: ressources.map((r) => ({ id: r.id, titre: r.titre, url: r.url, format: r.format })),
    session: session
      ? { ...session, inscrit: inscriptions.some((i) => i.sessionId === session.id) }
      : null,
    completionProfil: completion,
  }
})
