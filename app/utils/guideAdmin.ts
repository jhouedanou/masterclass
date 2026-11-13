/**
 * Guide de l'administration affiché dans le back-office (/admin/guide).
 *
 * Il dit où se trouve chaque réglage et qui en a la main, pour qu'une question
 * « où est-ce que ça se règle ? » se tranche en ouvrant une page. La version
 * longue, avec les règles de détail, reste `docs/guide-admin.md`.
 *
 * Les captures sont dans `public/guide/`, prises sur la base de démonstration.
 */
export interface RubriqueGuide {
  id: string
  titre: string
  /** Une phrase : à quoi sert l'écran. */
  resume: string
  /** Écran du back-office concerné. */
  chemin?: string
  captures?: { fichier: string; legende: string }[]
  etapes?: string[]
  aSavoir?: string[]
}

export const GUIDE_ADMIN: RubriqueGuide[] = [
  {
    id: 'connexion',
    titre: 'Se connecter',
    resume: 'La connexion se fait en deux temps : le mot de passe, puis un code à six chiffres.',
    chemin: '/admin/login',
    captures: [{ fichier: 'connexion.jpg', legende: 'La page de connexion du back-office.' }],
    etapes: [
      'Ouvrir `/admin/login` et saisir son e-mail et son mot de passe.',
      'Saisir le code à six chiffres donné par l’application d’authentification (Google Authenticator, Authy). Aucun code n’est envoyé par e-mail ni par SMS.',
      'À la première connexion : scanner le QR code, saisir le code, noter les 8 codes de secours, puis changer le mot de passe provisoire dans Paramètres → Mon profil.',
    ],
    aSavoir: [
      'Une session dure 12 heures.',
      'Cinq mots de passe faux bloquent le compte 15 minutes.',
      'Téléphone perdu : utiliser un code de secours. Sans code, un administrateur supérieur clique « Réinitialiser la 2FA » dans Paramètres → Administration des accès.',
    ],
  },
  {
    id: 'menu',
    titre: 'Le menu : qui voit quoi',
    resume: 'Un administrateur supérieur voit tout. Un administrateur de contenu ne voit que les sections qu’on lui a cochées.',
    chemin: '/admin',
    captures: [{ fichier: 'vue-ensemble.jpg', legende: 'La vue d’ensemble et le menu complet d’un administrateur supérieur.' }],
    etapes: [
      'Une section non accordée est masquée, pas grisée : si une entrée manque, c’est un droit à demander, pas une panne.',
      '« Coaching collectif » se déplie sur « Calendrier des sessions ». « Paramètres » se déplie sur ses volets.',
      '« Transactions & paiements » est réservé aux administrateurs supérieurs.',
      '« Recette » et « Guide » sont ouverts à tout compte d’administration.',
    ],
  },
  {
    id: 'live-sessions',
    titre: 'Live Sessions',
    resume: 'Rendre la fonctionnalité visible, planifier une séance, la publier, la clore.',
    chemin: '/admin/live-sessions',
    captures: [
      { fichier: 'live-sessions.jpg', legende: 'Le réglage de visibilité, en haut de l’écran, et la liste des séances.' },
      { fichier: 'live-session-fiche.jpg', legende: 'La fiche d’une séance publiée : Zoom, cycle de vie, support, inscrits.' },
    ],
    etapes: [
      'Visibilité — en haut de l’écran, « visible sur le site pour » : Personne, Admins seulement ou Tout le monde. Sur « Personne », rien n’apparaît sur le site (menu, pages, badges, onglet du formateur) et aucun e-mail Live ne part. « Admins seulement » sert à vérifier en ligne avant d’ouvrir.',
      'Planifier — « + Planifier une Live Session » : un module qui n’est pas encore disponible en vidéo, la date et l’heure en GMT, la durée, la capacité (celle de la licence Zoom), le formateur et le modérateur. Le prix est celui du module.',
      'Publier — « Publier la Live Session ». La publication est refusée tant qu’il manque le modérateur ou la réunion Zoom (ID à saisir, ou création automatique).',
      'Le jour de la séance — « Modérer la session » ouvre la salle.',
      'Clore — « Marquer comme terminée » ouvre le quiz et le support aux inscrits. Sans clic, la séance se clôt seule : début + durée + 60 minutes.',
      'Support — déposer le fichier (PDF ou PowerPoint, 50 Mo au plus) : les inscrits reçoivent l’e-mail de fin.',
      'Vidéo — la colonne « Suite » rappelle l’échéance de la version montée. Une fois la vidéo publiée, le module devient un module classique.',
      'Inscrits — la liste et son export CSV sont sur la fiche. Le nombre d’inscrits n’est visible que des administrateurs.',
    ],
    aSavoir: [
      'Les rappels (la veille, 10 minutes avant, au début) partent seuls. Ils dépendent de la planification en base et de l’envoi des e-mails : voir « Ce qui ne se règle pas ici ».',
      '« Annuler la session » prévient les inscrits. Les remboursements se font dans l’espace FeexPay.',
    ],
  },
  {
    id: 'coaching-collectif',
    titre: 'Coaching collectif',
    resume: 'Le calendrier des sessions : création, report, annulation, présence.',
    chemin: '/admin/sessions',
    captures: [{ fichier: 'calendrier.jpg', legende: 'Coaching collectif → Calendrier des sessions.' }],
    etapes: [
      '« + Créer une session », puis « Valider et créer la réunion Zoom » : la réunion est créée automatiquement. Format fixe : 2 heures, 25 places.',
      'Une session par couple thématique–formateur et par mois, hors sessions annulées.',
      '« Reporter et notifier » déplace aussi la réunion Zoom. « Annuler et notifier » la supprime. Tous les inscrits reçoivent un e-mail.',
      'Après la séance, relever la présence : c’est la seule source des taux de présence.',
    ],
    aSavoir: ['« Modifier » et la création ne préviennent personne.'],
  },
  {
    id: 'coaching-prive',
    titre: 'Coaching privé',
    resume: 'Les demandes de séances individuelles, de la confirmation à la séance.',
    chemin: '/admin/coaching-prive',
    captures: [{ fichier: 'coaching-prive.jpg', legende: 'Les demandes à traiter. Le badge du menu compte celles en attente.' }],
    etapes: [
      'Confirmer : choisir le créneau et la durée. Le prix est le tarif horaire du formateur multiplié par la durée. L’apprenant reçoit un e-mail.',
      'L’apprenant clique « Accepter et payer » dans son espace : la demande passe « payée » seule.',
      'Planifier avec une date et une heure réelles : la réunion Zoom est créée, l’apprenant et le formateur sont prévenus.',
      '« Marquer réalisée » après la séance.',
    ],
    aSavoir: ['« Annuler » demande un motif, transmis à l’apprenant.', 'Aucune relance automatique : surveiller le bloc « À traiter » de la vue d’ensemble.'],
  },
  {
    id: 'apprenants',
    titre: 'Apprenants',
    resume: 'Les comptes, leurs accès et leurs attestations.',
    chemin: '/admin/apprenants',
    captures: [{ fichier: 'apprenants.jpg', legende: 'La liste des apprenants.' }],
    etapes: [
      '« + Ajouter un apprenant » : il reçoit un lien pour choisir son mot de passe, valable 72 heures. Un module peut être offert d’emblée.',
      '« Attribuer un accès à un module » : motif obligatoire, journalisé, apprenant prévenu par e-mail.',
      'Panneau Historique : révoquer ou rétablir un accès, révoquer ou rétablir une attestation.',
    ],
    aSavoir: ['Un apprenant qui supprime son compte est désactivé, puis supprimé 14 jours plus tard. Se reconnecter avant l’échéance le réactive.'],
  },
  {
    id: 'formateurs',
    titre: 'Formateurs et candidatures',
    resume: 'Les fiches publiques, leur ordre, le coaching privé, les candidatures.',
    chemin: '/admin/formateurs',
    captures: [{ fichier: 'formateurs.jpg', legende: 'Les formateurs : modules, accès, tarif, ordre public.' }],
    etapes: [
      'La poignée fixe l’ordre d’affichage de la page publique des formateurs.',
      '« Modifier » ouvre la fiche publique. Une fiche incomplète reste hors de l’index des moteurs de recherche.',
      'La case « Coaching privé » rend le formateur sélectionnable dans les nouvelles demandes.',
      'Candidatures formateurs : « Créer le compte formateur » crée la fiche et le compte en une fois. Le formateur reçoit un lien pour définir son mot de passe, valable 72 heures.',
    ],
  },
  {
    id: 'contenus',
    titre: 'Contenus et site public',
    resume: 'Modules, chapitres, vidéos, pages du site, blog.',
    chemin: '/admin/contenus',
    captures: [{ fichier: 'contenus.jpg', legende: 'Modules & chapitres : l’arbre programme → thématique → module.' }],
    etapes: [
      'Éditeur de module : informations, chapitres, ressources, quiz, fiche commerciale, offre et prix, référencement, historique.',
      '« Prêt » ne veut pas dire « en vente » : l’offre s’ouvre à part, avec une promesse, un « pourquoi » et au moins un chapitre.',
      'CMS Site vitrine : chaque bloc se modifie puis se publie. La bannière d’accueil se change dans le bloc « Bannière ».',
      'Blog : « Publier » est bloqué tant que le texte alternatif d’une image manque.',
    ],
  },
  {
    id: 'transactions',
    titre: 'Ventes et paiements',
    resume: 'Les paiements passent par FeexPay. L’écran est en lecture seule.',
    chemin: '/admin/transactions',
    captures: [{ fichier: 'transactions.jpg', legende: 'Transactions & paiements, réservé aux administrateurs supérieurs.' }],
    etapes: [
      'Une commande est confirmée au retour du paiement : l’accès s’ouvre seul, l’apprenant reçoit un e-mail.',
      'L’écran liste les transactions et les échecs par motif, avec un export CSV.',
      'Une inscription à une Live Session apparaît comme un achat du module.',
    ],
    aSavoir: ['Seul le Mobile Money est ouvert. Wave et la carte attendent leur activation chez FeexPay.', 'Les remboursements se font dans l’espace FeexPay.'],
  },
  {
    id: 'parametres',
    titre: 'Paramètres',
    resume: 'Accès, tracking, référencement, attestations, paramètres financiers, profil.',
    chemin: '/admin/parametres',
    captures: [{ fichier: 'parametres-attestations.jpg', legende: 'Paramètres → Attestations : la signature de la direction.' }],
    etapes: [
      'Administration des accès : créer un administrateur, cocher ses sections, le révoquer, réinitialiser sa double authentification. Le mot de passe provisoire se transmet à la main : aucune invitation n’est envoyée.',
      'Compte testeur : créer un administrateur sans cocher aucune section. Il n’a alors que la vue d’ensemble, son profil, la Recette et le Guide.',
      'Attestations : la signature de la direction (dessinée ou image) s’applique aussi aux attestations déjà délivrées.',
      'Tracking & pixels : écran verrouillé, le déverrouiller redemande le mot de passe.',
      'Mon profil : photo, nom, e-mail, mot de passe.',
    ],
  },
  {
    id: 'recette',
    titre: 'Recette',
    resume: 'La liste des contrôles à jouer, où chaque testeur note son résultat.',
    chemin: '/admin/recette',
    captures: [{ fichier: 'recette.jpg', legende: 'Chaque testeur marque OK, KO ou Passé. Les résultats des autres s’affichent en pastilles.' }],
    etapes: [
      'Jouer l’étape sur le site, comparer au résultat attendu, cliquer OK, KO ou Passé. Cliquer à nouveau efface son résultat.',
      'Un KO attend une note : ce qui s’est affiché, le compte utilisé, l’appareil, l’heure. Sans ces éléments, l’erreur ne se retrouve pas dans les journaux.',
      '« Reste à jouer » ne garde que les contrôles sans résultat. « Exporter en CSV » sort les résultats de l’équipe ou les siens.',
      'Les encadrés « Hors développement » disent ce qui ne peut pas passer pour une raison extérieure au code.',
    ],
  },
  {
    id: 'hors-admin',
    titre: 'Ce qui ne se règle pas ici',
    resume: 'Ces points ne dépendent ni du back-office ni du code. Chacun a un responsable.',
    etapes: [
      'Envoi des e-mails — ils partent par Resend, depuis un domaine vérifié par des enregistrements DNS. Responsable : la personne qui gère la zone DNS du domaine d’expédition.',
      'Wave et paiement par carte — activation par FeexPay, après validation du dossier. Responsable : le titulaire du compte FeexPay.',
      'Zoom — si un formateur reste « en attente de l’hôte », il manque à l’application Zoom la portée `user:read:zak:admin`. Responsable : le titulaire du compte Zoom.',
      'Remboursements — dans l’espace FeexPay. Responsable : le titulaire du compte FeexPay.',
      'Rappels des Live Sessions — planification en base. Responsable : le développeur.',
      'WhatsApp — aucun message automatique ne part, même là où un écran annonce « e-mail + WhatsApp ».',
    ],
  },
]
