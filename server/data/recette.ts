import type { SectionRecette } from '#shared/types'

/**
 * Contrôles de la recette partagée (/admin/recette).
 *
 * Une clé (`k`) ne se réemploie jamais pour un autre contrôle : les résultats
 * en base y sont rattachés. Pour une nouvelle campagne, changer `version`,
 * ajouter une section et laisser les anciennes clés mourir.
 *
 * Les captures de référence sont dans `public/recette/`. Elles sont prises sur
 * la base de démonstration, jamais sur la production.
 */
export const recette: { version: string; adresse: string; sections: SectionRecette[] } = {
  version: '2026-11-13',
  adresse: 'https://emasterclass.bigfive.solutions',
  sections: [
    {
      num: '1',
      titre: 'Livraison du 13/11',
      contexte: 'correctifs de la recette et évolutions de la maquette',
      controles: [
        {
          k: '1.1',
          qui: 'Visiteur',
          etape: 'Ouvrir la page d’accueil.',
          attendu: 'La page s’affiche en entier, bannière comprise, sans message d’erreur.',
          lien: '/',
          capture: 'accueil.jpg',
        },
        {
          k: '1.2',
          qui: 'Visiteur',
          etape: 'Dans l’en-tête, ouvrir « Modules », puis « Formateurs ».',
          attendu: 'Le lien de la page ouverte est posé sur une pastille de couleur, en gras. Plus de filet souligné.',
          lien: '/formateurs',
          capture: 'entete-pastille.jpg',
        },
        {
          k: '1.3',
          qui: 'Visiteur',
          etape: 'Inscription : remplir le formulaire avec un mot de passe de 6 caractères, valider.',
          attendu: 'Encadré rouge : « Le mot de passe doit contenir au moins 10 caractères. » Aucun compte créé.',
          lien: '/inscription',
          capture: 'inscription-erreur.jpg',
        },
        {
          k: '1.4',
          qui: 'Visiteur',
          etape: 'Inscription : utiliser une adresse e-mail qui a déjà un compte.',
          attendu: 'Encadré rouge qui dit que l’adresse est déjà utilisée. Avant le correctif, rien ne s’affichait.',
          lien: '/inscription',
        },
        {
          k: '1.5',
          qui: 'Visiteur',
          etape: 'Ouvrir la page de connexion, puis celle d’inscription.',
          attendu: 'Le bouton WhatsApp est présent en bas à droite sur les deux.',
          lien: '/connexion',
          capture: 'connexion-whatsapp.jpg',
        },
        {
          k: '1.6',
          qui: 'Apprenant',
          etape: 'Se connecter. Regarder le menu de l’espace apprenant.',
          attendu:
            'Six entrées : Tableau de bord, Catalogue, Mes modules, Coaching collectif, Coaching privé, Mes certificats. L’entrée ouverte est sur une pastille violette.',
          lien: '/mon-espace',
          capture: 'apprenant-tableau-de-bord.jpg',
        },
        {
          k: '1.7',
          qui: 'Apprenant',
          etape: 'Tableau de bord : descendre jusqu’au bandeau sombre « Explorer le catalogue ».',
          attendu: 'Deux boutons : « Mes modules » et « Voir le catalogue ». Le rail « Les modules de la plateforme » a disparu.',
          lien: '/mon-espace',
        },
        {
          k: '1.8',
          qui: 'Apprenant',
          etape: 'Ouvrir « Catalogue ». Essayer les filtres de programme, puis « Vous y avez accès » et « À découvrir ».',
          attendu:
            'La grille et le compteur suivent les filtres. Un module acheté porte « Vous y avez accès » et s’ouvre par « Ouvrir le module », sans prix.',
          lien: '/mon-espace/catalogue',
          capture: 'apprenant-catalogue.jpg',
        },
        {
          k: '1.9',
          qui: 'Apprenant',
          etape: 'Sur téléphone : ouvrir l’espace apprenant.',
          attendu: 'La barre d’onglets du bas porte « Catalogue ». Le bouton WhatsApp est au-dessus de la barre, il ne la recouvre pas.',
          lien: '/mon-espace',
          capture: 'apprenant-mobile.jpg',
        },
        {
          k: '1.10',
          qui: 'Apprenant',
          etape: 'Ouvrir un module acheté, lancer une vidéo, puis passer au chapitre suivant.',
          attendu: 'La progression du chapitre quitté reste affichée, elle ne retombe pas à sa valeur d’ouverture de page.',
        },
        {
          k: '1.11',
          qui: 'Apprenant',
          etape: 'Inscrit à une Live Session à venir : regarder sa carte sur le tableau de bord.',
          attendu: 'Bouton « Ajouter à mon agenda » : il télécharge un fichier .ics qui s’ouvre dans l’agenda.',
          lien: '/mon-espace',
          capture: 'apprenant-tableau-de-bord.jpg',
        },
        {
          k: '1.12',
          qui: 'Apprenant',
          etape: 'Après une Live Session terminée : regarder sa carte.',
          attendu: 'Bouton « S’inscrire au coaching collectif », qui mène à « Coaching collectif ».',
          lien: '/mon-espace',
        },
        {
          k: '1.13',
          qui: 'Formateur',
          etape: 'Ouvrir « Revenus », puis un relevé mensuel.',
          attendu: 'Aucun pourcentage nulle part : ni dans les cartes, ni dans les colonnes, ni en bas de page.',
          lien: '/formateur/revenus',
          capture: 'formateur-revenus.jpg',
        },
        {
          k: '1.14',
          qui: 'Formateur',
          etape: 'Passer d’un onglet à l’autre dans l’espace formateur.',
          attendu: 'L’onglet ouvert est violet et en gras. Le bouton WhatsApp est présent.',
          lien: '/formateur',
        },
        {
          k: '1.15',
          qui: 'Admin',
          etape: 'Regarder le menu de gauche du back-office.',
          attendu: '« Calendrier des sessions » est rangé sous un groupe « Coaching collectif », juste au-dessus de « Live Sessions ».',
          lien: '/admin/sessions',
          capture: 'admin-calendrier.jpg',
        },
        {
          k: '1.16',
          qui: 'Visiteur',
          etape: 'Créer un compte avec une adresse que vous consultez.',
          attendu: 'E-mail « Bienvenue sur E-Masterclass Big Five » avec le bouton « Accéder à mon espace ».',
        },
      ],
      bloque:
        'L’e-mail de bienvenue (1.16) ne part que lorsque l’envoi des e-mails est actif : domaine vérifié chez Resend, donc enregistrements DNS posés.',
    },
    {
      num: '2',
      titre: 'Achat complet',
      contexte: 'un compte apprenant de test, un module non acheté',
      controles: [
        {
          k: '2.1',
          qui: 'Apprenant',
          etape: 'Fiche d’un module non acheté → « Acheter ce module ».',
          attendu: 'Tunnel en trois étapes : compte, récapitulatif, paiement.',
        },
        {
          k: '2.2',
          qui: 'Apprenant',
          etape: 'Payer par Mobile Money (Orange ou MTN).',
          attendu: 'Écran de confirmation. Le module est ouvert dans « Mes modules ».',
        },
        {
          k: '2.3',
          qui: 'Apprenant',
          etape: 'Consulter sa boîte mail.',
          attendu: 'E-mail « Votre paiement est confirmé » : module, montant, moyen de paiement, référence.',
        },
        {
          k: '2.4',
          qui: 'Admin',
          etape: 'Ouvrir « Transactions & paiements ».',
          attendu: 'La transaction apparaît, statut « réussie ».',
          lien: '/admin/transactions',
        },
        {
          k: '2.5',
          qui: 'Apprenant',
          etape: 'Mon espace → Paramètres → historique d’achats.',
          attendu: 'La commande figure avec sa référence.',
          lien: '/mon-espace/parametres',
        },
      ],
      bloque:
        'Wave attend son activation par FeexPay, la carte attend la validation du dossier (KYC). Il n’y a pas de reçu PDF : le reçu, c’est l’e-mail et l’historique.',
    },
    {
      num: '3',
      titre: 'Certification',
      contexte: 'un module acheté',
      controles: [
        {
          k: '3.1',
          qui: 'Apprenant',
          etape: 'Regarder toutes les vidéos du module.',
          attendu: 'Progression à 100 %.',
        },
        {
          k: '3.2',
          qui: 'Apprenant',
          etape: 'Passer le quiz : 10 questions, 100 % requis, 3 tentatives par jour.',
          attendu: '« Quiz réussi ».',
        },
        {
          k: '3.3',
          qui: 'Apprenant',
          etape: 'Mes certificats → demander l’attestation.',
          attendu: 'Page imprimable avec QR code (Imprimer → PDF).',
          lien: '/mon-espace/certificats',
        },
        {
          k: '3.4',
          qui: 'Apprenant',
          etape: 'Consulter sa boîte mail.',
          attendu: 'E-mail « Votre attestation de participation est prête », avec le lien et le numéro.',
        },
      ],
      bloque:
        'La signature de la direction n’est pas encore fournie : l’emplacement est vide. Elle se téléverse dans Admin → Paramètres → Attestations et s’applique aussi aux attestations déjà délivrées.',
    },
    {
      num: '4',
      titre: 'Coaching collectif',
      contexte: 'Zoom réel, un compte formateur et un compte apprenant',
      controles: [
        {
          k: '4.1',
          qui: 'Admin',
          etape: 'Coaching collectif → Calendrier des sessions : créer une session aujourd’hui, dans 30 minutes.',
          attendu: 'La session est créée, la réunion Zoom aussi.',
          lien: '/admin/sessions',
        },
        {
          k: '4.2',
          qui: 'Apprenant',
          etape: 'Avec un module de la thématique et sa fiche complétée : Coaching collectif → Réserver.',
          attendu: 'Place réservée. E-mail de confirmation avec l’accès à la salle.',
          lien: '/mon-espace/sessions',
        },
        {
          k: '4.3',
          qui: 'Formateur',
          etape: 'Mes sessions → ouvrir la salle, 15 minutes avant.',
          attendu: '« Démarrer la session » : la réunion démarre, le formateur est hôte.',
          lien: '/formateur',
        },
        {
          k: '4.4',
          qui: 'Apprenant',
          etape: '« Rejoindre la session ».',
          attendu: 'Salle d’attente, puis entrée dans la réunion.',
        },
      ],
      bloque:
        'Si le formateur reste « en attente de l’hôte », il manque à l’application Zoom la portée `user:read:zak:admin`. La confirmation par e-mail dépend de l’envoi des e-mails.',
    },
    {
      num: '5',
      titre: 'Coaching privé',
      contexte: 'un formateur dont le coaching privé est activé',
      controles: [
        {
          k: '5.1',
          qui: 'Apprenant',
          etape: 'Fiche du formateur → « Réserver un coaching privé » → demande avec 3 créneaux.',
          attendu: 'Demande « en attente ».',
        },
        {
          k: '5.2',
          qui: 'Admin',
          etape: 'Coaching privé → Confirmer : créneau et durée.',
          attendu: 'E-mail à l’apprenant avec le montant (heures × tarif du formateur).',
          lien: '/admin/coaching-prive',
        },
        {
          k: '5.3',
          qui: 'Apprenant',
          etape: '« Accepter et payer » → Mobile Money.',
          attendu: 'Demande « payée », e-mail de confirmation.',
          lien: '/mon-espace/coaching-prive',
        },
        {
          k: '5.4',
          qui: 'Admin',
          etape: 'Planifier la séance avec une date et une heure réelles.',
          attendu: 'Réunion Zoom à cette date. E-mails à l’apprenant et au formateur.',
          lien: '/admin/coaching-prive',
        },
        {
          k: '5.5',
          qui: 'Formateur',
          etape: 'Coaching privé → ouvrir la salle.',
          attendu: 'La réunion démarre.',
        },
        {
          k: '5.6',
          qui: 'Apprenant',
          etape: 'Ouvrir la salle.',
          attendu: 'Il rejoint la réunion.',
        },
      ],
    },
    {
      num: '6',
      titre: 'Live Session',
      contexte: 'créer une séance qui commence dans 1 h 15, puis la publier',
      controles: [
        {
          k: '6.1',
          qui: 'Admin',
          etape: 'Live Sessions → réglage « visible sur le site pour » → « Tout le monde ».',
          attendu: 'Le réglage est enregistré. Tant qu’il reste sur « Personne », rien n’apparaît sur le site et aucun e-mail Live ne part.',
          lien: '/admin/live-sessions',
          capture: 'admin-live-visibilite.jpg',
        },
        {
          k: '6.2',
          qui: 'Visiteur',
          etape: 'Ouvrir la page Live Sessions, puis l’accueil.',
          attendu: 'La séance apparaît dans les deux.',
          lien: '/live-sessions',
        },
        {
          k: '6.3',
          qui: 'Visiteur',
          etape: 'Ouvrir la fiche de la séance.',
          attendu: 'Prérequis, ce que l’on apprend, formateur, date, prix (celui du module).',
        },
        {
          k: '6.4',
          qui: 'Apprenant',
          etape: '« Se connecter pour s’inscrire » → CGV → Mobile Money.',
          attendu: 'Fenêtre FeexPay au prix du module, puis « Vous êtes inscrit ».',
        },
        {
          k: '6.5',
          qui: 'Apprenant',
          etape: 'Consulter sa boîte mail.',
          attendu: 'Confirmation : horaire, formateur, prérequis, reçu, fichier .ics joint. Aucun lien Zoom.',
        },
        {
          k: '6.6',
          qui: 'Admin',
          etape: 'Ouvrir « Transactions & paiements ».',
          attendu: 'L’inscription apparaît comme un achat du module.',
          lien: '/admin/transactions',
        },
        {
          k: '6.7',
          qui: 'Apprenant',
          etape: 'Ouvrir le tableau de bord.',
          attendu: 'La carte de la Live Session est en tête de page, avec sa date et « Ajouter à mon agenda ».',
          lien: '/mon-espace',
          capture: 'apprenant-tableau-de-bord.jpg',
        },
        {
          k: '6.8',
          qui: 'Formateur',
          etape: 'Consulter sa boîte mail, la veille.',
          attendu: 'Rappel J-1 du formateur.',
        },
        {
          k: '6.9',
          qui: 'Formateur',
          etape: 'Mes Live Sessions, 30 minutes avant.',
          attendu: '« Animer sur Zoom » devient actif. La réunion démarre, le formateur est hôte.',
        },
        {
          k: '6.10',
          qui: 'Apprenant',
          etape: 'Consulter sa boîte mail, 10 minutes avant.',
          attendu: 'Rappel avec le lien de la salle.',
        },
        {
          k: '6.11',
          qui: 'Apprenant',
          etape: 'Ouvrir la salle, 15 minutes avant puis au début.',
          attendu: 'La salle est ouverte, il entre dans la réunion.',
        },
        {
          k: '6.12',
          qui: 'Apprenant',
          etape: 'Consulter sa boîte mail, à l’heure du début.',
          attendu: 'Rappel de début de séance.',
        },
        {
          k: '6.13',
          qui: 'Admin',
          etape: '« Terminer » la séance (ou attendre début + durée + 60 minutes).',
          attendu: 'Quiz et support ouverts côté apprenant.',
          lien: '/admin/live-sessions',
        },
        {
          k: '6.14',
          qui: 'Admin',
          etape: 'Déposer le support.',
          attendu: 'E-mail de fin aux inscrits.',
          lien: '/admin/live-sessions',
        },
      ],
      bloque:
        'Les rappels (6.8, 6.10, 6.12) dépendent de la planification en base (`supabase/planification-live.sql`) et de l’envoi des e-mails. Un apprenant inscrit à moins de 24 h ne reçoit pas de rappel J-1 : c’est normal.',
    },
    {
      num: '7',
      titre: 'Tracking',
      contexte: 'avec le mode Preview de Google Tag Manager',
      controles: [
        {
          k: '7.1',
          qui: 'Visiteur',
          etape: 'Refuser les cookies dans le bandeau, puis naviguer.',
          attendu: 'Aucune balise ne part.',
        },
        {
          k: '7.2',
          qui: 'Visiteur',
          etape: 'Accepter la mesure d’audience seule.',
          attendu: 'GA4 part, Meta ne part pas.',
        },
        {
          k: '7.3',
          qui: 'Visiteur',
          etape: 'Accepter le marketing.',
          attendu: 'Meta part.',
        },
        {
          k: '7.4',
          qui: 'Apprenant',
          etape: 'Ouvrir la fiche d’un module déjà acheté.',
          attendu: 'Pas d’événement ViewContent.',
        },
        {
          k: '7.5',
          qui: 'Apprenant',
          etape: 'Acheter un module, un coaching privé, une Live Session.',
          attendu: 'Purchase avec `content_category` : `module`, `coaching_prive` ou `live_session`.',
        },
      ],
    },
  ],
}
