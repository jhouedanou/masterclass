**Objet :** Tracking GA4 / GTM / Meta intégré, avec quelques questions pour finaliser

Bonjour Franck, bonjour Houéfa,

Toutes les informations que vous nous avez envoyées ont été intégrées à la plateforme :

- Google Analytics 4 : propriété « E-Masterclass Big Five », ID de mesure `G-7Y25B7NCW8` ;
- Google Tag Manager : conteneur `GTM-KVFTGVVX` ;
- Meta : Pixel `27994812226860406` et jeton de l'API Conversions. Le jeton reste uniquement côté serveur : il n'apparaît jamais dans le code des pages.

Les six événements Meta demandés sont en place, chacun relayé aussi vers GA4 sous son nom standard :

| Événement Meta | Déclenchement | Nom GA4 |
|---|---|---|
| PageView | chaque page publique visitée, tunnel d'achat compris | page_view |
| ViewContent | ouverture de la fiche d'un module (/modules/…) | view_item |
| CompleteRegistration | création de compte terminée (tunnel d'achat ou page Inscription) | sign_up |
| InitiateCheckout | clic sur « Acheter ce module » | begin_checkout |
| AddPaymentInfo | clic sur « Payer », avec le moyen choisi (Mobile Money, Wave…) | add_payment_info |
| Purchase | paiement confirmé par FeexPay, avec le montant en XOF | purchase |

CompleteRegistration et Purchase partent aussi de notre serveur, par l'API Conversions. Un achat Mobile Money se valide sur le téléphone, et l'acheteur ne revient pas toujours sur le site : il est quand même compté. Meta dédoublonne automatiquement les deux envois.

**Vos accès administrateur**

- **Houéfa, votre compte administrateur supérieur existe déjà** : `houefa@bigfiveabidjan.com`, créé le 14/09, mais jamais utilisé à ce jour.
- **Franck, vous avez désormais le même accès** sur `franck@bigfiveabidjan.com`.

Un mot de passe provisoire vous parvient à chacun par un autre canal. Pour votre première connexion sur /admin/login :
1. saisissez votre adresse et le mot de passe provisoire ;
2. scannez le QR code affiché avec Google Authenticator, puis saisissez le code à six chiffres. Aucun code n'est envoyé par e-mail ou SMS : c'est l'application qui le donne ;
3. conservez vos codes de secours, puis changez votre mot de passe dans « Paramètres ».

**Nos questions pour finaliser**

1. **Configuration de GTM.** Les événements arrivent dans le conteneur, mais GA4 ne les reçoit que si des balises y sont configurées : une balise Google avec `G-7Y25B7NCW8`, et des balises d'événement GA4 sur les noms du tableau. Qui s'en charge de votre côté ? Nous pouvons aussi vous fournir un conteneur prêt à importer avec le compte analyticsbigfive@gmail.com.
2. **ViewContent.** Nous le déclenchons sur la fiche publique d'un module, celle qui sert aux campagnes. Faut-il aussi le compter quand un apprenant ouvre un module déjà acheté dans son espace ? Aujourd'hui, les espaces apprenant, formateur et administration ne sont jamais mesurés, par choix de confidentialité.
3. **Coaching privé.** Le paiement d'une séance de coaching privé doit-il compter comme un Purchase, au même titre qu'un module ? Pour l'instant, oui.
4. **Consentement.** Le Pixel Meta ne se charge que pour les visiteurs qui acceptent les cookies « Marketing », et GA4 que pour ceux qui acceptent la « Mesure d'audience ». Les volumes affichés par Meta et GA4 seront donc inférieurs au trafic réel. Est-ce bien ce que vous souhaitez ?
5. **Domaine.** Quel sera le domaine définitif du site ? Il faut le vérifier dans Meta Business Suite, rubrique Sécurité de la marque > Domaines, pour que les conversions soient pleinement attribuées.
6. **Test de l'API Conversions.** Pouvez-vous nous transmettre un code de test, disponible dans le Gestionnaire d'événements > Tester les événements ? Il nous permet de valider les envois serveur sans fausser vos statistiques.
7. **Sécurité du jeton.** Le jeton de l'API Conversions a circulé en clair par e-mail. Une fois l'intégration validée, nous vous recommandons d'en générer un nouveau dans le Gestionnaire d'événements et de nous le transmettre par un canal sûr. Nous le remplacerons.

Merci d'avance pour vos retours,

Jean-Luc
