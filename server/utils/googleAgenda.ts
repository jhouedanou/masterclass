import { createSign } from 'node:crypto'

/**
 * Google Agenda (planche C, écran 05 ; planche D, écran 05 : « Événement
 * Google Agenda créé — rappels automatiques »).
 *
 * L'équipe planifie, la plateforme pose l'événement sur un agenda partagé en
 * écriture avec un compte de service. Pas de dépendance npm : le jeton
 * d'accès s'obtient avec un JWT RS256 signé par `node:crypto`, l'API REST
 * fait le reste.
 *
 * `GOOGLE_AGENDA_MODE=simulation` : aucun appel, un identifiant fictif est
 * rendu — même patron que `ZOOM_MODE` et `FEEXPAY_MODE`, pour dérouler les
 * parcours en développement.
 *
 * Mise en place côté Google : console.cloud.google.com → API Google Calendar
 * activée, compte de service avec clé JSON, puis dans Google Agenda partager
 * l'agenda avec l'adresse du compte de service en « Apporter des
 * modifications aux événements ».
 */
export type ModeAgenda = 'simulation' | 'live'

interface ConfigAgenda {
  mode: ModeAgenda
  email: string
  clePrivee: string
  agendaId: string
}

const PORTEE = 'https://www.googleapis.com/auth/calendar.events'
const FUSEAU = 'Africa/Abidjan'

/**
 * La clé privée du compte de service est un PEM multiligne : impossible à
 * porter tel quel dans une variable d'environnement. Elle est donc attendue
 * en base64 ; un PEM collé directement (avec ses `\n` échappés) reste accepté.
 */
function lireClePrivee(brut: string): string {
  if (!brut) return ''
  if (brut.includes('BEGIN')) return brut.replace(/\\n/g, '\n')
  try {
    return Buffer.from(brut, 'base64').toString('utf8')
  } catch {
    return ''
  }
}

export function configAgenda(): ConfigAgenda {
  const config = useRuntimeConfig()
  const brut = (process.env.GOOGLE_AGENDA_MODE || config.googleAgendaMode || 'simulation')
    .trim()
    .toLowerCase()
  const mode: ModeAgenda = brut === 'live' ? 'live' : 'simulation'
  const lire = (env: string, cle: string) =>
    (process.env[env] || (config as Record<string, unknown>)[cle] || '').toString().trim()

  const conf: ConfigAgenda = {
    mode,
    email: lire('GOOGLE_SERVICE_ACCOUNT_EMAIL', 'googleServiceAccountEmail'),
    clePrivee: lireClePrivee(lire('GOOGLE_SERVICE_ACCOUNT_CLE_PRIVEE', 'googleServiceAccountClePrivee')),
    agendaId: lire('GOOGLE_AGENDA_ID', 'googleAgendaId'),
  }
  if (mode === 'live' && (!conf.email || !conf.clePrivee || !conf.agendaId)) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Google Agenda non configuré : GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_CLE_PRIVEE et GOOGLE_AGENDA_ID sont requis en mode live.',
    })
  }
  return conf
}

// --- Jeton d'accès (compte de service, JWT RS256) --------------------------

let jetonCache: { valeur: string; expireA: number } | null = null

function base64Url(entree: Buffer | string): string {
  return Buffer.from(entree).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function jetonAcces(): Promise<string> {
  if (jetonCache && jetonCache.expireA > Date.now()) return jetonCache.valeur
  const { email, clePrivee } = configAgenda()

  const maintenant = Math.floor(Date.now() / 1000)
  const entete = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const charge = base64Url(
    JSON.stringify({
      iss: email,
      scope: PORTEE,
      aud: 'https://oauth2.googleapis.com/token',
      iat: maintenant,
      exp: maintenant + 3600,
    }),
  )
  const signature = base64Url(
    createSign('RSA-SHA256').update(`${entete}.${charge}`).sign(clePrivee),
  )

  const reponse = await $fetch<{ access_token: string; expires_in: number }>(
    'https://oauth2.googleapis.com/token',
    {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${entete}.${charge}.${signature}`,
      }),
    },
  )
  jetonCache = {
    valeur: reponse.access_token,
    expireA: Date.now() + (reponse.expires_in - 60) * 1000,
  }
  return reponse.access_token
}

async function api<T>(
  chemin: string,
  options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: Record<string, unknown> } = {},
): Promise<T> {
  const jeton = await jetonAcces()
  const { agendaId } = configAgenda()
  try {
    const reponse: unknown = await $fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(agendaId)}${chemin}`,
      {
        method: options.method ?? 'GET',
        body: options.body,
        headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
        timeout: 15_000,
      },
    )
    return reponse as T
  } catch (e) {
    throw createError({
      statusCode: 502,
      statusMessage: `Google Agenda ne répond pas (${(e as Error).message}).`,
    })
  }
}

// --- Événements -------------------------------------------------------------

export interface EvenementAgenda {
  titre: string
  description?: string
  debutIso: string
  dureeMinutes: number
  /** Lien de la salle, posé en emplacement de l'événement. */
  lien?: string
  /** Adresses invitées. Le compte de service n'ayant pas de délégation au
   *  domaine, Google refuse les invitations : elles ne sont transmises que
   *  pour mémoire dans la description. */
  participants?: string[]
}

/** Rappels de la maquette : la veille et une heure avant. */
const RAPPELS = {
  useDefault: false,
  overrides: [
    { method: 'email', minutes: 24 * 60 },
    { method: 'popup', minutes: 60 },
  ],
}

function corps(evenement: EvenementAgenda) {
  const fin = new Date(new Date(evenement.debutIso).getTime() + evenement.dureeMinutes * 60_000)
  const invites = evenement.participants?.filter(Boolean) ?? []
  return {
    summary: evenement.titre,
    description: [evenement.description, invites.length && `Participants : ${invites.join(', ')}`]
      .filter(Boolean)
      .join('\n\n'),
    location: evenement.lien ?? '',
    start: { dateTime: new Date(evenement.debutIso).toISOString(), timeZone: FUSEAU },
    end: { dateTime: fin.toISOString(), timeZone: FUSEAU },
    reminders: RAPPELS,
  }
}

/** Crée l'événement et rend son identifiant, à conserver pour le modifier. */
export async function creerEvenement(evenement: EvenementAgenda): Promise<string> {
  if (configAgenda().mode === 'simulation') {
    return `simulation-${Math.random().toString(36).slice(2, 12)}`
  }
  const r = await api<{ id: string }>('/events', { method: 'POST', body: corps(evenement) })
  return r.id
}

export async function modifierEvenement(id: string, evenement: EvenementAgenda): Promise<void> {
  if (configAgenda().mode === 'simulation' || !id) return
  await api(`/events/${encodeURIComponent(id)}`, { method: 'PATCH', body: corps(evenement) })
}

export async function supprimerEvenement(id: string): Promise<void> {
  if (configAgenda().mode === 'simulation' || !id) return
  try {
    await api(`/events/${encodeURIComponent(id)}`, { method: 'DELETE' })
  } catch (e) {
    // Un événement déjà retiré de l'agenda ne doit pas bloquer l'annulation.
    console.warn('[agenda] suppression d’événement', id, (e as Error).message)
  }
}
