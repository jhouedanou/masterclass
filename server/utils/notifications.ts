/**
 * Envoi des notifications sortantes — e-mail et WhatsApp.
 *
 * La plateforme prévoit plusieurs envois (code de vérification à la connexion
 * admin, lien de réinitialisation, invitation d'un formateur, suivi d'une
 * demande de coaching privé, sessions annulées ou reportées) mais aucun
 * fournisseur n'est encore retenu : ni compte e-mail transactionnel, ni
 * WhatsApp Business.
 *
 * Tout passe donc par `notifier()`, qui délègue à un pilote choisi par la
 * configuration. Le pilote `console` écrit le message dans la sortie du
 * serveur — c'est ce qui permet de dérouler les parcours en développement.
 * Brancher un fournisseur consistera à ajouter un pilote ici, sans toucher aux
 * points d'appel.
 */

export type CanalNotification = 'email' | 'whatsapp'

export type ModeleNotification =
  | 'code-verification'
  | 'reinitialisation'
  | 'invitation-formateur'
  | 'coaching-prive-statut'
  | 'session-annulee'
  | 'session-reportee'
  | 'acces-attribue'

export interface Notification {
  canal: CanalNotification
  /** Adresse e-mail ou numéro WhatsApp du destinataire. */
  a: string
  modele: ModeleNotification
  variables: Record<string, string>
}

export interface PiloteNotifications {
  envoyer(notification: Notification): Promise<void>
}

/** Sujets lisibles des modèles, réutilisés par tous les pilotes. */
export const SUJETS: Record<ModeleNotification, string> = {
  'code-verification': 'Votre code de vérification E-Masterclass Big Five',
  reinitialisation: 'Réinitialisation de votre mot de passe',
  'invitation-formateur': 'Bienvenue parmi les formateurs E-Masterclass Big Five',
  'coaching-prive-statut': 'Votre demande de coaching privé',
  'session-annulee': 'Session de coaching annulée',
  'session-reportee': 'Session de coaching reportée',
  'acces-attribue': 'Un module a été ajouté à votre espace',
}

const piloteConsole: PiloteNotifications = {
  async envoyer(n) {
    const variables = Object.entries(n.variables)
      .map(([cle, valeur]) => `${cle}=${valeur}`)
      .join(' · ')
    console.info(`[notification/${n.canal}] → ${n.a} · ${SUJETS[n.modele]} · ${variables}`)
  },
}

function pilote(): PiloteNotifications {
  const nom = useRuntimeConfig().notificationsDriver
  switch (nom) {
    case 'console':
    case '':
    case undefined:
      return piloteConsole
    default:
      // Un pilote inconnu ne doit pas faire échouer le parcours métier : on
      // journalise et on retombe sur la sortie serveur.
      console.warn(`[notification] pilote « ${nom} » inconnu, sortie console utilisée`)
      return piloteConsole
  }
}

/**
 * Envoie une notification. Ne lève jamais : un fournisseur indisponible ne
 * doit pas bloquer une réservation, un paiement ou une connexion — l'échec
 * est journalisé pour être repris.
 */
export async function notifier(notification: Notification): Promise<void> {
  if (!notification.a) return
  try {
    await pilote().envoyer(notification)
  } catch (erreur) {
    console.error('[notification] échec d’envoi', notification.modele, erreur)
  }
}

/** Envoie sur les deux canaux quand le numéro WhatsApp est connu. */
export async function notifierCompte(
  compte: { email: string; whatsapp?: string | null },
  modele: ModeleNotification,
  variables: Record<string, string>,
): Promise<void> {
  await notifier({ canal: 'email', a: compte.email, modele, variables })
  if (compte.whatsapp) await notifier({ canal: 'whatsapp', a: compte.whatsapp, modele, variables })
}
