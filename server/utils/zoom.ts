import { createHmac } from 'node:crypto'

/**
 * Zoom (planche B, écran 11 ; planche C, écrans 03 et 05) : la réunion est
 * créée à la planification par l'équipe (Server-to-Server OAuth) et rejointe
 * depuis la plateforme avec le Meeting SDK for Web — Component View sur
 * ordinateur, Client View sur mobile. Le jeton d'autorisation du SDK est
 * signé ici : les clés Zoom ne quittent jamais le serveur.
 *
 * `ZOOM_MODE=simulation` : aucune clé, aucun appel — une réunion fictive est
 * rendue et la salle s'affiche en mode simulé, pour dérouler les parcours en
 * développement. Même patron que `FEEXPAY_MODE` et `NOTIFICATIONS_DRIVER`.
 */
export type ModeZoom = 'simulation' | 'live'

interface ConfigZoom {
  mode: ModeZoom
  accountId: string
  clientId: string
  clientSecret: string
  sdkClientId: string
  sdkClientSecret: string
}

export function configZoom(): ConfigZoom {
  const config = useRuntimeConfig()
  const brut = (process.env.ZOOM_MODE || config.zoomMode || 'simulation').trim().toLowerCase()
  const mode: ModeZoom = brut === 'live' ? 'live' : 'simulation'
  const lire = (env: string, cle: string) => (process.env[env] || (config as Record<string, unknown>)[cle] || '').toString().trim()
  const conf: ConfigZoom = {
    mode,
    accountId: lire('ZOOM_ACCOUNT_ID', 'zoomAccountId'),
    clientId: lire('ZOOM_CLIENT_ID', 'zoomClientId'),
    clientSecret: lire('ZOOM_CLIENT_SECRET', 'zoomClientSecret'),
    sdkClientId: lire('ZOOM_SDK_CLIENT_ID', 'zoomSdkClientId'),
    sdkClientSecret: lire('ZOOM_SDK_CLIENT_SECRET', 'zoomSdkClientSecret'),
  }
  if (mode === 'live' && (!conf.accountId || !conf.clientId || !conf.clientSecret || !conf.sdkClientId || !conf.sdkClientSecret)) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Zoom non configuré : ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_SDK_CLIENT_ID et ZOOM_SDK_CLIENT_SECRET sont requis en mode live.',
    })
  }
  return conf
}

export interface ReunionZoom {
  id: string
  motDePasse: string
  lienParticipation: string
  lienHote: string
}

// --- Jeton serveur (Server-to-Server OAuth) --------------------------------

let jetonCache: { valeur: string; expireA: number } | null = null

async function jetonServeur(): Promise<string> {
  if (jetonCache && jetonCache.expireA > Date.now()) return jetonCache.valeur
  const { accountId, clientId, clientSecret } = configZoom()
  const reponse = await $fetch<{ access_token: string; expires_in: number }>(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`,
    {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}` },
    },
  )
  jetonCache = { valeur: reponse.access_token, expireA: Date.now() + (reponse.expires_in - 60) * 1000 }
  return reponse.access_token
}

async function api<T>(
  chemin: string,
  options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: Record<string, unknown> } = {},
): Promise<T> {
  const jeton = await jetonServeur()
  try {
    const reponse: unknown = await $fetch(`https://api.zoom.us/v2${chemin}`, {
      method: options.method ?? 'GET',
      body: options.body,
      headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
      timeout: 15_000,
    })
    return reponse as T
  } catch (e) {
    throw createError({ statusCode: 502, statusMessage: `Zoom ne répond pas (${(e as Error).message}).` })
  }
}

function reunionSimulee(): ReunionZoom {
  const id = `9${String(Math.floor(Math.random() * 1e10)).padStart(10, '0')}`
  return {
    id,
    motDePasse: 'simulation',
    lienParticipation: `https://zoom.us/j/${id}?pwd=simulation`,
    lienHote: `https://zoom.us/s/${id}?pwd=simulation`,
  }
}

/** Crée la réunion d'une session collective ou d'une séance privée. */
export async function creerReunion(champs: {
  sujet: string
  debutIso: string
  dureeMinutes: number
  enregistrement?: boolean
}): Promise<ReunionZoom> {
  if (configZoom().mode === 'simulation') return reunionSimulee()
  const r = await api<{ id: number; password: string; join_url: string; start_url: string }>('/users/me/meetings', {
    method: 'POST',
    body: {
      topic: champs.sujet.slice(0, 200),
      type: 2,
      start_time: champs.debutIso,
      duration: champs.dureeMinutes,
      timezone: 'Africa/Abidjan',
      settings: {
        join_before_host: false,
        waiting_room: true,
        mute_upon_entry: true,
        approval_type: 2,
        auto_recording: champs.enregistrement ? 'cloud' : 'none',
      },
    },
  })
  return { id: String(r.id), motDePasse: r.password, lienParticipation: r.join_url, lienHote: r.start_url }
}

export async function modifierReunion(id: string, champs: { debutIso?: string; dureeMinutes?: number; sujet?: string }) {
  if (configZoom().mode === 'simulation' || !id) return
  await api(`/meetings/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: { start_time: champs.debutIso, duration: champs.dureeMinutes, topic: champs.sujet, timezone: 'Africa/Abidjan' },
  })
}

export async function supprimerReunion(id: string) {
  if (configZoom().mode === 'simulation' || !id) return
  try {
    await api(`/meetings/${encodeURIComponent(id)}`, { method: 'DELETE' })
  } catch (e) {
    // Une réunion déjà supprimée chez Zoom ne doit pas bloquer l'annulation.
    console.warn('[zoom] suppression de réunion', id, (e as Error).message)
  }
}

// --- Signature du Meeting SDK ----------------------------------------------

function base64Url(entree: Buffer | string): string {
  return Buffer.from(entree).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

/**
 * JWT HS256 attendu par `ZoomMtg.join` / `client.join` : signé avec la clé
 * secrète de l'application Meeting SDK, valable 48 h au plus. `role` 1 = hôte
 * (formateur), 0 = participant.
 */
export function signatureSdk(numeroReunion: string, role: 0 | 1): { signature: string; sdkKey: string } {
  const { mode, sdkClientId, sdkClientSecret } = configZoom()
  if (mode === 'simulation') return { signature: 'simulation', sdkKey: 'simulation' }
  const maintenant = Math.floor(Date.now() / 1000) - 30
  const expiration = maintenant + 60 * 60 * 4
  const entete = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const charge = base64Url(
    JSON.stringify({
      appKey: sdkClientId,
      sdkKey: sdkClientId,
      mn: numeroReunion,
      role,
      iat: maintenant,
      exp: expiration,
      tokenExp: expiration,
      video_webrtc_mode: 1,
    }),
  )
  const signature = base64Url(createHmac('sha256', sdkClientSecret).update(`${entete}.${charge}`).digest())
  return { signature: `${entete}.${charge}.${signature}`, sdkKey: sdkClientId }
}

/** Fenêtre d'ouverture d'une salle : de `ouvertureMinutes` avant le début à trente minutes après la fin. */
export function salleOuverte(debut: Date, dureeMinutes: number, ouvertureMinutes: number, maintenant = new Date()) {
  const ouverture = new Date(debut.getTime() - ouvertureMinutes * 60_000)
  const fermeture = new Date(debut.getTime() + (dureeMinutes + 30) * 60_000)
  return { ouverte: maintenant >= ouverture && maintenant <= fermeture, ouverture, fermeture }
}

/** Instant de début d'une session « 2026-09-10 » + « 19:00 », en heure d'Abidjan (UTC). */
export function debutSession(date: string, heure: string): Date {
  return new Date(`${date}T${heure.slice(0, 5)}:00Z`)
}
