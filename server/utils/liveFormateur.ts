import type { Utilisateur } from '#shared/types'
import { DELAIS_LIVE } from '#shared/utils/live'
import { listerModules, listerThematiques } from '../database/catalogue'
import { listerComptesAdmin } from '../database/comptes'
import { liensZoomLive, listerSessionsLive } from '../database/live'
import { etatFormateur, liveVisiblePour, visibiliteLive } from './live'

/**
 * Onglet « Live Sessions » de l'espace formateur (planche 08, CDC §4.4) : ses
 * sessions seulement (RM12), sans nombre d'inscrits (RM13). Lecture seule sur
 * la date et le lien ; le lien hôte n'apparaît qu'à partir de H-30. Une
 * session dont la vidéo est publiée sort de la liste : le module est alors
 * dans « Mes modules ».
 */
export async function sessionsLiveFormateur(utilisateur: Utilisateur, maintenant = Date.now()) {
  if (!utilisateur.formateurId || !liveVisiblePour(await visibiliteLive(), utilisateur)) return []
  const [sessions, modules, thematiques, admins] = await Promise.all([
    listerSessionsLive({ formateurId: utilisateur.formateurId, statuts: ['publiee', 'en-cours', 'terminee', 'annulee'] }),
    listerModules(),
    listerThematiques(),
    listerComptesAdmin(),
  ])
  const lignes = await Promise.all(
    sessions.map(async (session) => {
      const module = modules.find((m) => m.id === session.moduleId)
      if (!module) return null
      const etat = etatFormateur(session, module, maintenant)
      if (!etat) return null
      const animer = etat === 'aujourdhui' && session.statut !== 'terminee'
      const moderateur = admins.find((a) => a.id === session.moderateurId)
      return {
        id: session.id,
        slug: session.slug,
        etat,
        debut: session.debut,
        dureeMinutes: session.dureeMinutes,
        module: {
          titre: module.titre,
          programme: module.programme,
          thematique: thematiques.find((t) => t.id === module.thematiqueId)?.nom ?? '',
        },
        moderateur: moderateur ? `${moderateur.prenom} ${moderateur.nom}` : 'équipe Big Five',
        preparation: {
          derouleValide: Boolean(session.derouleValideLe),
          support: session.supportNom,
          testTechniqueLe: session.testTechniqueLe,
        },
        deroule: session.deroule,
        animerActif: animer,
        animerA: new Date(new Date(session.debut).getTime() - DELAIS_LIVE.animerMinutes * 60_000).toISOString(),
        // Lien hôte de secours, si la salle intégrée ne s'ouvre pas (§4.4).
        lienHote: animer ? (await liensZoomLive(session.id)).lienHote : null,
      }
    }),
  )
  return lignes
    .filter((l): l is NonNullable<typeof l> => l !== null)
    .sort((a, b) => {
      const rang = (l: typeof a) => (l.etat === 'aujourdhui' ? 0 : l.etat === 'planifiee' ? 1 : l.etat === 'terminee' ? 2 : 3)
      return rang(a) - rang(b) || (rang(a) < 2 ? a.debut.localeCompare(b.debut) : b.debut.localeCompare(a.debut))
    })
}
