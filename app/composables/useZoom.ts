/**
 * Salle Zoom intégrée (planche B, écran 11) : Meeting SDK for Web, Component
 * View sur ordinateur, Client View sur mobile et tablette — sélection
 * automatique selon l'appareil. Le jeton est signé par le serveur
 * (`POST /api/zoom/signature`), les clés Zoom ne sont jamais exposées.
 */
export interface AutorisationZoom {
  mode: 'simulation' | 'live'
  signature: string
  sdkKey: string
  numeroReunion: string
  motDePasse: string
  nomAffiche: string
  email: string
  role: 0 | 1
  sujet: string
  lienSecours: string | null
  ouverture: string
}

export type VueZoom = 'component' | 'client'

export function detecterVueZoom(): VueZoom {
  if (!import.meta.client) return 'component'
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1
  const etroit = window.matchMedia('(max-width: 1023px)').matches
  return mobile || etroit ? 'client' : 'component'
}

export function useZoom() {
  const etat = ref<'inactif' | 'verification' | 'connexion' | 'en-salle' | 'termine' | 'erreur'>('inactif')
  const message = ref('')
  const vue = ref<VueZoom>('component')
  let clientComponent: { leaveMeeting?: () => Promise<void> } | null = null
  let clientView: { leaveMeeting?: (options?: Record<string, unknown>) => void } | null = null

  /** Contrôle de compatibilité et autorisation micro / caméra, avec message clair sinon. */
  async function verifierCompatibilite(): Promise<boolean> {
    etat.value = 'verification'
    if (!window.isSecureContext || typeof navigator.mediaDevices?.getUserMedia !== 'function') {
      etat.value = 'erreur'
      message.value =
        'Votre navigateur ne permet pas la visioconférence intégrée. Utilisez Chrome, Edge, Safari ou Firefox récents, ou ouvrez la session dans l’application Zoom.'
      return false
    }
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      flux.getTracks().forEach((t) => t.stop())
    } catch {
      // Refus ou absence de caméra : on entre quand même, micro et caméra
      // restent activables depuis les contrôles Zoom.
      message.value = 'Micro ou caméra non autorisés : vous pourrez les activer depuis la salle.'
    }
    return true
  }

  async function rejoindre(conteneur: HTMLElement, autorisation: AutorisationZoom) {
    vue.value = detecterVueZoom()
    if (!(await verifierCompatibilite())) return
    etat.value = 'connexion'
    try {
      if (vue.value === 'component') {
        const { default: ZoomMtgEmbedded } = await import('@zoom/meetingsdk/embedded')
        const client = ZoomMtgEmbedded.createClient()
        clientComponent = client as unknown as { leaveMeeting?: () => Promise<void> }
        await client.init({
          zoomAppRoot: conteneur,
          language: 'fr-FR',
          patchJsMedia: true,
          leaveOnPageUnload: true,
          customize: {
            video: { isResizable: true, viewSizes: { default: { width: Math.min(conteneur.clientWidth, 1100), height: Math.round(Math.min(conteneur.clientWidth, 1100) * 0.5625) } } },
            chat: { popper: { disableDraggable: true } },
          },
        })
        await client.join({
          signature: autorisation.signature,
          sdkKey: autorisation.sdkKey,
          meetingNumber: autorisation.numeroReunion,
          password: autorisation.motDePasse,
          userName: autorisation.nomAffiche,
          userEmail: autorisation.email,
        })
      } else {
        const { ZoomMtg } = await import('@zoom/meetingsdk')
        clientView = ZoomMtg as unknown as { leaveMeeting?: (options?: Record<string, unknown>) => void }
        ZoomMtg.preLoadWasm()
        ZoomMtg.prepareWebSDK()
        await ZoomMtg.i18n.load('fr-FR')
        await new Promise<void>((resoudre, rejeter) => {
          ZoomMtg.init({
            leaveUrl: `${window.location.origin}/mon-espace/sessions`,
            patchJsMedia: true,
            leaveOnPageUnload: true,
            success: () => {
              ZoomMtg.join({
                signature: autorisation.signature,
                sdkKey: autorisation.sdkKey,
                meetingNumber: autorisation.numeroReunion,
                passWord: autorisation.motDePasse,
                userName: autorisation.nomAffiche,
                userEmail: autorisation.email,
                success: () => resoudre(),
                error: (e: unknown) => rejeter(e),
              })
            },
            error: (e: unknown) => rejeter(e),
          })
        })
      }
      etat.value = 'en-salle'
    } catch (e) {
      etat.value = 'erreur'
      message.value = `Impossible de rejoindre la salle (${(e as { reason?: string; message?: string }).reason ?? (e as Error).message ?? 'erreur Zoom'}).`
    }
  }

  async function quitter() {
    try {
      if (clientComponent?.leaveMeeting) await clientComponent.leaveMeeting()
      if (clientView?.leaveMeeting) clientView.leaveMeeting({})
    } catch {
      /* déjà sorti */
    }
    etat.value = 'termine'
  }

  return { etat, message, vue, rejoindre, quitter }
}
