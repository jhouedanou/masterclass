import type {
  Acces,
  Article,
  CandidatureFormateur,
  Certificat,
  Chapitre,
  Commande,
  DemandeCoachingPrive,
  EntreeJournal,
  Formateur,
  InscriptionSession,
  LigneScript,
  Module,
  NoteFormateur,
  Persona,
  Programme,
  QuestionReponse,
  SessionCoaching,
  Thematique,
  SujetSession,
  Transaction,
  Utilisateur,
} from '#shared/types'

/**
 * Jeu de données de démonstration en mémoire, calé sur la maquette Claude Design.
 * Il tient lieu de couche de persistance tant que la base réelle n'est pas branchée.
 */

/** Prix unique affiché partout dans la maquette. */
export const PRIX_MODULE_FCFA = 10_000
export const DUREE_MODULE_MINUTES = 60
export const COACHING_PRIVE_FCFA_HEURE = 50_000
export const COACHING_COLLECTIF = { dureeMinutes: 120, places: 25 }

export const programmes: Programme[] = [
  {
    id: 'prg-social-media',
    slug: 'social-media',
    nom: 'Social Média',
    surtitreHero: 'Programme Social Média',
    h1Variable: 'Restez dans la course.',
    descriptionHero:
      'Choisissez parmi 9 modules de 60 minutes pour renforcer des compétences précises en stratégie, contenu et plateformes Social Media. Accès à vie et sessions de coaching collectif.',
    ctaHero: 'Découvrir le programme Social Média',
    descriptionProgramme:
      'Des modules indépendants conçus pour les Social Media Managers, Community Managers et professionnels de la communication qui souhaitent actualiser leurs pratiques et renforcer des compétences ciblées.',
    descriptionCarte:
      'Pour les professionnels du Social Media et de la communication qui souhaitent actualiser leurs pratiques et renforcer des compétences précises.',
    couleur: '#80368D',
    seo: {
      motClePrincipal: 'formation social média Abidjan',
      title: 'Programme Social Média | E-Masterclass Big Five',
      metaDescription:
        'Neuf modules de 60 minutes pour renforcer des compétences précises en stratégie, contenu et plateformes Social Media. 10 000 FCFA TTC par module, accès à vie.',
      indexable: true,
    },
  },
  {
    id: 'prg-entrepreneurs',
    slug: 'entrepreneurs',
    nom: 'Entrepreneurs',
    surtitreHero: 'Programme Entrepreneurs',
    h1Variable: 'Soyez à jour.',
    descriptionHero:
      'Choisissez parmi 9 modules de 60 minutes pour renforcer les compétences utiles au développement de votre activité : valider une idée, fixer vos prix, vendre et gagner en visibilité.',
    ctaHero: 'Découvrir le programme Entrepreneurs',
    descriptionProgramme:
      'Des modules indépendants conçus pour les entrepreneurs en activité ou en lancement qui souhaitent renforcer des compétences pratiques et faire évoluer leur activité.',
    descriptionCarte:
      'Pour les entrepreneurs en activité ou en lancement qui souhaitent renforcer les compétences utiles au développement de leur activité.',
    couleur: '#29358B',
    seo: {
      motClePrincipal: 'formation entrepreneur Côte d’Ivoire',
      title: 'Programme Entrepreneurs | E-Masterclass Big Five',
      metaDescription:
        'Neuf modules de 60 minutes pour valider une idée, fixer ses prix, vendre et gagner en visibilité. 10 000 FCFA TTC par module, accès à vie.',
      indexable: true,
    },
  },
]

export const thematiques: Thematique[] = [
  { id: 'th-sm-fondations', numero: 1, nom: 'Fondations stratégiques', programme: 'social-media' },
  { id: 'th-sm-copywriting', numero: 2, nom: 'Copywriting & contenu', programme: 'social-media' },
  { id: 'th-sm-plateformes', numero: 3, nom: 'Plateformes', programme: 'social-media' },
  { id: 'th-ent-fondations', numero: 1, nom: 'Fondations du business', programme: 'entrepreneurs' },
  { id: 'th-ent-vente', numero: 2, nom: 'Vente & acquisition', programme: 'entrepreneurs' },
  { id: 'th-ent-visibilite', numero: 3, nom: 'Visibilité', programme: 'entrepreneurs' },
]

export const formateurs: Formateur[] = [
  {
    id: 'for-declercq',
    slug: 'jeremie-de-clercq',
    nom: 'Jérémie De Clercq',
    expertise: 'Stratégie business & entrepreneuriat',
    bio: "Jérémie De Clercq intervient sur les modules consacrés à la structuration des fondamentaux d’une activité : modèle économique, coûts, prix et lecture du marché. Il accompagne des entrepreneurs et des équipes marketing en Afrique francophone.",
    programmePrincipal: 'entrepreneurs',
    photo: '/images/formateurs/jeremie-de-clercq.svg',
    ficheComplete: true,
    coachingPriveFcfaHeure: COACHING_PRIVE_FCFA_HEURE,
    seo: { indexable: true },
  },
  {
    id: 'for-othniel',
    slug: 'coury-othniel',
    nom: 'Coury Othniel',
    expertise: 'Copywriting & contenu',
    bio: "Copywriter spécialisé dans les contenus qui retiennent l’attention sur les réseaux sociaux en Afrique francophone. Il anime les modules de rédaction persuasive des deux programmes.",
    programmePrincipal: 'social-media',
    photo: '/images/formateurs/coury-othniel.svg',
    ficheComplete: true,
    coachingPriveFcfaHeure: COACHING_PRIVE_FCFA_HEURE,
    seo: { indexable: true },
  },
  {
    id: 'for-waffo',
    slug: 'kevine-waffo',
    nom: 'Kevine Waffo',
    expertise: 'Stratégie social media & ciblage',
    bio: "Kevine Waffo construit des plans d’action social media pour des marques et des institutions : diagnostic, ciblage, planning éditorial et pilotage des publications.",
    programmePrincipal: 'social-media',
    photo: '/images/formateurs/kevine-waffo.svg',
    ficheComplete: true,
    coachingPriveFcfaHeure: COACHING_PRIVE_FCFA_HEURE,
    seo: { indexable: true },
  },
  {
    id: 'for-cocou',
    slug: 'emmanuel-cocou',
    nom: 'Emmanuel Cocou',
    expertise: 'Offres & positionnement',
    bio: "Emmanuel Cocou aide les entrepreneurs à transformer une compétence en offre lisible : périmètre, promesse, livrables et argumentaire de vente.",
    programmePrincipal: 'entrepreneurs',
    photo: '/images/formateurs/emmanuel-cocou.svg',
    ficheComplete: true,
    coachingPriveFcfaHeure: COACHING_PRIVE_FCFA_HEURE,
    seo: { indexable: true },
  },
  {
    id: 'for-nontondji',
    slug: 'maurice-nontondji',
    nom: 'Maurice Nontondji',
    expertise: 'LinkedIn : algorithme & prospection',
    bio: "Maurice Nontondji travaille la visibilité professionnelle sur LinkedIn : compréhension de l’algorithme, formats de publication et prospection directe.",
    programmePrincipal: 'social-media',
    photo: '/images/formateurs/maurice-nontondji.svg',
    ficheComplete: true,
    coachingPriveFcfaHeure: COACHING_PRIVE_FCFA_HEURE,
    seo: { indexable: true },
  },
  {
    id: 'for-soboro',
    slug: 'lyle-soboro',
    nom: 'Lyle Soboro',
    expertise: 'Vente, TikTok & acquisition client',
    bio: "Lyle Soboro accompagne des vendeurs et des commerces dans l’acquisition client sans site web : WhatsApp Business, TikTok et tunnels de vente simples.",
    programmePrincipal: 'entrepreneurs',
    photo: '/images/formateurs/lyle-soboro.svg',
    ficheComplete: true,
    coachingPriveFcfaHeure: COACHING_PRIVE_FCFA_HEURE,
    seo: { indexable: true },
  },
  {
    id: 'for-akinocho',
    slug: 'nouroudine-akinocho',
    nom: 'Nouroudine Akinocho',
    expertise: 'Visibilité & croissance en ligne',
    bio: "Nouroudine Akinocho intervient sur la visibilité en ligne des petites structures : référencement local, présence sur les plateformes et croissance organique.",
    programmePrincipal: 'entrepreneurs',
    photo: '/images/formateurs/nouroudine-akinocho.svg',
    ficheComplete: true,
    coachingPriveFcfaHeure: COACHING_PRIVE_FCFA_HEURE,
    seo: { indexable: true },
  },
]

const faqCommune: QuestionReponse[] = [
  {
    question: 'La session de coaching collectif est-elle comprise dans le prix ?',
    reponse:
      'Oui. L’achat donne accès aux sessions liées à la thématique du module, selon le calendrier et les places disponibles. Votre fiche apprenant devra être complétée avant votre participation.',
  },
  {
    question: 'Puis-je revoir le module après l’avoir terminé ?',
    reponse: 'Oui. Vous conservez un accès à vie au module depuis votre espace apprenant.',
  },
]

/** Script de démonstration : la transcription réelle sera importée à la production. */
function scriptType(titre: string): LigneScript[] {
  return [
    { temps: '00:12', texte: `Dans ce passage, nous posons le cadre : ${titre.toLowerCase()}.` },
    { temps: '04:30', texte: 'On déroule la méthode pas à pas, sur un cas réel.' },
    { temps: '09:05', texte: 'Puis on met en pratique, avec vos propres données.' },
  ]
}

function chapitres(...titres: string[]): Chapitre[] {
  return [
    {
      libelle: 'Introduction',
      titre: 'Présentation du module et de votre formateur',
      dureeMinutes: 6,
      script: scriptType('la présentation du module'),
    },
    ...titres.map((titre, i) => ({
      libelle: `Chapitre ${i + 1}`,
      titre,
      dureeMinutes: 18,
      script: scriptType(titre),
    })),
  ]
}

interface Brouillon {
  slug: string
  numero: number
  titre: string
  programme: Module['programme']
  thematiqueId: string
  formateurId: string
  promesse: string
  pourquoi: string
  pourQui: string[]
  prerequis: string
  chapitres: Chapitre[]
  acquis: string[]
  livrable: string
  faq?: QuestionReponse[]
  statut?: Module['statut']
}

function moduleComplet(b: Brouillon): Module {
  const statut = b.statut ?? 'disponible'
  return {
    id: `mod-${b.slug}`,
    slug: b.slug,
    numero: b.numero,
    titre: b.titre,
    programme: b.programme,
    thematiqueId: b.thematiqueId,
    formateurId: b.formateurId,
    promesse: b.promesse,
    pourquoi: b.pourquoi,
    pourQui: b.pourQui,
    prerequis: b.prerequis,
    chapitres: b.chapitres,
    acquis: b.acquis,
    livrable: b.livrable,
    faq: [...(b.faq ?? []), ...faqCommune],
    dureeMinutes: DUREE_MODULE_MINUTES,
    prixFcfa: PRIX_MODULE_FCFA,
    statut,
    publieLe: statut === 'disponible' ? '2026-06-01' : null,
    majLe: '2026-08-01',
    // Fiche « à venir » : non indexée par défaut (spec SEO §5).
    seo: { indexable: statut === 'disponible' },
  }
}

export const modules: Module[] = [
  // ---------- Social Média ----------
  moduleComplet({
    slug: 'comprendre-le-business-du-client',
    numero: 1,
    titre: 'Comprendre le business du client',
    programme: 'social-media',
    thematiqueId: 'th-sm-fondations',
    formateurId: 'for-declercq',
    promesse:
      'Apprenez à lire l’activité d’une marque avant de produire le moindre contenu, pour proposer une stratégie qui sert ses objectifs.',
    pourquoi:
      'Un contenu peut être soigné et régulier sans rien apporter à l’entreprise qui le publie. Ce module vous donne la grille de lecture qui permet de comprendre un modèle économique, ses marges et ses priorités, puis d’en déduire ce que le social media doit réellement produire.',
    pourQui: [
      'Vous gérez les réseaux sociaux d’une marque ou de plusieurs clients.',
      'Vos recommandations sont difficiles à défendre en réunion.',
      'Vous souhaitez relier vos contenus aux objectifs commerciaux.',
    ],
    prerequis: 'Aucun prérequis particulier.',
    chapitres: chapitres(
      'Lire un modèle économique en quinze minutes',
      'Identifier les priorités commerciales du client',
      'Traduire ces priorités en objectifs social media',
    ),
    acquis: [
      'analyser le modèle économique d’une marque ;',
      'identifier ses priorités commerciales ;',
      'formuler des objectifs social media alignés.',
    ],
    livrable:
      'Une fiche de cadrage client réutilisable pour chaque nouvelle marque ou chaque nouveau projet.',
  }),
  moduleComplet({
    slug: 'plan-daction-social-media-strategie-et-ciblage',
    numero: 2,
    titre: 'Plan d’action social media : Stratégie & Ciblage',
    programme: 'social-media',
    thematiqueId: 'th-sm-fondations',
    formateurId: 'for-waffo',
    promesse:
      'Construisez un plan d’action social media qui part d’une cible précise plutôt que d’une intuition.',
    pourquoi:
      'Publier pour « tout le monde » revient à ne parler à personne. Ce module structure le diagnostic, le choix de la cible et les axes stratégiques qui en découlent, avec des arbitrages assumés.',
    pourQui: [
      'Vous démarrez sur un nouveau compte ou une nouvelle marque.',
      'Vos publications touchent une audience trop large ou mal qualifiée.',
      'Vous devez présenter une stratégie à un décideur.',
    ],
    prerequis: 'Aucun prérequis particulier.',
    chapitres: chapitres(
      'Diagnostic : où en est réellement le compte',
      'Définir une cible et ses points de friction',
      'Formuler trois axes stratégiques défendables',
    ),
    acquis: [
      'poser un diagnostic factuel ;',
      'définir une cible exploitable ;',
      'construire un plan d’action argumenté.',
    ],
    livrable: 'Un plan d’action social media sur une page, prêt à être présenté.',
  }),
  moduleComplet({
    slug: 'plan-daction-social-media-planning-editorial',
    numero: 3,
    titre: 'Plan d’action social media : Planning éditorial',
    programme: 'social-media',
    thematiqueId: 'th-sm-fondations',
    formateurId: 'for-waffo',
    promesse:
      'Transformez une stratégie en planning tenable, avec des formats et un rythme que vous pourrez réellement soutenir.',
    pourquoi:
      'La régularité échoue rarement par manque d’idées : elle échoue par manque de système. Ce module installe un planning éditorial calibré sur vos moyens réels de production.',
    pourQui: [
      'Vous publiez de façon irrégulière.',
      'Vous manquez d’idées en fin de mois.',
      'Vous travaillez seul ou avec une petite équipe.',
    ],
    prerequis: 'Avoir défini une cible et des axes stratégiques.',
    chapitres: chapitres(
      'Choisir ses piliers et ses formats',
      'Calibrer un rythme soutenable',
      'Alimenter une banque d’idées qui se recharge',
    ),
    acquis: [
      'construire un planning éditorial mensuel ;',
      'choisir des formats adaptés à ses moyens ;',
      'anticiper la production de contenu.',
    ],
    livrable: 'Un planning éditorial mensuel complété et une banque d’idées de départ.',
  }),
  moduleComplet({
    slug: 'formules-de-redaction-persuasive',
    numero: 4,
    titre: 'Formules de rédaction persuasive',
    programme: 'social-media',
    thematiqueId: 'th-sm-copywriting',
    formateurId: 'for-othniel',
    promesse:
      'Appliquez des structures de rédaction éprouvées pour écrire plus vite des messages qui portent.',
    pourquoi:
      'Devant une page blanche, la qualité dépend du temps disponible. Les formules de rédaction suppriment cette dépendance : elles donnent une ossature au message et libèrent l’attention pour le fond.',
    pourQui: [
      'Vous écrivez régulièrement pour les réseaux sociaux.',
      'Vos textes manquent de structure ou de chute.',
      'Vous voulez réduire votre temps de rédaction.',
    ],
    prerequis: 'Aucun prérequis particulier.',
    chapitres: chapitres(
      'Les structures de message qui fonctionnent',
      'Adapter une formule à son secteur',
      'Réécrire : le passage qui fait la différence',
    ),
    acquis: [
      'utiliser plusieurs structures de rédaction ;',
      'adapter une formule à son contexte ;',
      'réécrire un texte de façon méthodique.',
    ],
    livrable: 'Un carnet de formules annotées et adaptées à votre activité.',
  }),
  moduleComplet({
    slug: 'accroches-qui-stoppent-le-scroll-et-ia-copywriting',
    numero: 5,
    titre: 'Accroches qui stoppent le scroll & IA copywriting',
    programme: 'social-media',
    thematiqueId: 'th-sm-copywriting',
    formateurId: 'for-othniel',
    promesse:
      'Apprenez à construire plus rapidement des accroches capables de retenir l’attention, avec une méthode claire et l’IA comme assistant.',
    pourquoi:
      'Une publication peut être utile, bien conçue et correctement ciblée sans retenir l’attention si son ouverture manque d’impact. Ce module vous aide à structurer vos premiers mots, varier vos angles et produire plus rapidement sans déléguer votre réflexion à l’IA.',
    pourQui: [
      'Vous gérez les réseaux sociaux d’une marque ou de plusieurs clients.',
      'Vos contenus peinent à retenir l’attention.',
      'Vous souhaitez produire plus rapidement sans sacrifier la qualité.',
    ],
    prerequis:
      'Aucun prérequis particulier. La méthode est expliquée et appliquée progressivement pendant le module.',
    chapitres: chapitres(
      'Anatomie d’une accroche qui stoppe le scroll',
      'Écrire 10 accroches en 15 minutes : la méthode',
      'Utiliser l’IA comme assistant copywriting, pas comme remplaçant',
    ),
    acquis: [
      'reconnaître les éléments qui rendent une accroche plus efficace ;',
      'produire plusieurs propositions rapidement ;',
      'utiliser l’IA pour enrichir la réflexion et varier les angles.',
    ],
    livrable:
      'Une bibliothèque personnelle de 30 accroches adaptées à votre secteur, accompagnée d’une routine de travail pour produire plus rapidement de nouvelles propositions avec l’aide de l’IA.',
    faq: [
      {
        question: 'Ai-je besoin d’un outil d’IA payant ?',
        reponse:
          'Non. Le module ne dépend pas d’un outil payant particulier. Les fonctionnalités nécessaires et les différentes options sont présentées pendant le module.',
      },
      {
        question: 'La méthode peut-elle s’appliquer à tous les secteurs ?',
        reponse:
          'Oui. Les principes enseignés sont adaptables à différents secteurs. Les exercices vous permettent de travailler directement à partir de votre activité, de votre marque ou de vos clients.',
      },
    ],
  }),
  moduleComplet({
    slug: 'creer-un-buzz-sur-les-reseaux-sociaux',
    numero: 6,
    titre: 'Créer un buzz sur les réseaux sociaux',
    programme: 'social-media',
    thematiqueId: 'th-sm-copywriting',
    formateurId: 'for-othniel',
    promesse:
      'Comprenez ce qui déclenche réellement la circulation d’un contenu, et ce qu’il est raisonnable d’en attendre.',
    pourquoi:
      'Le buzz n’est pas un objectif de communication : c’est une conséquence. Ce module démonte les mécaniques de diffusion et distingue ce qui se pilote de ce qui relève du hasard.',
    pourQui: [
      'Vous travaillez sur une marque grand public.',
      'On vous demande régulièrement « du viral ».',
      'Vous souhaitez arbitrer entre visibilité et réputation.',
    ],
    prerequis: 'Aucun prérequis particulier.',
    chapitres: chapitres(
      'Ce qui fait circuler un contenu',
      'Concevoir un contenu conçu pour être partagé',
      'Gérer les retombées et les risques',
    ),
    acquis: [
      'identifier les ressorts de diffusion ;',
      'concevoir un contenu partageable ;',
      'anticiper les risques de réputation.',
    ],
    livrable: 'Une grille d’évaluation des risques et opportunités avant publication.',
    statut: 'en-preparation',
  }),
  moduleComplet({
    slug: 'linkedin-algorithme-et-prospection',
    numero: 7,
    titre: 'LinkedIn : algorithme & prospection',
    programme: 'social-media',
    thematiqueId: 'th-sm-plateformes',
    formateurId: 'for-nontondji',
    promesse:
      'Utilisez LinkedIn comme un canal de prospection, pas seulement comme une vitrine professionnelle.',
    pourquoi:
      'LinkedIn récompense des comportements précis. Ce module explique ce que la plateforme valorise, puis construit une routine de publication et de prise de contact qui tient en trente minutes par jour.',
    pourQui: [
      'Vous vendez à des professionnels.',
      'Votre profil reçoit peu de visites.',
      'Vos prises de contact restent sans réponse.',
    ],
    prerequis: 'Disposer d’un profil LinkedIn actif.',
    chapitres: chapitres(
      'Ce que l’algorithme valorise réellement',
      'Un profil qui convertit les visites',
      'Une routine de prospection en trente minutes par jour',
    ),
    acquis: [
      'optimiser son profil ;',
      'publier des formats adaptés ;',
      'structurer une séquence de prise de contact.',
    ],
    livrable: 'Une séquence de prospection en cinq messages, prête à personnaliser.',
  }),
  moduleComplet({
    slug: 'instagram-formats-et-croissance',
    numero: 8,
    titre: 'Instagram : formats et croissance',
    programme: 'social-media',
    thematiqueId: 'th-sm-plateformes',
    formateurId: 'for-nontondji',
    promesse:
      'Choisissez les formats Instagram qui font réellement progresser un compte, et abandonnez les autres.',
    pourquoi:
      'Chaque format Instagram sert un objectif différent. Ce module cartographie les formats disponibles, leur coût de production et leur effet mesuré sur la croissance.',
    pourQui: [
      'Vous animez un compte Instagram professionnel.',
      'Votre croissance stagne malgré la régularité.',
      'Vous hésitez entre les formats.',
    ],
    prerequis: 'Disposer d’un compte professionnel Instagram.',
    chapitres: chapitres(
      'Cartographie des formats et de leur usage',
      'Produire un format court efficace au téléphone',
      'Lire ses statistiques et arbitrer',
    ),
    acquis: [
      'choisir un format selon son objectif ;',
      'produire un format court au téléphone ;',
      'lire les statistiques de son compte.',
    ],
    livrable: 'Un plan de production hebdomadaire calibré sur vos moyens.',
  }),
  moduleComplet({
    slug: 'publicite-sociale-lancer-sa-premiere-campagne',
    numero: 9,
    titre: 'Publicité sociale : lancer sa première campagne',
    programme: 'social-media',
    thematiqueId: 'th-sm-plateformes',
    formateurId: 'for-soboro',
    promesse:
      'Lancez une première campagne payante maîtrisée, avec un budget contenu et un résultat mesurable.',
    pourquoi:
      'La publicité sociale amplifie ce qui fonctionne déjà et gaspille tout le reste. Ce module suit une campagne réelle du cadrage jusqu’à la lecture des résultats.',
    pourQui: [
      'Vous n’avez jamais lancé de campagne payante.',
      'Vos précédentes campagnes n’ont pas été mesurées.',
      'Vous disposez d’un budget limité.',
    ],
    prerequis: 'Disposer d’une page professionnelle active.',
    chapitres: chapitres(
      'Choisir un objectif de campagne',
      'Construire une audience et une créa',
      'Lire un rapport et décider de la suite',
    ),
    acquis: [
      'paramétrer une campagne complète ;',
      'construire une audience pertinente ;',
      'interpréter un rapport de performance.',
    ],
    livrable: 'Un modèle de brief de campagne et une grille de lecture des résultats.',
  }),

  // ---------- Entrepreneurs ----------
  moduleComplet({
    slug: 'valider-son-idee-de-business-avant-dinvestir',
    numero: 1,
    titre: 'Valider son idée de business avant d’investir',
    programme: 'entrepreneurs',
    thematiqueId: 'th-ent-fondations',
    formateurId: 'for-declercq',
    promesse:
      'Vérifiez qu’une idée répond à un besoin réel avant d’y engager du temps et de l’argent.',
    pourquoi:
      'La majorité des projets échouent sur une hypothèse jamais vérifiée. Ce module transforme une intuition en série de tests simples, réalisables en quelques jours et sans budget.',
    pourQui: [
      'Vous avez une idée que vous n’avez pas encore testée.',
      'Vous hésitez à investir dans un premier stock ou un outil.',
      'Vous voulez éviter de construire ce que personne n’achètera.',
    ],
    prerequis: 'Aucun prérequis particulier.',
    chapitres: chapitres(
      'Formuler l’hypothèse à vérifier',
      'Concevoir un test réalisable en une semaine',
      'Décider : poursuivre, corriger ou abandonner',
    ),
    acquis: [
      'formuler une hypothèse testable ;',
      'concevoir un test rapide et peu coûteux ;',
      'prendre une décision fondée sur des retours réels.',
    ],
    livrable: 'Un protocole de test complété, avec critères de décision définis à l’avance.',
  }),
  moduleComplet({
    slug: 'fixer-le-juste-prix-de-ses-produits-et-services',
    numero: 2,
    titre: 'Fixer le juste prix de ses produits et services',
    programme: 'entrepreneurs',
    thematiqueId: 'th-ent-fondations',
    formateurId: 'for-declercq',
    promesse:
      'Apprenez à fixer un prix qui couvre vos coûts, valorise votre travail et reste cohérent avec votre marché.',
    pourquoi:
      'Un prix trop faible fragilise votre marge, tandis qu’un prix mal aligné avec le marché peut freiner la vente. Ce module vous aide à sortir des décisions prises uniquement au feeling pour construire et défendre un prix fondé sur des éléments concrets.',
    pourQui: [
      'Vous lancez ou gérez votre activité.',
      'Vous ne connaissez pas précisément votre coût de revient.',
      'Vous diminuez vos prix dès qu’un client négocie.',
      'Vous souhaitez mieux défendre la valeur de votre offre.',
    ],
    prerequis:
      'Aucun prérequis particulier. Prévoyez simplement les informations disponibles sur vos coûts, vos charges et vos prix actuels.',
    chapitres: chapitres(
      'Calculer son coût de revient réel, charges comprises',
      'Comprendre les trois stratégies de prix et savoir quand les utiliser',
      'Annoncer et défendre son prix face au client',
    ),
    acquis: [
      'calculer son coût de revient ;',
      'choisir une stratégie de prix ;',
      'présenter et défendre son prix avec davantage d’assurance.',
    ],
    livrable:
      'Une grille tarifaire construite à partir des coûts réels et directement utilisable pour présenter ses prix aux clients.',
    faq: [
      {
        question: 'Dois-je déjà avoir lancé mon activité ?',
        reponse:
          'Non. Le module convient également aux porteurs de projet qui souhaitent construire leurs premiers prix sur des bases plus solides.',
      },
      {
        question: 'Que faire si je ne connais pas encore tous mes coûts ?',
        reponse:
          'Le module vous aide à identifier les principales catégories à prendre en compte. Vous pourrez commencer avec les données disponibles, puis affiner progressivement vos calculs.',
      },
      {
        question: 'La méthode fonctionne-t-elle pour les produits et les services ?',
        reponse:
          'Oui. Le module présente les éléments à considérer selon la nature de l’offre afin d’adapter le calcul et la stratégie de prix.',
      },
    ],
  }),
  moduleComplet({
    slug: 'structurer-une-offre-claire-qui-se-vend',
    numero: 3,
    titre: 'Structurer une offre claire qui se vend',
    programme: 'entrepreneurs',
    thematiqueId: 'th-ent-fondations',
    formateurId: 'for-cocou',
    promesse:
      'Passez d’une liste de compétences à une offre qu’un client comprend et peut acheter immédiatement.',
    pourquoi:
      'Une offre floue se négocie toujours à la baisse. Ce module cadre le périmètre, le livrable, la promesse et le prix, puis construit l’argumentaire correspondant.',
    pourQui: [
      'Vous proposez « un peu de tout ».',
      'Vos devis donnent lieu à de longues discussions.',
      'Vous souhaitez formaliser une offre reproductible.',
    ],
    prerequis: 'Aucun prérequis particulier.',
    chapitres: chapitres(
      'Délimiter un périmètre et un livrable',
      'Écrire une promesse compréhensible en une phrase',
      'Construire l’argumentaire et traiter les objections',
    ),
    acquis: [
      'cadrer un périmètre ;',
      'écrire une offre lisible ;',
      'traiter les objections de prix.',
    ],
    livrable: 'Une fiche d’offre complète, prête à être envoyée à un prospect.',
  }),
  moduleComplet({
    slug: 'trouver-ses-premiers-clients',
    numero: 4,
    titre: 'Trouver ses premiers clients',
    programme: 'entrepreneurs',
    thematiqueId: 'th-ent-vente',
    formateurId: 'for-soboro',
    promesse:
      'Mettez en place une routine de prospection simple qui produit des rendez-vous dès la première semaine.',
    pourquoi:
      'Attendre que les clients viennent est la première cause d’arrêt d’activité. Ce module installe une méthode de prise de contact directe, adaptée aux réalités du marché local.',
    pourQui: [
      'Vous démarrez votre activité.',
      'Votre réseau proche est déjà épuisé.',
      'La prospection vous met mal à l’aise.',
    ],
    prerequis: 'Disposer d’une offre formulée.',
    chapitres: chapitres(
      'Constituer une liste de prospects qualifiés',
      'Écrire un premier message qui obtient une réponse',
      'Tenir une routine de prospection quotidienne',
    ),
    acquis: [
      'constituer une liste de prospects ;',
      'rédiger un message d’approche ;',
      'suivre ses relances sans outil complexe.',
    ],
    livrable: 'Une liste de 50 prospects qualifiés et une séquence de messages prête à l’emploi.',
  }),
  moduleComplet({
    slug: 'vendre-sans-site-web-whatsapp-business',
    numero: 5,
    titre: 'Vendre sans site web : WhatsApp Business de A à Z',
    programme: 'entrepreneurs',
    thematiqueId: 'th-ent-vente',
    formateurId: 'for-soboro',
    promesse:
      'Transformez WhatsApp Business en véritable canal de vente, du catalogue jusqu’à la relance.',
    pourquoi:
      'La majorité des ventes se concluent déjà sur WhatsApp, mais rarement de façon organisée. Ce module structure le catalogue, les réponses rapides, le suivi des commandes et les relances.',
    pourQui: [
      'Vous vendez déjà via WhatsApp sans méthode.',
      'Vous perdez des commandes dans le fil des conversations.',
      'Vous n’avez pas de site et n’en voulez pas pour l’instant.',
    ],
    prerequis: 'Disposer d’un numéro dédié à l’activité.',
    chapitres: chapitres(
      'Configurer un compte professionnel et un catalogue',
      'Structurer la conversation de vente',
      'Relancer et fidéliser sans être intrusif',
    ),
    acquis: [
      'configurer WhatsApp Business ;',
      'structurer une conversation de vente ;',
      'organiser ses relances.',
    ],
    livrable: 'Un catalogue configuré et un jeu de réponses rapides adapté à votre activité.',
  }),
  moduleComplet({
    slug: 'negocier-et-conclure-une-vente',
    numero: 6,
    titre: 'Négocier et conclure une vente',
    programme: 'entrepreneurs',
    thematiqueId: 'th-ent-vente',
    formateurId: 'for-cocou',
    promesse:
      'Menez un entretien de vente jusqu’à la décision, sans céder systématiquement sur le prix.',
    pourquoi:
      'Beaucoup d’entretiens se terminent par un « je vous rappelle ». Ce module donne une structure d’entretien et les formulations qui permettent de conclure ou d’obtenir un refus clair.',
    pourQui: [
      'Vous vendez vous-même vos prestations.',
      'Vos prospects reportent leur décision.',
      'Vous acceptez trop souvent de baisser vos prix.',
    ],
    prerequis: 'Avoir une offre et un prix définis.',
    chapitres: chapitres(
      'La structure d’un entretien de vente',
      'Traiter les objections sans céder sur le prix',
      'Conclure et sécuriser l’engagement',
    ),
    acquis: [
      'conduire un entretien structuré ;',
      'répondre aux objections courantes ;',
      'obtenir une décision explicite.',
    ],
    livrable: 'Une trame d’entretien annotée et une liste d’objections avec leurs réponses.',
  }),
  moduleComplet({
    slug: 'contenus-qui-attirent-des-clients',
    numero: 7,
    titre: 'Contenus qui attirent des clients',
    programme: 'entrepreneurs',
    thematiqueId: 'th-ent-visibilite',
    formateurId: 'for-othniel',
    promesse:
      'Produisez des contenus qui amènent des demandes entrantes plutôt que de simples félicitations.',
    pourquoi:
      'Un contenu apprécié n’est pas un contenu qui vend. Ce module oriente la production vers les sujets qui déclenchent une prise de contact.',
    pourQui: [
      'Vous publiez sans retombée commerciale.',
      'Vous manquez de temps pour produire.',
      'Vous voulez générer des demandes entrantes.',
    ],
    prerequis: 'Aucun prérequis particulier.',
    chapitres: chapitres(
      'Identifier les sujets qui déclenchent un contact',
      'Écrire un contenu qui amène à la conversation',
      'Installer un rythme tenable',
    ),
    acquis: [
      'choisir des sujets orientés demande ;',
      'écrire un appel à la conversation ;',
      'tenir un rythme de publication réaliste.',
    ],
    livrable: 'Une liste de 20 sujets à fort potentiel commercial pour votre activité.',
  }),
  moduleComplet({
    slug: 'etre-visible-localement-sur-internet',
    numero: 8,
    titre: 'Être visible localement sur internet',
    programme: 'entrepreneurs',
    thematiqueId: 'th-ent-visibilite',
    formateurId: 'for-akinocho',
    promesse:
      'Apparaissez dans les recherches locales de vos clients, sans budget publicitaire.',
    pourquoi:
      'Une part importante des achats commence par une recherche locale. Ce module met en place les bases : fiche établissement, avis, cohérence des informations et présence sur les plateformes utiles.',
    pourQui: [
      'Vous avez une activité avec une zone de chalandise.',
      'Vos clients vous trouvent difficilement en ligne.',
      'Vous n’avez pas de budget publicitaire.',
    ],
    prerequis: 'Aucun prérequis particulier.',
    chapitres: chapitres(
      'Créer et optimiser sa fiche établissement',
      'Obtenir et gérer des avis clients',
      'Assurer la cohérence de ses informations en ligne',
    ),
    acquis: [
      'créer une fiche établissement complète ;',
      'solliciter des avis clients ;',
      'maintenir des informations cohérentes.',
    ],
    livrable: 'Une check-list de présence locale complétée pour votre activité.',
  }),
  moduleComplet({
    slug: 'mesurer-ce-qui-fait-vraiment-avancer-son-activite',
    numero: 9,
    titre: 'Mesurer ce qui fait vraiment avancer son activité',
    programme: 'entrepreneurs',
    thematiqueId: 'th-ent-visibilite',
    formateurId: 'for-akinocho',
    promesse:
      'Suivez cinq indicateurs utiles plutôt que vingt tableaux que personne ne lit.',
    pourquoi:
      'Sans mesure, chaque décision se prend au ressenti. Ce module sélectionne les indicateurs qui comptent réellement pour une petite structure et installe une routine de suivi hebdomadaire.',
    pourQui: [
      'Vous ne savez pas quoi mesurer.',
      'Vous accumulez des données sans les exploiter.',
      'Vous voulez décider sur des faits.',
    ],
    prerequis: 'Aucun prérequis particulier.',
    chapitres: chapitres(
      'Choisir cinq indicateurs et écarter le reste',
      'Construire un tableau de bord en une page',
      'Tenir une revue hebdomadaire de quinze minutes',
    ),
    acquis: [
      'sélectionner ses indicateurs ;',
      'construire un tableau de bord simple ;',
      'installer une routine de revue.',
    ],
    livrable: 'Un tableau de bord d’une page, complété avec vos propres données.',
  }),
]

export const sessionsCoaching: SessionCoaching[] = [
  {
    id: 'ses-001',
    thematiqueId: 'th-ent-fondations',
    programme: 'entrepreneurs',
    formateurId: 'for-declercq',
    date: '2026-09-12',
    heure: '18:00',
    dureeMinutes: COACHING_COLLECTIF.dureeMinutes,
    places: COACHING_COLLECTIF.places,
    inscrits: 18,
    statut: 'planifiee',
  },
  {
    id: 'ses-002',
    thematiqueId: 'th-sm-copywriting',
    programme: 'social-media',
    formateurId: 'for-othniel',
    date: '2026-09-19',
    heure: '18:00',
    dureeMinutes: COACHING_COLLECTIF.dureeMinutes,
    places: COACHING_COLLECTIF.places,
    inscrits: 19,
    statut: 'planifiee',
  },
  {
    id: 'ses-003',
    thematiqueId: 'th-sm-fondations',
    programme: 'social-media',
    formateurId: 'for-waffo',
    date: '2026-10-03',
    heure: '18:30',
    dureeMinutes: COACHING_COLLECTIF.dureeMinutes,
    places: COACHING_COLLECTIF.places,
    inscrits: 7,
    statut: 'planifiee',
  },
]

export const articles: Article[] = [
  {
    id: 'art-accroches',
    slug: 'trois-secondes-pour-convaincre',
    titre: 'Trois secondes pour convaincre : anatomie d’une accroche',
    chapo:
      'Sur les formats courts, tout se joue avant la troisième seconde. Décomposition de ce qui retient réellement l’attention.',
    contenu: `## Ce que mesure la plateforme

La rétention initiale décide de la diffusion. Une vidéo excellente à partir de la dixième seconde ne sera jamais vue.

## Quatre accroches qui fonctionnent

1. La contradiction : annoncer l'inverse de ce qui est attendu.
2. Le chiffre précis : « 47 % des commerçants du marché… ».
3. La question fermée : elle force une réponse mentale.
4. Le geste : montrer avant de dire.

## Ce qui ne fonctionne plus

Le générique animé, la présentation de soi et le « bonjour tout le monde » coûtent les trois secondes qui comptent.`,
    auteurId: 'for-othniel',
    categorie: 'Social Média',
    image: '/images/blog/accroches.svg',
    imageAlt: 'Téléphone monté sur trépied filmant une intervenante',
    statut: 'publie',
    publieLe: '2026-07-28',
    majLe: '2026-08-02',
    tempsLectureMinutes: 4,
    aLaUne: true,
    modulesLies: ['mod-accroches-qui-stoppent-le-scroll-et-ia-copywriting'],
    seo: { indexable: true },
  },
  {
    id: 'art-prix',
    slug: 'pourquoi-vos-prix-sont-trop-bas',
    titre: 'Pourquoi vos prix sont trop bas (et comment le vérifier en 20 minutes)',
    chapo:
      'Sous-tarifer n’est presque jamais un choix stratégique : c’est un calcul qui n’a pas été fait. Voici comment le refaire.',
    contenu: `## Le symptôme

Vous travaillez beaucoup, votre chiffre d'affaires progresse, et pourtant la trésorerie ne suit pas. Dans neuf cas sur dix, le problème n'est pas le volume : c'est le prix unitaire.

## Le calcul que personne ne fait

Un prix juste couvre trois choses : les coûts directs de production, votre quote-part de coûts indirects, et votre rémunération. Retirez l'un des trois et vous vendez à perte sans le savoir.

### Les coûts directs

Listez tout ce qui disparaît quand la vente n'a pas lieu : matières, sous-traitance, transport.

### Les coûts indirects

Loyer, connexion, abonnements, amortissement du matériel. Divisez le total mensuel par le nombre d'unités vendues en moyenne.

### Votre rémunération

Fixez-la avant, pas après. C'est une charge, pas un reste.

## Et le marché ?

Le marché fixe une fourchette acceptable, pas votre prix. Si votre coût de revient sort de la fourchette, le problème est le modèle, pas le tarif.`,
    auteurId: 'for-declercq',
    categorie: 'Entrepreneuriat',
    image: '/images/blog/prix.svg',
    imageAlt: 'Calculatrice et carnet de comptes posés sur un bureau',
    statut: 'publie',
    publieLe: '2026-07-12',
    majLe: '2026-07-12',
    tempsLectureMinutes: 6,
    aLaUne: false,
    modulesLies: ['mod-fixer-le-juste-prix-de-ses-produits-et-services'],
    seo: { indexable: true },
  },
  {
    id: 'art-whatsapp',
    slug: 'whatsapp-business-le-canal-de-vente-le-plus-sous-estime',
    titre: 'WhatsApp Business : le canal de vente le plus sous-estimé',
    chapo:
      'La plupart des ventes se concluent déjà sur WhatsApp. Reste à arrêter de le faire au hasard.',
    contenu: `## Un canal déjà adopté

Vos clients y sont, vos concurrents aussi. Ce qui manque rarement, c'est l'audience ; c'est l'organisation.

## Trois réglages qui changent tout

1. Un catalogue à jour, avec des prix visibles.
2. Des réponses rapides pour les questions récurrentes.
3. Des étiquettes pour suivre l'état de chaque conversation.

## La relance

Une commande abandonnée se relance une fois, avec une information utile — jamais deux fois avec la même phrase.`,
    auteurId: 'for-soboro',
    categorie: 'Entrepreneuriat',
    image: '/images/blog/whatsapp.svg',
    imageAlt: 'Commerçante prenant une commande sur son téléphone',
    statut: 'publie',
    publieLe: '2026-06-30',
    majLe: '2026-06-30',
    tempsLectureMinutes: 5,
    aLaUne: false,
    modulesLies: ['mod-vendre-sans-site-web-whatsapp-business'],
    seo: { indexable: true },
  },
  {
    id: 'art-sessions',
    slug: 'nouvelles-sessions-de-coaching-collectif',
    titre: 'Nouvelles sessions de coaching collectif au calendrier',
    chapo:
      'Trois sessions supplémentaires ouvrent ce trimestre, une par thématique, dans la limite de 25 places.',
    contenu: `## Ce qui change

Chaque thématique dispose désormais d'une session dédiée, animée par le formateur de la thématique.

## Comment y participer

L'accès à un module de la thématique ouvre l'accès à la session correspondante. La fiche apprenant doit être complétée avant de rejoindre la séance.`,
    auteurId: 'for-declercq',
    categorie: 'Actualités E-Masterclass Big Five',
    image: '/images/blog/sessions.svg',
    imageAlt: 'Session de coaching collectif en visioconférence',
    statut: 'publie',
    publieLe: '2026-06-15',
    majLe: '2026-06-15',
    tempsLectureMinutes: 3,
    aLaUne: false,
    modulesLies: [],
    seo: { indexable: true },
  },
  {
    id: 'art-brouillon',
    slug: 'choisir-son-reseau-social-principal',
    titre: 'Choisir son réseau social principal',
    chapo: 'Article en cours de rédaction.',
    contenu: '## Brouillon\n\nContenu en préparation.',
    auteurId: 'for-waffo',
    categorie: 'Social Média',
    image: '/images/blog/placeholder.svg',
    imageAlt: 'Illustration générique',
    // Brouillon : ni public, ni indexable, ni présent dans le sitemap (spec SEO §5).
    statut: 'brouillon',
    publieLe: null,
    majLe: '2026-08-10',
    tempsLectureMinutes: 3,
    aLaUne: false,
    modulesLies: [],
    seo: { indexable: false },
  },
]

export const utilisateurs: Utilisateur[] = [
  {
    id: 'usr-aya',
    prenom: 'Aya',
    nom: 'Koné',
    email: 'aya@example.ci',
    whatsapp: '+225 07 00 00 00 00',
    pays: 'Côte d’Ivoire',
    role: 'apprenant',
    ficheCompletee: true,
  },
  {
    id: 'usr-moussa',
    prenom: 'Moussa',
    nom: 'Diabaté',
    email: 'moussa@example.ci',
    whatsapp: '+225 05 00 00 00 00',
    pays: 'Côte d’Ivoire',
    role: 'apprenant',
    ficheCompletee: true,
  },
  {
    id: 'usr-fatou',
    prenom: 'Fatou',
    nom: 'Bamba',
    email: 'fatou@example.bj',
    whatsapp: '+229 96 00 00 00',
    pays: 'Bénin',
    role: 'apprenant',
    ficheCompletee: false,
  },
  {
    id: 'usr-admin',
    prenom: 'Fatou',
    nom: 'Diarra',
    email: 'admin@bigfive.ci',
    role: 'admin-superieur',
  },
  {
    id: 'usr-editeur',
    prenom: 'Marc',
    nom: 'Assi',
    email: 'editeur@bigfive.ci',
    role: 'admin-contenu',
  },
  {
    id: 'usr-formateur',
    prenom: 'Coury',
    nom: 'Othniel',
    email: 'formateur@bigfive.ci',
    role: 'formateur',
    formateurId: 'for-othniel',
  },
]

export const acces: Acces[] = [
  {
    moduleId: 'mod-fixer-le-juste-prix-de-ses-produits-et-services',
    utilisateurId: 'usr-aya',
    progression: 100,
    acheteLe: '2026-09-10',
    termineLe: '2026-09-15',
  },
  {
    moduleId: 'mod-accroches-qui-stoppent-le-scroll-et-ia-copywriting',
    utilisateurId: 'usr-aya',
    progression: 45,
    acheteLe: '2026-10-02',
    termineLe: null,
  },
]

export const certificats: Certificat[] = [
  {
    numero: 'EMBF-ENT-2026-000128',
    utilisateurId: 'usr-aya',
    moduleId: 'mod-fixer-le-juste-prix-de-ses-produits-et-services',
    prenomNom: 'Aya Koné',
    titreModule: 'Fixer le juste prix de ses produits et services',
    programme: 'Entrepreneurs',
    thematique: 'Fondations du business',
    formateur: 'Jérémie De Clercq',
    dureeMinutes: 60,
    dateRealisation: '2026-09-15',
    dateDelivrance: '2026-09-15',
    tauxCompletion: 100,
  },
]

export const commandes: Commande[] = []

/** Réglages SEO globaux modifiables depuis le back-office. */
export const reglagesSeo = {
  titreParDefaut: 'E-Masterclass Big Five',
  gabaritTitre: '%s | E-Masterclass Big Five',
  descriptionParDefaut:
    'Des modules de 60 minutes pour les professionnels du Social Media et les entrepreneurs d’Afrique francophone. 10 000 FCFA TTC par module, accès à vie.',
  imageSocialeParDefaut: '/images/og-default.svg',
  googleSearchConsole: '',
  ga4: '',
}

/** Redirections permanentes créées lors des changements de slug (spec SEO §5). */
export const redirections: { de: string; vers: string; creeeLe: string }[] = []

// ---------------------------------------------------------------------------
// Back-office (planche C)
// ---------------------------------------------------------------------------

/** Paramètres de répartition, modifiables par l'admin principal (journalisé). */
export const reglagesFinanciers = {
  fraisPaiementPourcent: 4,
  partBigFivePourcent: 70,
  partFormateurPourcent: 30,
  objectifInscriptionsMensuel: 450,
  objectifCaMensuel: 4_500_000,
}

export const transactions: Transaction[] = [
  {
    reference: 'FP-2609-0412',
    utilisateurId: 'usr-aya',
    moduleId: 'mod-accroches-qui-stoppent-le-scroll-et-ia-copywriting',
    moyen: 'Orange Money',
    montant: PRIX_MODULE_FCFA,
    statut: 'reussie',
    date: '2026-09-26',
  },
  {
    reference: 'FP-2609-0411',
    utilisateurId: 'usr-moussa',
    moduleId: 'mod-vendre-sans-site-web-whatsapp-business',
    moyen: 'Wave',
    montant: PRIX_MODULE_FCFA,
    statut: 'reussie',
    date: '2026-09-26',
  },
  {
    reference: 'FP-2609-0410',
    utilisateurId: 'usr-fatou',
    moduleId: 'mod-instagram-formats-et-croissance',
    moyen: 'Visa',
    montant: PRIX_MODULE_FCFA,
    statut: 'echouee',
    date: '2026-09-25',
  },
  {
    reference: 'FP-2509-0388',
    utilisateurId: 'usr-aya',
    moduleId: 'mod-fixer-le-juste-prix-de-ses-produits-et-services',
    moyen: 'Djamo',
    montant: PRIX_MODULE_FCFA,
    statut: 'reussie',
    date: '2026-09-15',
  },
]

export const demandesCoachingPrive: DemandeCoachingPrive[] = [
  {
    id: 'dcp-001',
    utilisateurId: 'usr-aya',
    apprenant: 'Awa Koné',
    moduleId: 'mod-accroches-qui-stoppent-le-scroll-et-ia-copywriting',
    besoins:
      'Retravailler mes accroches pour un client dans la restauration, je n’arrive pas à dépasser 2 % d’engagement.',
    disponibilites: 'Soirs de semaine après 18 h, samedi matin.',
    heures: 2,
    statut: 'en-attente',
    recueLe: '2026-09-24',
  },
  {
    id: 'dcp-002',
    utilisateurId: 'usr-moussa',
    apprenant: 'Moussa Diabaté',
    moduleId: 'mod-vendre-sans-site-web-whatsapp-business',
    besoins: 'Structurer mes relances WhatsApp après un premier échange.',
    disponibilites: 'Samedi matin.',
    heures: 2,
    statut: 'payee',
    creneau: 'Samedi 12/09, 10h – 12h',
    recueLe: '2026-09-02',
  },
  {
    id: 'dcp-003',
    utilisateurId: 'usr-fatou',
    apprenant: 'Fatou Bamba',
    moduleId: 'mod-instagram-formats-et-croissance',
    besoins: 'Construire une présence Instagram pour ma marque de cosmétiques.',
    disponibilites: 'Mercredi après-midi.',
    heures: 1,
    statut: 'confirmee-attente-paiement',
    recueLe: '2026-09-18',
  },
]

export const candidaturesFormateurs: CandidatureFormateur[] = [
  {
    id: 'cand-001',
    nom: 'Éric N’Guessan',
    expertise: 'Publicité Meta Ads',
    message:
      '6 ans de gestion de campagnes pour des PME ivoiriennes, je veux enseigner la publicité payante aux SMM.',
    whatsapp: '+225 05 44 00 00 00',
    lien: 'https://www.linkedin.com/',
    statut: 'nouvelle',
    recueLe: '2026-09-20',
  },
  {
    id: 'cand-002',
    nom: 'Salimata Traoré',
    expertise: 'Branding & identité visuelle',
    message: 'Directrice artistique, je souhaite proposer un module sur l’identité de marque.',
    whatsapp: '+225 07 11 00 00 00',
    statut: 'en-etude',
    recueLe: '2026-09-12',
  },
]

export const journal: EntreeJournal[] = [
  {
    id: 'j-001',
    auteur: 'Fatou Diarra',
    action: 'a publié le module',
    cible: 'Accroches qui stoppent le scroll & IA copywriting',
    date: '2026-09-26T09:10:00Z',
  },
  {
    id: 'j-002',
    auteur: 'Marc Assi',
    action: 'a modifié la fiche',
    cible: 'Vendre sans site web : WhatsApp Business de A à Z',
    date: '2026-09-26T07:40:00Z',
  },
  {
    id: 'j-003',
    auteur: 'Fatou Diarra',
    action: 'a attribué un accès gratuit',
    cible: 'motif : lot concours',
    date: '2026-09-25T16:05:00Z',
  },
]

/** Personas apprenants, transmis aux formateurs avant les sessions. */
export const personas: Record<string, Persona> = {
  'usr-aya': {
    age: 27,
    secteur: 'Agence digitale',
    experience: '1 à 3 ans',
    reseaux: 'Instagram, TikTok',
    objectif: 'Signer 3 clients d’ici décembre',
  },
  'usr-moussa': {
    age: 34,
    secteur: 'Commerce de détail',
    experience: '3 à 5 ans',
    reseaux: 'WhatsApp, Facebook',
    objectif: 'Doubler les commandes entrantes',
  },
}

export function enregistrerJournal(auteur: string, action: string, cible: string) {
  journal.unshift({
    id: `j-${journal.length + 1}`,
    auteur,
    action,
    cible,
    date: new Date().toISOString(),
  })
}


export const inscriptionsSessions: InscriptionSession[] = []

export const sujetsSessions: SujetSession[] = [
  {
    id: 'suj-001',
    sessionId: 'ses-002',
    utilisateurId: 'usr-aya',
    apprenant: 'Awa K.',
    preoccupation: 'Mes accroches sont vues mais ne génèrent presque aucun clic.',
    attente: 'Une méthode pour tester plusieurs accroches rapidement.',
    soumisLe: '2026-09-05',
  },
  {
    id: 'suj-002',
    sessionId: 'ses-002',
    utilisateurId: 'usr-moussa',
    apprenant: 'Moussa D.',
    preoccupation: 'Adapter une même accroche à Instagram et LinkedIn sans la réécrire.',
    attente: 'Des repères concrets par plateforme.',
    soumisLe: '2026-09-06',
  },
]

export const notesFormateurs: NoteFormateur[] = [
  {
    id: 'note-001',
    formateurId: 'for-othniel',
    utilisateurId: 'usr-moussa',
    origine: 'collective',
    note: 5,
    commentaire: 'Cas pratiques très concrets',
    date: '2026-08-12',
  },
  {
    id: 'note-002',
    formateurId: 'for-othniel',
    utilisateurId: 'usr-fatou',
    origine: 'privee',
    note: 4,
    commentaire: 'J’aurais aimé plus de temps',
    date: '2026-07-28',
  },
]
