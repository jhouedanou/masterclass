# Transcriptions — fichiers d'exemple

Deux modèles pour l'import d'une transcription de chapitre, dans l'administration :
onglet du chapitre → **Transcription** → *Importer un fichier*.

| Fichier | Format | Quand l'utiliser |
|---|---|---|
| [`transcription-exemple.srt`](transcription-exemple.srt) | SRT | Le plus courant. C'est ce que produisent YouTube, Premiere, DaVinci et la plupart des outils de sous-titrage automatique. |
| [`transcription-exemple.vtt`](transcription-exemple.vtt) | WebVTT | Quand la transcription distingue plusieurs voix, ou quand votre outil ne sort que du VTT. Commenté ligne à ligne. |

Les deux fichiers portent le même extrait — module 8, chapitre 1 — et passent
l'import tels quels. Le VTT rend 7 passages, le SRT 6.

## Ce que l'import exige

- Un fichier **`.srt` ou `.vtt`**, **1 Mo maximum**. Un `.txt` renommé est refusé.
- Une ligne de temps par réplique, portant la flèche `-->`, et du texte en dessous.
- Au moins une réplique horodatée. Un fichier sans horodatage est rejeté plutôt
  qu'importé vide — sans quoi il effacerait une transcription déjà en place.

Tout le reste est facultatif : identifiants de réplique, balises de mise en forme,
réglages de placement, blocs `NOTE`, entités HTML. Virgule ou point pour les
millisecondes, heures présentes ou non : les deux passent.

## Ce que l'import fait

Il **regroupe les répliques en passages de lecture**. Une réplique de sous-titre
dure deux à cinq secondes ; un chapitre de quarante minutes en produit cinq à huit
cents, illisibles telles quelles sous la vidéo. Le regroupement s'arrête sur une
fin de phrase, un changement de voix (`<v Nom>`), ou au bout d'une vingtaine de
secondes. Sur un chapitre très long, il élargit automatiquement ses seuils.

**Vous n'avez donc rien à découper vous-même.** Sortez le fichier de votre outil
et importez-le.

Seul le **début** de chaque passage est conservé, au format `mm:ss` — c'est lui qui
rend le passage cliquable pendant la lecture. Les horodatages de fin sont ignorés :
inutile de les ajuster au millième.

## Le seul vrai travail : relire

Une transcription automatique se trompe sur les noms propres, les sigles et les
termes techniques. « 360Brew » ressort en « 360 Brew », « 360 brou », parfois
« 360 bruit ». Les noms des formateurs y passent aussi.

La transcription est lue par les apprenants et indexée : elle mérite la même
relecture qu'un texte publié.
