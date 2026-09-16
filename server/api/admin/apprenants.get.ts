import { calculerCompletionProfil } from '#shared/utils/profil'
import { libellesPaires, libellesReferentiel, separerCles } from '#shared/utils/referentiels'
import { listerFormateurs, listerModules, listerPhases, listerThematiques } from '../../database/catalogue'
import { listerDemandesCoachingPrive } from '../../database/coaching'
import { listerCertificats, listerTransactions } from '../../database/commerce'
import { listerAcces, listerPersonas, listerUtilisateurs } from '../../database/comptes'
import { listerReferentiels } from '../../database/referentiels'
import { exigerAdmin } from '../../utils/session'

/**
 * Liste des apprenants et méga-filtre de l'écran 04.
 *
 * La maquette annonce treize dimensions de filtrage. Onze sont servies ici.
 * Les deux autres ne le sont pas, faute de données dans cette lecture :
 *   - « Chapitre » demanderait les visionnages, chapitre par chapitre ;
 *   - « Session » demanderait les inscriptions aux sessions de coaching.
 * Elles sont annoncées comme indisponibles côté écran plutôt que proposées
 * en pure forme.
 */
export default defineEventHandler(async (event) => {
  await exigerAdmin(event)
  const f = getQuery(event) as Record<string, string | undefined>

  const [
    utilisateurs, acces, modules, certificats, personas, transactions, referentiels, demandes,
    thematiques, phases, formateurs,
  ] = await Promise.all([
      listerUtilisateurs(),
      listerAcces(),
      listerModules(),
      listerCertificats(),
      listerPersonas(),
      listerTransactions(),
      listerReferentiels(),
      listerDemandesCoachingPrive(),
      listerThematiques(),
      listerPhases(),
      listerFormateurs(),
    ])

  const apprenants = utilisateurs
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
          // Thématique, phase et formateur servent le méga-filtre (écran 04).
          thematiqueId: m.thematiqueId,
          phaseId: thematiques.find((t) => t.id === m.thematiqueId)?.phaseId ?? null,
          formateurId: m.formateurId,
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
        ville: persona?.ville ?? '',
        secteur: persona?.secteur ?? '',
      }
    })
    .filter((a) => !f.programme || a.modulesAcquis.some((m) => m.programme === f.programme))
    .filter((a) => !f.module || a.modulesAcquis.some((m) => m.id === f.module))
    .filter((a) => !f.thematique || a.modulesAcquis.some((m) => m.thematiqueId === f.thematique))
    .filter((a) => !f.phase || a.modulesAcquis.some((m) => m.phaseId === f.phase))
    .filter((a) => !f.formateur || a.modulesAcquis.some((m) => m.formateurId === f.formateur))
    .filter((a) => !f.profil || (f.profil === 'complet' ? a.profilPourcent === 100 : a.profilPourcent < 100))
    .filter((a) => !f.coaching || (f.coaching === 'oui' ? a.coachingPrive.length > 0 : a.coachingPrive.length === 0))
    .filter((a) =>
      !f.acces ||
      (f.acces === 'attribution'
        ? a.modulesAcquis.some((m) => m.origine === 'attribution')
        : a.modulesAcquis.some((m) => m.origine === 'achat')),
    )
    // « Progression » : trois tranches, comme les pastilles de l'écran.
    .filter((a) =>
      !f.progression ||
      (f.progression === 'terminee'
        ? a.progression === 100
        : f.progression === 'encours'
          ? a.progression > 0 && a.progression < 100
          : a.progression === 0),
    )
    .filter((a) => !f.certificat || (f.certificat === 'oui' ? a.certificats.length > 0 : a.certificats.length === 0))
    .filter((a) => !f.paiement || (f.paiement === 'oui' ? a.montantPaye > 0 : a.montantPaye === 0))
    .filter((a) => !f.localisation || a.pays === f.localisation || a.ville === f.localisation)
    .filter((a) => !f.secteur || a.secteur === f.secteur)
    // « Période » : inscrits depuis N jours.
    .filter((a) => {
      const jours = Number(f.periode)
      if (!jours || !a.inscritLe) return !f.periode
      return Date.now() - new Date(a.inscritLe).getTime() <= jours * 86_400_000
    })

  /**
   * Les listes servent à peupler le méga-filtre : sans elles l'écran ne
   * saurait pas quelles phases, thématiques, modules ou formateurs proposer.
   */
  return {
    apprenants,
    choix: {
      phases: phases.map((p) => ({ id: p.id, nom: `${p.nom} — ${p.programme === 'social-media' ? 'Social Média' : 'Entrepreneurs'}` })),
      thematiques: thematiques.map((t) => ({ id: t.id, nom: t.nom })),
      modules: modules.map((m) => ({ id: m.id, nom: m.titre })),
      formateurs: formateurs.map((x) => ({ id: x.id, nom: x.nom })),
      localisations: [...new Set(apprenants.flatMap((a) => [a.pays, a.ville].filter(Boolean)))].sort(),
      secteurs: [...new Set(apprenants.map((a) => a.secteur).filter(Boolean))].sort(),
    },
  }
})
