import type { InscriptionLive, SessionLive, Utilisateur } from '#shared/types'
import { DELAIS_LIVE, dateLongueLive, dureeLive, heureLive, ligneHoraireLive } from '#shared/utils/live'
import { listerAlertesLancement, trouverFormateur, trouverModule } from '../database/catalogue'
import { trouverUtilisateur } from '../database/comptes'
import {
  annulerEnvoi,
  listerInscriptionsSessionLive,
  marquerEnvoisPasses,
  reserverEnvoi,
  reserverEnvoiSession,
} from '../database/live'
import { evenementIcs } from './ics'
import { visibiliteLive } from './live'
import { notifier } from './notifications'

/**
 * E-mails des Live Sessions (CDC §7, planche 06). Toutes les relances partent
 * par e-mail. Chaque envoi aux inscrits est conditionné par son horodatage
 * (`reserverEnvoi`) : un job relancé n'envoie rien deux fois, un envoi raté
 * est retenté au passage suivant.
 *
 * Rien ne part tant que la fonctionnalité est masquée (10.G).
 */

function site(): string {
  return useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
}

async function emailsActifs(): Promise<boolean> {
  return (await visibiliteLive()) !== 'personne'
}

interface ContexteLive {
  titre: string
  horaire: string
  formateur: string
  prerequis: string
  moduleSlug: string
  dureeModule: string
}

async function contexte(session: SessionLive): Promise<ContexteLive> {
  const [module, formateur] = await Promise.all([trouverModule(session.moduleId), trouverFormateur(session.formateurId)])
  return {
    titre: module?.titre ?? 'Live Session',
    horaire: ligneHoraireLive(session.debut, session.dureeMinutes),
    formateur: formateur?.nom ?? '',
    prerequis: session.prerequis.join('|'),
    moduleSlug: module?.slug ?? '',
    dureeModule: module ? dureeLive(module.dureeMinutes) : '',
  }
}

/** Salle intégrée de l'espace (option B) : seul lien envoyé aux inscrits. */
export function lienSalleLive(session: Pick<SessionLive, 'id'>): string {
  return `${site()}/mon-espace/live/${session.id}`
}

export function lienAgendaLive(session: Pick<SessionLive, 'slug'>): string {
  return `${site()}/api/live-sessions/${encodeURIComponent(session.slug)}/agenda.ics`
}

export function icsLive(session: SessionLive, titre: string, formateur: string): string {
  return evenementIcs({
    uid: `live-${session.id}@emasterclass`,
    debut: session.debut,
    dureeMinutes: session.dureeMinutes,
    titre: `Live Session · ${titre}`,
    description: `Formation en direct${formateur ? ` avec ${formateur}` : ''}. La session s’ouvre depuis votre espace E-Masterclass.`,
    lien: lienSalleLive(session),
  })
}

/**
 * Confirmation d'inscription (planche 06, e-mail 1), avec le .ics. Une
 * inscription tardive (après J-1 ou H-10, §11) reçoit l'invitation sans les
 * envois déjà passés, qui sont marqués comme faits.
 */
export async function envoyerConfirmationLive(
  session: SessionLive,
  inscription: InscriptionLive,
  apprenant: Utilisateur,
): Promise<void> {
  if (!(await emailsActifs())) return
  const ctx = await contexte(session)
  const debut = new Date(session.debut).getTime()
  const maintenant = Date.now()
  const passes: ('envoye_j1_le' | 'envoye_m10_le')[] = []
  if (maintenant >= debut - DELAIS_LIVE.lienApprenantMinutes * 60_000) passes.push('envoye_j1_le')
  if (maintenant >= debut - DELAIS_LIVE.rappelMinutes * 60_000) passes.push('envoye_m10_le')
  await marquerEnvoisPasses(inscription.id, passes)

  await notifier({
    canal: 'email',
    a: apprenant.email,
    modele: 'live-confirmation',
    variables: {
      prenom: apprenant.prenom,
      titre: ctx.titre,
      horaire: ctx.horaire,
      formateur: ctx.formateur,
      prerequis: ctx.prerequis,
      quand: passes.length ? 'tardive' : '',
      agenda: lienAgendaLive(session),
      recu: inscription.commandeReference ? `${site()}/mon-espace/recu/${encodeURIComponent(inscription.commandeReference)}` : '',
    },
    piecesJointes: [{ nom: 'live-session.ics', contenu: icsLive(session, ctx.titre, ctx.formateur), type: 'text/calendar' }],
  })
}

const RAPPELS = {
  envoye_j1_le: {
    sujet: (heure: string) => `Demain à ${heure} : votre Live Session`,
    quand: (session: SessionLive) => `demain, ${dateLongueLive(session.debut).toLowerCase()} à ${heureLive(session.debut)} GMT`,
  },
  envoye_m10_le: {
    sujet: () => 'Votre Live Session commence dans 10 minutes',
    quand: (session: SessionLive) => `dans 10 minutes, à ${heureLive(session.debut)} GMT`,
  },
  envoye_h0_le: {
    sujet: () => 'C’est maintenant : rejoignez votre Live Session',
    quand: () => 'maintenant',
  },
} as const

/** Rappels J-1, H-10 et H0 : même gabarit, seuls l'objet et la première phrase changent. */
export async function envoyerRappelsLive(
  session: SessionLive,
  champ: keyof typeof RAPPELS,
): Promise<number> {
  if (!(await emailsActifs())) return 0
  const inscrits = (await listerInscriptionsSessionLive(session.id)).filter((i) => !i.envois[champ])
  if (!inscrits.length) return 0
  const ctx = await contexte(session)
  let envoyes = 0
  for (const inscription of inscrits) {
    if (!(await reserverEnvoi(inscription.id, champ))) continue
    const apprenant = await trouverUtilisateur(inscription.utilisateurId)
    const ok = apprenant
      ? await notifier({
          canal: 'email',
          a: apprenant.email,
          modele: 'live-rappel',
          sujet: RAPPELS[champ].sujet(heureLive(session.debut)),
          variables: {
            prenom: apprenant.prenom,
            titre: ctx.titre,
            horaire: ctx.horaire,
            formateur: ctx.formateur,
            quand: RAPPELS[champ].quand(session),
            lien: lienSalleLive(session),
          },
        })
      : true
    if (ok) envoyes++
    else await annulerEnvoi(inscription.id, champ)
  }
  return envoyes
}

/** Fin de session (§7) : seulement quand le support est présent ; sinon à son dépôt. */
export async function envoyerFinLive(session: SessionLive): Promise<number> {
  if (!(await emailsActifs()) || session.statut !== 'terminee' || !session.supportNom) return 0
  const inscrits = (await listerInscriptionsSessionLive(session.id)).filter((i) => !i.envois.envoye_fin_le)
  const ctx = await contexte(session)
  let envoyes = 0
  for (const inscription of inscrits) {
    if (!(await reserverEnvoi(inscription.id, 'envoye_fin_le'))) continue
    const apprenant = await trouverUtilisateur(inscription.utilisateurId)
    const ok = apprenant
      ? await notifier({
          canal: 'email',
          a: apprenant.email,
          modele: 'live-fin',
          variables: { prenom: apprenant.prenom, titre: ctx.titre, lien: `${site()}/mon-espace` },
        })
      : true
    if (ok) envoyes++
    else await annulerEnvoi(inscription.id, 'envoye_fin_le')
  }
  return envoyes
}

/** Bascule vers le module vidéo (§4.2) : « module disponible ». */
export async function envoyerModuleDisponibleLive(session: SessionLive): Promise<number> {
  if (!(await emailsActifs())) return 0
  const inscrits = (await listerInscriptionsSessionLive(session.id)).filter((i) => !i.envois.envoye_video_le)
  const ctx = await contexte(session)
  let envoyes = 0
  for (const inscription of inscrits) {
    if (!(await reserverEnvoi(inscription.id, 'envoye_video_le'))) continue
    const apprenant = await trouverUtilisateur(inscription.utilisateurId)
    const ok = apprenant
      ? await notifier({
          canal: 'email',
          a: apprenant.email,
          modele: 'live-module-disponible',
          variables: {
            prenom: apprenant.prenom,
            titre: ctx.titre,
            duree: ctx.dureeModule,
            lien: `${site()}/mon-espace/module/${encodeURIComponent(ctx.moduleSlug)}`,
          },
        })
      : true
    if (ok) envoyes++
    else await annulerEnvoi(inscription.id, 'envoye_video_le')
  }
  return envoyes
}

async function formateurDestinataire(session: SessionLive): Promise<{ email: string; prenom: string } | null> {
  const formateur = await trouverFormateur(session.formateurId)
  if (!formateur?.emailPro) return null
  return { email: formateur.emailPro, prenom: formateur.nom.split(' ')[0] ?? '' }
}

/** Formateur : session planifiée (draft → published). */
export async function envoyerFormateurPlanifieeLive(session: SessionLive): Promise<void> {
  if (!(await emailsActifs())) return
  if (!(await reserverEnvoiSession(session.id, 'envoye_formateur_planifiee_le'))) return
  const [dest, ctx, moderateur] = await Promise.all([
    formateurDestinataire(session),
    contexte(session),
    session.moderateurId ? trouverUtilisateur(session.moderateurId) : null,
  ])
  if (!dest) return
  await notifier({
    canal: 'email',
    a: dest.email,
    modele: 'live-formateur-planifiee',
    variables: {
      prenom: dest.prenom,
      titre: ctx.titre,
      horaire: ctx.horaire,
      moderateur: moderateur ? `${moderateur.prenom} ${moderateur.nom}` : '',
    },
  })
}

/** Formateur : rappel J-1. */
export async function envoyerFormateurRappelLive(session: SessionLive): Promise<void> {
  if (!(await emailsActifs())) return
  if (!(await reserverEnvoiSession(session.id, 'envoye_formateur_j1_le'))) return
  const [dest, ctx] = await Promise.all([formateurDestinataire(session), contexte(session)])
  if (!dest) return
  await notifier({
    canal: 'email',
    a: dest.email,
    modele: 'live-formateur-rappel',
    variables: { prenom: dest.prenom, titre: ctx.titre, horaire: ctx.horaire },
  })
}

async function envoyerAuxInscrits(
  session: SessionLive,
  modele: 'live-changement-horaire' | 'live-annulation',
  variables: Record<string, string>,
): Promise<number> {
  if (!(await emailsActifs())) return 0
  const inscrits = await listerInscriptionsSessionLive(session.id)
  let envoyes = 0
  for (const inscription of inscrits) {
    const apprenant = await trouverUtilisateur(inscription.utilisateurId)
    if (!apprenant) continue
    if (await notifier({ canal: 'email', a: apprenant.email, modele, variables: { prenom: apprenant.prenom, ...variables } })) {
      envoyes++
    }
  }
  return envoyes
}

/** Changement d'horaire (§4.1) : ancienne et nouvelle date. */
export async function envoyerChangementHoraireLive(session: SessionLive, ancienDebut: string, ancienneDuree: number): Promise<number> {
  const ctx = await contexte(session)
  return envoyerAuxInscrits(session, 'live-changement-horaire', {
    titre: ctx.titre,
    horaire: ctx.horaire,
    ancien: ligneHoraireLive(ancienDebut, ancienneDuree),
  })
}

/** Annulation (§4.1) : modalités de remboursement ou de report. */
export async function envoyerAnnulationLive(session: SessionLive): Promise<number> {
  const ctx = await contexte(session)
  return envoyerAuxInscrits(session, 'live-annulation', { titre: ctx.titre, horaire: `le ${ctx.horaire}` })
}

/** Alerte à l'équipe : paiement reçu sans place (§6, étape 3). */
export async function alerterRemboursementLive(session: SessionLive, apprenant: Utilisateur, reference: string): Promise<void> {
  const ctx = await contexte(session)
  await notifier({
    canal: 'email',
    a: useRuntimeConfig().contactDestinataire,
    modele: 'live-alerte-remboursement',
    variables: {
      titre: ctx.titre,
      horaire: ctx.horaire,
      apprenant: `${apprenant.prenom} ${apprenant.nom}`,
      email: apprenant.email,
      reference,
    },
  })
}

/** « Prévenir les apprenants en alerte » à la publication (planche 07). */
export async function prevenirAlertesLive(session: SessionLive): Promise<number> {
  if (!(await emailsActifs())) return 0
  const [alertes, ctx] = await Promise.all([listerAlertesLancement(session.moduleId), contexte(session)])
  let envoyes = 0
  for (const alerte of alertes) {
    if (
      await notifier({
        canal: 'email',
        a: alerte.email,
        modele: 'live-ouverture',
        variables: {
          titre: ctx.titre,
          horaire: ctx.horaire,
          lien: `${site()}/live-sessions/${encodeURIComponent(session.slug)}`,
        },
      })
    ) {
      envoyes++
    }
  }
  return envoyes
}
