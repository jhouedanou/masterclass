import { calculerCompletionProfil } from '#shared/utils/profil'
import { libellesPaires, libellesReferentiel, separerCles } from '#shared/utils/referentiels'
import { listerModules } from '../../database/catalogue'
import { listerDemandesCoachingPrive } from '../../database/coaching'
import { listerCertificats, listerTransactions } from '../../database/commerce'
import { listerAcces, listerPersonas, listerUtilisateurs } from '../../database/comptes'
import { listerReferentiels } from '../../database/referentiels'
import { exigerAdmin } from '../../utils/session'

export default defineEventHandler(async (event) => {
  await exigerAdmin(event)
  const { programme, profil, coaching, acces: filtreAcces } = getQuery(event) as Record<
    string,
    string | undefined
  >

  const [utilisateurs, acces, modules, certificats, personas, transactions, referentiels, demandes] =
    await Promise.all([
      listerUtilisateurs(),
      listerAcces(),
      listerModules(),
      listerCertificats(),
      listerPersonas(),
      listerTransactions(),
      listerReferentiels(),
      listerDemandesCoachingPrive(),
    ])

  return utilisateurs
    .filter((u) => u.role === 'apprenant')
    .map((u) => {
      // Un accès révoqué ne compte plus : ni dans les modules acquis, ni dans
      // la progression, ni dans le programme qui sert à filtrer.
      const siens = acces.filter((a) => a.utilisateurId === u.id && !a.revoqueLe)
      const revoques = acces.filter((a) => a.utilisateurId === u.id && a.revoqueLe)
      const modulesAcquis = siens
        .map((a) => {
          const m = modules.find((x) => x.id === a.moduleId)
          return m && { module: m, acces: a }
        })
        .filter((x): x is NonNullable<typeof x> => !!x)
      const persona = personas[u.id] ?? null

      // Le programme de référence est celui des modules possédés : il décide du
      // jeu de champs attendu, donc du pourcentage.
      const programmeDeReference = modulesAcquis[0]?.module.programme ?? null
      const { pourcentage } = calculerCompletionProfil(u, persona, programmeDeReference)

      const chapitresVus = siens.length
        ? modulesAcquis.reduce(
            (somme, { module: m, acces: a }) =>
              somme + Math.round((a.progression / 100) * m.chapitres.length),
            0,
          )
        : 0
      const chapitresTotal = modulesAcquis.reduce((somme, { module: m }) => somme + m.chapitres.length, 0)
      const siennesDemandes = demandes.filter((d) => d.utilisateurId === u.id)

      return {
        id: u.id,
        nom: `${u.prenom} ${u.nom}`,
        email: u.email,
        whatsapp: u.whatsapp ?? '',
        pays: u.pays ?? '',
        ficheCompletee: u.ficheCompletee === true,
        inscritLe: u.creeLe ?? null,
        // Le profil doit être à 100 % pour rejoindre une session de coaching.
        // Le calcul est celui que voit l'apprenant lui-même : deux chiffres
        // différents pour la même fiche seraient ingérables au support.
        profilPourcent: pourcentage,
        modulesAcquis: modulesAcquis.map(({ module: m, acces: a }) => ({
          id: m.id,
          titre: m.titre,
          programme: m.programme,
          origine: a.origine,
          acheteLe: a.acheteLe,
          progression: a.progression,
        })),
        accesRevoques: revoques.map((a) => ({
          moduleId: a.moduleId,
          titre: modules.find((m) => m.id === a.moduleId)?.titre ?? '—',
          revoqueLe: a.revoqueLe ?? null,
          motif: a.motifRevocation ?? '',
        })),
        chapitresVus,
        chapitresTotal,
        coachingPrive: siennesDemandes.map((d) => ({
          id: d.id,
          statut: d.statut,
          recueLe: d.recueLe,
          heures: d.heures,
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
          audience: libellesPaires(persona.audience, referentiels),
          clients: separerCles(persona.clients).join(', '),
        },
        montantPaye: transactions
          .filter((t) => t.utilisateurId === u.id && t.statut === 'reussie')
          .reduce((somme, t) => somme + t.montant, 0),
      }
    })
    .filter((a) => !programme || a.modulesAcquis.some((m) => m.programme === programme))
    .filter((a) => !profil || (profil === 'complet' ? a.profilPourcent === 100 : a.profilPourcent < 100))
    .filter((a) => !coaching || (coaching === 'oui' ? a.coachingPrive.length > 0 : a.coachingPrive.length === 0))
    .filter((a) =>
      !filtreAcces ||
      (filtreAcces === 'attribution'
        ? a.modulesAcquis.some((m) => m.origine === 'attribution')
        : a.modulesAcquis.some((m) => m.origine === 'achat')),
    )
})
