import { listerFormateurs, listerModules, listerThematiques } from '../../../database/catalogue'
import {
  listerInscriptionsUtilisateur,
  listerInscritsSession,
  trouverDemandeCoachingPrive,
  trouverSession,
} from '../../../database/coaching'
import { listerRessources } from '../../../database/backoffice'
import { exigerUtilisateur } from '../../../utils/session'
import { debutSession, salleOuverte } from '../../../utils/zoom'

/** Salle d'une session collective (planche B, écran 11) : en-tête, modules couverts, participants, ressources. */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const id = getRouterParam(event, 'id') ?? ''

  // Séance de coaching privé : `prive-<demande>`.
  if (id.startsWith('prive-')) {
    const demande = await trouverDemandeCoachingPrive(id.slice('prive-'.length))
    if (!demande) throw createError({ statusCode: 404, statusMessage: 'Séance introuvable' })
    const hoteP = utilisateur.role === 'formateur' && utilisateur.formateurId === demande.formateurId
    const adminP = utilisateur.role === 'admin-contenu' || utilisateur.role === 'admin-superieur'
    if (!hoteP && !adminP && demande.utilisateurId !== utilisateur.id) {
      throw createError({ statusCode: 403, statusMessage: 'Cette séance ne vous concerne pas' })
    }
    const [formateursP, modulesP] = await Promise.all([listerFormateurs(), listerModules()])
    const module = modulesP.find((m) => m.id === demande.moduleId)
    const ressourcesP = module ? await listerRessources(module.id) : []
    const debutP = new Date()
    return {
      session: null,
      demande,
      thematique: null,
      formateur: formateursP.find((f) => f.id === demande.formateurId) ?? null,
      modulesCouverts: module ? [{ id: module.id, numero: module.numero, titre: module.titre, slug: module.slug }] : [],
      participants: [{ id: demande.utilisateurId, nom: demande.apprenant }],
      ressources: ressourcesP.map((r) => ({ titre: r.titre, url: r.url, format: r.format })),
      role: hoteP || adminP ? 'hote' : 'participant',
      salle: { ouverte: demande.statut === 'payee', ouverture: debutP.toISOString(), fermeture: new Date(debutP.getTime() + demande.heures * 3_600_000).toISOString(), debut: debutP.toISOString() },
    }
  }

  const session = await trouverSession(id)
  if (!session) throw createError({ statusCode: 404, statusMessage: 'Session introuvable' })

  const hote = utilisateur.role === 'formateur' && utilisateur.formateurId === session.formateurId
  const admin = utilisateur.role === 'admin-contenu' || utilisateur.role === 'admin-superieur'
  if (!hote && !admin) {
    const inscriptions = await listerInscriptionsUtilisateur(utilisateur.id)
    if (!inscriptions.some((i) => i.sessionId === session.id)) {
      throw createError({ statusCode: 403, statusMessage: 'Vous devez avoir réservé votre place pour rejoindre cette session' })
    }
  }

  const [thematiques, formateurs, modules, inscrits] = await Promise.all([
    listerThematiques(),
    listerFormateurs(),
    listerModules(),
    listerInscritsSession(session.id),
  ])
  const couverts = modules.filter((m) => m.thematiqueId === session.thematiqueId && m.statut !== 'brouillon')
  const ressources = (await Promise.all(couverts.map((m) => listerRessources(m.id)))).flat()
  const debut = debutSession(session.date, session.heure)
  const { ouverte, ouverture, fermeture } = salleOuverte(debut, session.dureeMinutes, session.ouvertureSalleMinutes)

  return {
    session,
    demande: null,
    thematique: thematiques.find((t) => t.id === session.thematiqueId) ?? null,
    formateur: formateurs.find((f) => f.id === session.formateurId) ?? null,
    modulesCouverts: couverts.map((m) => ({ id: m.id, numero: m.numero, titre: m.titre, slug: m.slug })),
    participants: inscrits.map((u) => ({ id: u.id, nom: `${u.prenom} ${u.nom[0] ?? ''}.` })),
    ressources: ressources.map((r) => ({ titre: r.titre, url: r.url, format: r.format })),
    role: hote || admin ? 'hote' : 'participant',
    salle: { ouverte, ouverture: ouverture.toISOString(), fermeture: fermeture.toISOString(), debut: debut.toISOString() },
  }
})
