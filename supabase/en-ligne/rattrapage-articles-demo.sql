-- Rattrapage : retrait des articles de démonstration du blog
--
-- Le jeu de données d'origine publiait cinq articles rédigés pour la
-- démonstration (accroches, prix, WhatsApp, « nouvelles sessions »,
-- brouillon). Ils n'émanent pas de l'équipe Big Five, et l'un annonce des
-- sessions qui n'existent pas. Le brief du 02/11 demande de n'afficher que
-- les articles de l'équipe, saisis au back-office.
--
-- À exécuter une fois dans SQL Editor. Seuls ces cinq identifiants sont
-- visés : un article créé depuis le back-office n'est pas touché. Sans effet
-- s'ils ont déjà été supprimés.

delete from articles_modules
 where article_id in ('art-accroches', 'art-prix', 'art-whatsapp', 'art-sessions', 'art-brouillon');

delete from articles
 where id in ('art-accroches', 'art-prix', 'art-whatsapp', 'art-sessions', 'art-brouillon');
