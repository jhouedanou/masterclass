import { listerFormateurs, listerModules } from '../../../database/catalogue'
import {
  listerDemandesCoachingPriveUtilisateur,
  listerHistoriqueCoachingPrive,
  listerNotesUtilisateur,
} from '../../../database/coaching'
import { listerAccesUtilisateur } from '../../../database/comptes'
import { exigerUtilisateur } from '../../../utils/session'

/**
 * Coaching privé côté apprenant (planche B, écrans 06 et 10) : ses demandes
 * avec leur suivi daté, et de quoi en formuler une nouvelle — les modules
 * qu'il possède et les formateurs dont le coaching privé est activé.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)

  const [demandes, modules, formateurs, acces, notes] = await Promise.all([
    listerDemandesCoachingPriveUtilisateur(utilisateur.id),
    listerModules(),
    listerFormateurs(),
    listerAccesUtilisateur(utilisateur.id),
    listerNotesUtilisateur(utilisateur.id),
  ])
  const historique = await listerHistoriqueCoachingPrive(demandes.map((d) => d.id))
  const possedes = new Set(acces.map((a) => a.moduleId))

  return {
    demandes: demandes.map((d) => {
      const formateur = formateurs.find((f) => f.id === d.formateurId) ?? null
      return {
        ...d,
        module: modules.find((m) => m.id === d.moduleId)?.titre ?? '—',
        formateur: formateur ? { id: formateur.id, nom: formateur.nom, photo: formateur.photo } : null,
        montant: d.heures * (formateur?.coachingPriveFcfaHeure ?? 0),
        historique: historique.filter((h) => h.demandeId === d.id),
        // Une séance réalisée se note une fois : la note privée déposée pour
        // ce formateur après la réception de la demande compte.
        notee: notes.some(
          (n) => n.origine === 'privee' && n.formateurId === d.formateurId && n.date >= d.recueLe,
        ),
      }
    }),
    formateursDisponibles: formateurs
      .filter((f) => f.coachingPriveActif && f.ficheComplete)
      .map((f) => ({
        id: f.id,
        nom: f.nom,
        expertise: f.expertise,
        photo: f.photo,
        tarifHeure: f.coachingPriveFcfaHeure,
      })),
    modulesPossedes: modules
      .filter((m) => possedes.has(m.id))
      .map((m) => ({ id: m.id, titre: m.titre, formateurId: m.formateurId, programme: m.programme })),
  }
})
