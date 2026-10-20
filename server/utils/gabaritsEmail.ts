/**
 * Gabarits des e-mails transactionnels : un sujet, un texte brut et sa version
 * HTML par modèle de notification. Les pilotes d'envoi (Resend aujourd'hui)
 * s'en servent ; le pilote `console` n'en a pas besoin.
 *
 * Les variables viennent des points d'appel de `notifier()` : elles sont
 * échappées avant d'entrer dans le HTML. Un gabarit ne lève jamais sur une
 * variable absente : il l'omet.
 */
import { ORGANISATION } from '#shared/utils/contact'
import { SUJETS, type ModeleNotification } from './notifications'

export interface EmailCompose {
  sujet: string
  texte: string
  html: string
}

/** Un bloc du corps : paragraphe, bouton ou citation (message recopié). */
type Bloc = { p: string } | { bouton: string; lien: string } | { citation: string }

const STATUTS_COACHING: Record<string, string> = {
  'en-etude': 'est à l’étude par notre équipe',
  'confirmee-attente-paiement': 'est confirmée : il ne reste qu’à la régler',
  payee: 'est réglée, merci',
  planifiee: 'est planifiée',
  realisee: 'est marquée comme réalisée',
  refusee: 'n’a pas pu être acceptée',
  sujets: 'a reçu vos sujets',
}

function echapper(valeur: string): string {
  return valeur
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** « 2026-10-20 » → « mardi 20 octobre 2026 » ; toute autre forme est rendue telle quelle. */
function dateLisible(valeur = ''): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return valeur
  return new Date(`${valeur}T12:00:00Z`).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

/** Les variables que les gabarits lisent ; une variable absente vaut « ». */
const CLES = [
  'prenom', 'code', 'validiteMinutes', 'validiteHeures', 'lien', 'statut', 'formateur', 'creneau',
  'montant', 'heures', 'motif', 'thematique', 'date', 'heure', 'module', 'jours', 'nom', 'email',
  'whatsapp', 'sujet', 'reference', 'message', 'moyen', 'numero',
] as const
type Variables = Record<(typeof CLES)[number], string>

function corps(modele: ModeleNotification, variables: Record<string, string>, site: string, contact: string): Bloc[] {
  const v = Object.fromEntries(CLES.map((cle) => [cle, variables[cle] ?? ''])) as Variables
  const espace = `${site}/mon-espace`
  switch (modele) {
    case 'code-verification':
      return [
        { p: `Votre code de vérification : ${v.code}` },
        { p: `Il est valable ${v.validiteMinutes || '10'} minutes. Si vous n’êtes pas à l’origine de cette connexion, ignorez ce message.` },
      ]
    case 'reinitialisation':
      return [
        { p: 'Vous avez demandé à réinitialiser votre mot de passe.' },
        { bouton: 'Choisir un nouveau mot de passe', lien: v.lien },
        { p: `Ce lien est valable ${v.validiteMinutes || '30'} minutes et ne sert qu’une fois. Si vous n’avez rien demandé, ignorez ce message : votre mot de passe reste inchangé.` },
      ]
    case 'invitation-formateur':
    case 'invitation-apprenant':
      return [
        { p: modele === 'invitation-formateur'
          ? 'Votre compte formateur E-Masterclass Big Five est prêt.'
          : 'Un compte E-Masterclass Big Five a été créé pour vous.' },
        { bouton: 'Définir mon mot de passe', lien: v.lien },
        { p: `Ce lien est valable ${v.validiteHeures || '72'} heures.` },
      ]
    case 'coaching-prive-statut': {
      const etat = STATUTS_COACHING[v.statut] ?? 'a été mise à jour'
      return [
        { p: `Votre demande de coaching privé${v.formateur ? ` avec ${v.formateur}` : ''} ${etat}.` },
        ...(v.creneau ? [{ p: `Créneau : ${v.creneau}.` }] : []),
        ...(v.montant && v.statut === 'confirmee-attente-paiement'
          ? [{ p: `Montant : ${Number(v.montant).toLocaleString('fr-FR')} FCFA${v.heures ? ` pour ${v.heures} h` : ''}.` }]
          : []),
        ...(v.motif && v.statut === 'refusee' ? [{ p: `Motif : ${v.motif}` }] : []),
        ...(v.lien ? [{ bouton: 'Rejoindre la séance', lien: v.lien }] : []),
        { bouton: 'Voir ma demande', lien: `${espace}/coaching-prive` },
      ]
    }
    case 'session-annulee':
    case 'session-reportee':
      return [
        { p: `La session de coaching « ${v.thematique} » du ${dateLisible(v.date)}${v.heure ? ` à ${v.heure}` : ''} ${modele === 'session-annulee' ? 'est annulée' : 'est reportée'}.` },
        ...(v.motif ? [{ p: `Motif : ${v.motif}` }] : []),
        { bouton: 'Voir mes sessions', lien: `${espace}/sessions` },
      ]
    case 'acces-attribue':
      return [
        { p: `Le module « ${v.module} » est maintenant disponible dans votre espace.` },
        { bouton: 'Ouvrir mes modules', lien: `${espace}/modules` },
      ]
    case 'acces-revoque':
      return [
        { p: `Votre accès au module « ${v.module} » a été retiré.` },
        ...(v.motif ? [{ p: `Motif : ${v.motif}` }] : []),
        { p: `Une question ? Écrivez-nous à ${contact} ou sur WhatsApp.` },
      ]
    case 'suppression-programmee':
      return [
        { p: `La suppression de votre compte est programmée pour le ${v.date}.` },
        { p: `Vous avez ${v.jours || '14'} jours pour changer d’avis : il suffit de vous reconnecter pour annuler la suppression.` },
      ]
    case 'suppression-rappel':
      return [
        { p: `Votre compte sera supprimé définitivement le ${v.date}.` },
        { p: 'Pour le conserver, reconnectez-vous avant cette date.' },
        { bouton: 'Me reconnecter', lien: `${site}/connexion` },
      ]
    case 'compte-reactive':
      return [
        { p: 'La suppression de votre compte est annulée : vos modules et vos attestations vous attendent.' },
        { bouton: 'Retrouver mon espace', lien: espace },
      ]
    case 'contact-message':
      return [
        { p: `De : ${v.nom} <${v.email}>${v.whatsapp ? ` · WhatsApp ${v.whatsapp}` : ''}` },
        { p: `Sujet : ${v.sujet}${v.reference ? ` · Référence : ${v.reference}` : ''}` },
        { citation: v.message },
      ]
    // Envoyé à une adresse non vérifiée : aucun texte saisi n'y entre. Le sujet
    // vient de la liste fermée SUJETS_CONTACT (server/api/contact.post.ts).
    case 'contact-accuse':
      return [
        { p: `Nous avons bien reçu votre message « ${v.sujet} ». L’équipe vous répond sous 48 h ouvrées.` },
      ]
    case 'paiement-verification':
      return [
        { p: `Nous vérifions votre paiement (commande ${v.reference}) auprès de FeexPay.` },
        { p: 'Votre module s’ouvrira dès la confirmation. Inutile de payer une seconde fois.' },
        { bouton: 'Voir mes modules', lien: `${espace}/modules` },
      ]
    case 'alerte-lancement':
      return [
        { p: `Le module${v.module ? ` « ${v.module} »` : ''} que vous attendiez est disponible.` },
        { bouton: 'Découvrir le module', lien: v.lien || `${site}/modules` },
      ]
    case 'activation-coaching-demandee':
      return [
        { p: `${v.formateur} demande l’activation du coaching privé sur son profil.` },
        { bouton: 'Ouvrir les formateurs', lien: `${site}/admin/formateurs` },
      ]
    // `module` porte les titres achetés, déjà entre guillemets (une commande
    // peut en compter plusieurs) ; sans module, elle réglait une séance de
    // coaching privé.
    case 'achat-confirme':
      return [
        { p: v.module
          ? `Votre paiement est confirmé : vous avez maintenant accès à ${v.module}.`
          : `Votre paiement est confirmé : votre séance de coaching privé${v.formateur ? ` avec ${v.formateur}` : ''} est réglée.` },
        ...(!v.module && v.creneau ? [{ p: `Créneau : ${v.creneau}.` }] : []),
        { p: `Montant : ${Number(v.montant).toLocaleString('fr-FR')} FCFA${v.moyen ? ` · ${v.moyen}` : ''}.` },
        { p: `Référence de commande : ${v.reference}. Gardez-la pour toute question sur ce paiement.` },
        v.module
          ? { bouton: 'Ouvrir mes modules', lien: `${espace}/modules` }
          : { bouton: 'Voir ma séance', lien: `${espace}/coaching-prive` },
      ]
    case 'attestation-delivree':
      return [
        { p: `Félicitations : votre attestation de participation${v.module ? ` au module « ${v.module} »` : ''} est délivrée.` },
        { p: `Numéro : ${v.numero}` },
        { bouton: 'Voir mon attestation', lien: `${site}/certificats/${encodeURIComponent(v.numero)}` },
        { p: `Toute personne à qui vous la présentez peut en vérifier l’authenticité à cette adresse : ${site}/verifier/${encodeURIComponent(v.numero)}` },
      ]
  }
}

/**
 * Compose l'e-mail d'un modèle. `site` = URL publique du site, sans « / » final ;
 * `contact` = l'adresse de l'équipe citée aux apprenants.
 */
export function composerEmail(
  modele: ModeleNotification,
  variables: Record<string, string>,
  site: string,
  contact: string,
): EmailCompose {
  const sujet = SUJETS[modele]
  const blocs = corps(modele, variables, site, contact).filter((b) =>
    'p' in b ? b.p : 'lien' in b ? b.lien : b.citation,
  )
  const salut = variables.prenom ? `Bonjour ${variables.prenom},` : 'Bonjour,'
  const signature = `L’équipe ${ORGANISATION.marque}`

  const texte = [
    salut,
    ...blocs.map((b) => ('p' in b ? b.p : 'lien' in b ? `${b.bouton} : ${b.lien}` : b.citation)),
    signature,
  ].join('\n\n')

  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f6f4f8;font-family:Arial,Helvetica,sans-serif;color:#1d1a24">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4f8;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;padding:28px">
<tr><td style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#80368D;font-weight:bold;padding-bottom:16px">${echapper(ORGANISATION.marque)}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;padding-bottom:12px">${echapper(salut)}</td></tr>
${blocs.map((b) => {
  if ('p' in b) return `<tr><td style="font-size:15px;line-height:1.6;padding-bottom:12px">${echapper(b.p)}</td></tr>`
  if ('lien' in b) return `<tr><td style="padding:8px 0 16px"><a href="${echapper(b.lien)}" style="display:inline-block;background:#80368D;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 22px;border-radius:999px">${echapper(b.bouton)}</a></td></tr>`
  return `<tr><td style="font-size:15px;line-height:1.6;padding:12px 16px;margin-bottom:12px;background:#f6f4f8;border-left:3px solid #80368D;white-space:pre-wrap">${echapper(b.citation)}</td></tr>`
}).join('\n')}
<tr><td style="font-size:15px;line-height:1.6;padding-top:8px">${echapper(signature)}</td></tr>
<tr><td style="font-size:12px;line-height:1.5;color:#6b6475;padding-top:20px;border-top:1px solid #eee8f1">${echapper(ORGANISATION.raisonSociale)} · ${echapper(ORGANISATION.ville)}<br>Message automatique, merci de ne pas y répondre directement.</td></tr>
</table></td></tr></table></body></html>`

  return { sujet, texte, html }
}
