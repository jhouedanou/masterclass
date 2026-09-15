import { libellesReferentiel } from '#shared/utils/referentiels'
import { listerModules } from '../../database/catalogue'
import { listerCertificats, listerTransactions } from '../../database/commerce'
import { listerAcces, listerPersonas, listerUtilisateurs } from '../../database/comptes'
import { listerReferentiels } from '../../database/referentiels'
import { exigerAdmin } from '../../utils/session'

/** Champs attendus d'une fiche apprenant complète — le pourcentage affiché est
 *  la part réellement renseignée, non une estimation. */
const CHAMPS_FICHE = 7

export default defineEventHandler(async (event) => {
  await exigerAdmin(event)
  const { programme, profil } = getQuery(event) as Record<string, string | undefined>

  const [utilisateurs, acces, modules, certificats, personas, transactions, referentiels] = await Promise.all([
    listerUtilisateurs(),
    listerAcces(),
    listerModules(),
    listerCertificats(),
    listerPersonas(),
    listerTransactions(),
    listerReferentiels(),
  ])

  return utilisateurs
    .filter((u) => u.role === 'apprenant')
    .map((u) => {
      const siens = acces.filter((a) => a.utilisateurId === u.id)
      const modulesAcquis = siens
        .map((a) => modules.find((m) => m.id === a.moduleId))
        .filter((m): m is NonNullable<typeof m> => !!m)
      const persona = personas[u.id] ?? null

      const renseignes = [
        u.whatsapp,
        u.pays,
        persona?.age,
        persona?.secteur,
        persona?.experience,
        persona?.reseaux,
        persona?.objectif,
      ].filter((valeur) => valeur !== undefined && valeur !== null && valeur !== '').length

      return {
        id: u.id,
        nom: `${u.prenom} ${u.nom}`,
        email: u.email,
        whatsapp: u.whatsapp ?? '',
        pays: u.pays ?? '',
        ficheCompletee: u.ficheCompletee === true,
        // Le profil doit être à 100 % pour rejoindre une session de coaching.
        profilPourcent: Math.round((renseignes / CHAMPS_FICHE) * 100),
        modulesAcquis: modulesAcquis.map((m) => ({
          id: m.id,
          titre: m.titre,
          programme: m.programme,
        })),
        progression: siens.length
          ? Math.round(siens.reduce((somme, a) => somme + a.progression, 0) / siens.length)
          : 0,
        // La liste, et non plus le seul compte : la fiche porte l'action de
        // révocation, qui a besoin du numéro et de l'état de chaque attestation.
        certificats: certificats
          .filter((c) => c.utilisateurId === u.id)
          .map((c) => ({
            numero: c.numero,
            titreModule: c.titreModule,
            dateDelivrance: c.dateDelivrance,
            revoqueLe: c.revoqueLe ?? null,
            motifRevocation: c.motifRevocation ?? null,
          })),
        // Les champs à choix multiple stockent des clés : la fiche du back-office
        // les affiche telles quelles, on les traduit avant de les lui remettre.
        persona: persona && {
          ...persona,
          reseaux: libellesReferentiel(persona.reseaux, referentiels),
          outils: libellesReferentiel(persona.outils, referentiels),
          canaux: libellesReferentiel(persona.canaux, referentiels),
          presenceEnLigne: libellesReferentiel(persona.presenceEnLigne, referentiels),
        },
        montantPaye: transactions
          .filter((t) => t.utilisateurId === u.id && t.statut === 'reussie')
          .reduce((somme, t) => somme + t.montant, 0),
      }
    })
    .filter((a) => !programme || a.modulesAcquis.some((m) => m.programme === programme))
    .filter((a) => !profil || (profil === 'complet' ? a.profilPourcent === 100 : a.profilPourcent < 100))
})
