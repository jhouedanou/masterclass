import { enregistrerJournal } from '../../../database/administration'
import { trouverModule } from '../../../database/catalogue'
import { creerSessionLive, slugLibre } from '../../../database/live'
import { lireSaisieSessionLive } from '../../../utils/liveAdmin'
import { exigerSection } from '../../../utils/session'

/**
 * Création d'une Live Session en brouillon (planche 07, « Enregistrer en
 * brouillon »). Formateur prérempli avec celui du module (RM12), prérequis
 * et gains repris du module tant que l'admin n'en saisit pas d'autres.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'live-sessions')
  const saisie = lireSaisieSessionLive(await readBody<Record<string, unknown>>(event))
  const module = saisie.moduleId ? await trouverModule(saisie.moduleId) : null
  if (!module) throw createError({ statusCode: 422, statusMessage: 'Choisissez le module concerné' })
  if (module.statut === 'disponible') {
    throw createError({ statusCode: 409, statusMessage: 'Ce module est déjà disponible en vidéo' })
  }
  if (!saisie.debut) throw createError({ statusCode: 422, statusMessage: 'Date et heure (GMT) obligatoires' })
  if (!saisie.capacite) {
    throw createError({ statusCode: 422, statusMessage: 'Capacité obligatoire : nombre de participants de la licence Zoom' })
  }

  const session = await creerSessionLive({
    moduleId: module.id,
    slug: await slugLibre(`${module.slug}-${saisie.debut.slice(0, 10)}`),
    debut: saisie.debut,
    dureeMinutes: saisie.dureeMinutes ?? 90,
    capacite: saisie.capacite,
    formateurId: saisie.formateurId || module.formateurId,
    moderateurId: saisie.moderateurId ?? null,
    prerequis: saisie.prerequis ?? (module.prerequis ? [module.prerequis] : []),
    gains: saisie.gains ?? module.acquis,
    deroule: saisie.deroule ?? [],
    zoom: {
      reunionId: saisie.zoomReunionId ?? null,
      motDePasse: saisie.zoomMotDePasse ?? null,
      lienParticipation: saisie.zoomLienParticipation ?? null,
      lienHote: saisie.zoomLienHote ?? null,
    },
  })
  await enregistrerJournal(`${admin.prenom} ${admin.nom}`, 'a créé une Live Session (brouillon)', `${module.titre} — ${session.debut}`, {
    type: 'session',
    objet: 'live-session',
  })
  return session
})
