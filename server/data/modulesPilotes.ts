/**
 * Fiches des modules pilotes livrés le 20/10/2026, rédigées à partir des
 * transcriptions validées (intro, introduction, conclusion) et des compétences
 * listées dans les quiz. Clé : l'identifiant du dossier de livraison.
 *
 * Source unique : `scripts/integrer-modules-pilotes.ts` en tire le SQL de la
 * base en ligne, `db.ts` le jeu de données local.
 *
 * L'état antérieur des fiches est conservé dans
 * `docs/sauvegardes/modules-avant-pilotes-2026-10-20.json`.
 */
export interface FicheModule {
  id: string
  /** true : le module n'existe pas encore en base. */
  nouveau?: boolean
  slug: string
  numero: number
  titre: string
  programme: 'entrepreneurs' | 'social-media'
  thematiqueId: string
  formateurId: string
  promesse: string
  pourquoi: string
  pourQui: string[]
  prerequis: string
  acquis: string[]
  livrable: string
  faq: { question: string; reponse: string }[]
  pointsForts: string[]
  seo: { motCle: string; titre: string; description: string }
  /** Titres des chapitres, position 0 comprise, tels que livrés. Le script
   *  d'intégration vérifie qu'ils correspondent aux transcriptions. */
  chapitres: string[]
}

/** Les deux réponses communes à toutes les fiches du catalogue (`faq` ne porte
 *  que les questions propres au module). */
export const FAQ_COMMUNE = [
  {
    question: 'La session de coaching collectif est-elle comprise dans le prix ?',
    reponse: 'Oui. L’achat donne accès aux sessions liées à la thématique du module, selon le calendrier et les places disponibles. Votre fiche apprenant devra être complétée avant votre participation.',
  },
  {
    question: 'Puis-je revoir le module après l’avoir terminé ?',
    reponse: 'Oui. Vous conservez un accès à vie au module depuis votre espace apprenant.',
  },
]

export const FICHES = {
  ENT_M04: {
    id: 'mod-trouver-ses-premiers-clients',
    slug: 'construire-une-offre-simple-et-commencer-a-vendre',
    numero: 4,
    titre: 'Comment construire une offre simple et commencer à vendre',
    programme: 'entrepreneurs',
    thematiqueId: 'th-ent-vente',
    formateurId: 'for-soboro',
    promesse: 'Lancez votre activité avec une offre de lancement claire et obtenez vos premières ventes sans budget, sans attendre que tout soit parfait.',
    pourquoi: 'Votre première vente ne dépend ni d’un logo, ni d’un site, ni d’un nombre d’abonnés : elle dépend d’une offre simple, présentée aux bonnes personnes. Ce module vous aide à sortir du piège de l’attente, à construire une offre de lancement qui donne envie d’acheter, puis à la vendre avec votre réseau et des canaux gratuits.',
    pourQui: [
      'Vous avez un produit ou un service qui fonctionne, mais pas encore de clients réguliers.',
      'Vous repoussez votre lancement en attendant d’être « prêt ».',
      'Vous démarrez sans budget publicitaire.',
    ],
    prerequis: 'Aucun prérequis particulier. Il suffit d’avoir un produit ou un service à proposer.',
    acquis: [
      'dépasser le piège de l’attente et démarrer avec ce que vous avez ;',
      'construire une offre de lancement simple, à un prix accessible ;',
      'rendre l’offre pressante grâce à des limites de durée, de quantité et des bonus ;',
      'activer votre réseau sans le braquer, avec la méthode V.E.N.T.E. ;',
      'gérer les refus et poser dès maintenant des actions à impact immédiat.',
    ],
    livrable: 'Votre offre de lancement rédigée, avec son prix, ses limites et ses bonus, et la liste des premières personnes à qui la présenter.',
    faq: [
      {
        question: 'Faut-il un site internet ou une page très suivie pour appliquer la méthode ?',
        reponse: 'Non. Le module part du principe que vous démarrez sans site, sans logo et avec peu d’abonnés : il s’appuie sur votre réseau et sur des canaux gratuits.',
      },
    ],
    pointsForts: [],
    seo: {
      motCle: 'offre de lancement',
      titre: 'Construire une offre simple et commencer à vendre',
      description: 'Construisez une offre de lancement claire et obtenez vos premières ventes sans budget, avec Lyle Soboro. Module vidéo E-Masterclass Big Five.',
    },
    chapitres: [
      'Présentation du module',
      'Introduction',
      'Définitions',
      'Construire une offre de lancement qui donne envie',
      'Vendre sans budget : réseau et canaux rapides',
      'Premières actions à impact immédiat',
      'Conclusion',
    ],
  },
  ENT_M05: {
    id: 'mod-vendre-sans-site-web-whatsapp-business',
    slug: 'convertir-les-conversations-en-vente',
    numero: 5,
    titre: 'Convertir les conversations en vente',
    programme: 'entrepreneurs',
    thematiqueId: 'th-ent-vente',
    formateurId: 'for-soboro',
    promesse: 'Menez vos conversations commerciales jusqu’à la vente : écouter, proposer, répondre aux objections et relancer sans harceler.',
    pourquoi: 'Des prospects vous écrivent, mais les échanges s’arrêtent avant l’achat. Vendre trop vite, réciter le même discours ou relancer tous les jours fait fuir. Ce module vous donne des scripts de conversation qui convertissent, une manière d’accueillir les objections comme des signaux d’achat, et un plan de relance en trois étapes.',
    pourQui: [
      'Vous recevez des demandes, mais peu se transforment en ventes.',
      'Vous ne savez pas quoi répondre à « c’est cher ».',
      'Vous hésitez entre relancer et laisser tomber.',
    ],
    prerequis: 'Aucun prérequis particulier. Le module prolonge « Comment construire une offre simple et commencer à vendre ».',
    acquis: [
      'écouter et reformuler le besoin avant de parler de prix ;',
      'mener une conversation de vente avec un script adapté à chaque prospect ;',
      'conclure avec des questions fermées ;',
      'faire émerger et traiter les objections, dont « c’est cher », sans baisser vos prix ;',
      'relancer en trois étapes sans donner le sentiment de harceler.',
    ],
    livrable: 'Vos scripts de conversation, vos réponses aux objections les plus fréquentes et votre plan de relance en trois étapes.',
    faq: [
      {
        question: 'Les scripts fonctionnent-ils sur WhatsApp et en messagerie ?',
        reponse: 'Oui. Les scripts portent sur la conduite de la conversation : ils s’appliquent aussi bien par message que de vive voix, en les adaptant à chaque prospect.',
      },
    ],
    pointsForts: [],
    seo: {
      motCle: 'conversation de vente',
      titre: 'Convertir les conversations en vente',
      description: 'Scripts, objections et relances : transformez vos conversations commerciales en ventes, avec Lyle Soboro. Module vidéo E-Masterclass Big Five.',
    },
    chapitres: [
      'Présentation du module',
      'Introduction',
      'Définitions',
      'Vendre en conversation : les scripts qui convertissent',
      'Objections et relances : conclure sans harceler',
      'Simulations et jeux de rôle',
    ],
  },
  ENT_M08: {
    id: 'mod-contenus-qui-attirent-des-clients',
    slug: 'creer-du-contenu-qui-attire-les-clients',
    numero: 8,
    titre: 'Créer du contenu qui attire les clients',
    programme: 'entrepreneurs',
    thematiqueId: 'th-ent-visibilite',
    formateurId: 'for-othniel',
    promesse: 'Transformez vos publications en contenus qui suscitent l’intérêt, créent la confiance et génèrent des demandes concrètes.',
    pourquoi: 'Des vues et des likes ne font pas des clients. Un bon contenu n’attire pas tout le monde : il attire les bonnes personnes, avec le bon message, au bon moment. Ce module vous apprend à connaître votre audience, à bâtir une stratégie de contenu, à écrire des posts qui convertissent et à faire de vos abonnés une communauté engagée.',
    pourQui: [
      'Vous publiez régulièrement, sans clients à la clé.',
      'Vous avez des abonnés, mais peu de réactions ou de ventes.',
      'Vous dépendez de la publicité pour obtenir des résultats.',
    ],
    prerequis: 'Aucun prérequis particulier. Une page professionnelle sur un réseau social permet d’appliquer les exercices.',
    acquis: [
      'définir votre persona et partir de ce que vit votre client ;',
      'alterner les piliers de contenu et raconter l’histoire de votre activité ;',
      'structurer un post qui convertit ;',
      'planifier vos publications avec un calendrier éditorial ;',
      'transformer vos abonnés en communauté engagée ;',
      'choisir vos indicateurs selon l’objectif et utiliser la publicité à bon escient.',
    ],
    livrable: 'Votre persona, vos piliers de contenu et un calendrier éditorial prêt à publier.',
    faq: [
      {
        question: 'Faut-il faire de la publicité pour appliquer le module ?',
        reponse: 'Non. Le module porte d’abord sur le contenu organique. Un chapitre bonus explique quand la publicité devient utile et comment suivre ses résultats.',
      },
    ],
    pointsForts: [],
    seo: {
      motCle: 'contenu qui attire les clients',
      titre: 'Créer du contenu qui attire les clients',
      description: 'Persona, stratégie de contenu, posts qui convertissent et communauté : attirez des clients avec vos publications, avec Coury Othniel.',
    },
    chapitres: [
      'Présentation du module',
      'Introduction',
      'C’est quoi un contenu qui attire ?',
      'Comprendre et connaître son audience',
      'Créer une stratégie de contenu efficace',
      'Écrire des contenus qui convertissent',
      'Bâtir une communauté engagée',
      'Bonus : KPIs et publicité',
      'Conclusion',
    ],
  },
  ENT_M10: {
    id: 'mod-transformer-tiktok-en-machine-dacquisition-client',
    nouveau: true,
    slug: 'transformer-tiktok-en-machine-dacquisition-client',
    numero: 10,
    titre: 'Transformer TikTok en machine d’acquisition client',
    programme: 'entrepreneurs',
    thematiqueId: 'th-ent-visibilite',
    formateurId: 'for-soboro',
    promesse: 'Faites de votre compte TikTok une source régulière de clients : des contenus qui vendent, des lives structurés et des statistiques qui guident vos choix.',
    pourquoi: 'Des vues pour des vues ne servent à rien quand on vend un produit ou un service. Pour que TikTok amène des clients, il faut un objectif, des contenus qui poussent à agir, un moyen simple de vous contacter et de la régularité. Ce module vous montre comment construire votre tunnel de vente TikTok, structurer vos contenus et vos lives, et lire vos statistiques pour améliorer vos résultats.',
    pourQui: [
      'Vous publiez sur TikTok, mais vos vues ne se transforment pas en ventes.',
      'Vous voulez utiliser les lives pour vendre.',
      'Vous ne savez pas lire les statistiques de vos vidéos.',
    ],
    prerequis: 'Avoir un compte TikTok pour votre activité.',
    acquis: [
      'comprendre et construire votre tunnel de vente TikTok ;',
      'bâtir vos contenus à partir de votre cible, en combinant trois types de contenus ;',
      'fixer un rythme de publication tenable et organiser votre création ;',
      'formuler des appels à l’action et animer un live qui vend ;',
      'juger une vidéo sur sa capacité à vendre, notamment par la durée de visionnage.',
    ],
    livrable: 'Votre stratégie de contenu TikTok, avec votre cible, votre calendrier de publication et vos appels à l’action.',
    faq: [
      {
        question: 'Faut-il déjà avoir beaucoup d’abonnés sur TikTok ?',
        reponse: 'Non. Le module explique comment gagner en visibilité puis transformer les vues en clients, quel que soit le nombre d’abonnés de départ.',
      },
    ],
    pointsForts: [],
    seo: {
      motCle: 'TikTok acquisition client',
      titre: 'Transformer TikTok en machine d’acquisition client',
      description: 'Tunnel de vente, contenus, lives et statistiques : faites de TikTok une source de clients, avec Lyle Soboro. Module vidéo E-Masterclass Big Five.',
    },
    chapitres: [
      'Présentation du module',
      'Introduction',
      'Définitions',
      'Stratégie de contenu : cible et calendrier',
      'Transformer les vues en clients',
      'Lire ses statistiques',
      'Conclusion',
    ],
  },
  SM_M05: {
    // Fiche déjà réécrite d'après le contenu réel : seuls le titre, les acquis
    // et le livrable sont alignés sur la vidéo livrée.
    id: 'mod-accroches-qui-stoppent-le-scroll-et-ia-copywriting',
    slug: 'accroches-qui-stoppent-le-scroll-et-ia-copywriting',
    numero: 5,
    titre: 'Accroches qui stoppent le scroll & IA dans le copywriting',
    programme: 'social-media',
    thematiqueId: 'th-sm-copywriting',
    formateurId: 'for-othniel',
    promesse: 'Apprenez à construire plus rapidement des accroches capables de retenir l’attention, avec une méthode claire et l’IA comme assistant.',
    pourquoi: '<p><strong>Une publication</strong> peut être utile, bien conçue et correctement ciblée sans retenir l’attention si son ouverture manque d’impact. Ce module vous aide à structurer vos premiers mots, varier vos angles et produire plus rapidement sans déléguer votre réflexion à l’IA.</p>',
    pourQui: [
      'Vous gérez les réseaux sociaux d’une marque ou de plusieurs clients.',
      'Vos contenus peinent à retenir l’attention.',
      'Vous souhaitez produire plus rapidement sans sacrifier la qualité.',
    ],
    prerequis: 'Aucun prérequis particulier. La méthode est expliquée et appliquée progressivement pendant le module.',
    acquis: [
      'comprendre le rôle d’une accroche et la distinguer du clickbait ;',
      'appliquer la formule d’une accroche efficace et soigner la première ligne visible ;',
      'rédiger vos prompts avec la méthode CRAFT et itérer avec l’IA ;',
      'connaître les limites de l’IA et réécrire ses propositions ;',
      'choisir les indicateurs à suivre selon votre objectif.',
    ],
    livrable: 'Vos propres accroches adaptées à votre secteur, travaillées dans les deux exercices du module, et une méthode de prompt réutilisable avec l’IA.',
    faq: [
      {
        question: 'Ai-je besoin d’un outil d’IA payant ?',
        reponse: 'Non. Le module ne dépend pas d’un outil payant particulier. Les fonctionnalités nécessaires et les différentes options sont présentées pendant le module.',
      },
      {
        question: 'La méthode peut-elle s’appliquer à tous les secteurs ?',
        reponse: 'Oui. Les principes enseignés sont adaptables à différents secteurs. Les exercices vous permettent de travailler directement à partir de votre activité, de votre marque ou de vos clients.',
      },
    ],
    pointsForts: [],
    seo: {
      motCle: 'accroches réseaux sociaux',
      titre: 'Accroches qui stoppent le scroll & IA dans le copywriting',
      description: 'Écrivez des accroches qui retiennent l’attention et utilisez l’IA sans perdre votre ton, avec Coury Othniel. Module vidéo E-Masterclass Big Five.',
    },
    chapitres: [
      'Présentation du module',
      'Introduction',
      'Définitions',
      'Anatomie d’une accroche qui marche',
      'IA & copywriting : forces et limites',
      'Indicateurs à suivre',
      'Conclusion',
    ],
  },
} satisfies Record<string, FicheModule>
