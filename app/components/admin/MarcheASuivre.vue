<script setup lang="ts">
/**
 * Marche à suivre remise à la personne qui dépose.
 *
 * Vidéo et transcription sont fournies par elle : la plateforme ne convertit
 * ni ne transcrit. Ce mode d'emploi est donc de l'interface, pas de la
 * documentation — s'il n'est pas sous les yeux au moment du dépôt, il n'est lu
 * par personne. Un seul composant pour les deux emplacements, faute de quoi
 * les deux textes divergeraient.
 */
defineProps<{ sujet: 'video' | 'script' }>()

const lien = 'text-social underline'
</script>

<template>
  <details class="mt-3 rounded-[12px] border border-ligne-claire bg-fond-voile p-4">
    <summary class="cursor-pointer text-[13px] font-bold text-encre">
      {{ sujet === 'video' ? 'Comment préparer la vidéo' : 'Comment obtenir la transcription' }}
    </summary>

    <div v-if="sujet === 'video'" class="mt-3 text-[13px] text-texte">
      <ol class="ml-4 list-decimal space-y-1.5">
        <li>
          Ouvrez votre montage dans
          <a href="https://handbrake.fr/" target="_blank" rel="noopener noreferrer" :class="lien">HandBrake</a>
          — gratuit, Windows / macOS / Linux.
        </li>
        <li>
          Préréglage <b>Fast 1080p30</b>. N’allez pas au-delà de 1080p : l’image ne gagne rien et
          le fichier double.
        </li>
        <li>
          Onglet <i>Summary</i>, cochez <b>Web Optimized</b>. Sans cette case, l’apprenant attend
          le téléchargement complet avant la première image et ne peut pas se déplacer dans la
          vidéo. Le dépôt refuse d’ailleurs les fichiers qui ne l’ont pas.
        </li>
        <li>Format <b>MP4</b>, vidéo <b>H.264</b>, audio <b>AAC</b> — les réglages du préréglage.</li>
        <li><i>Start Encode</i>, puis déposez le fichier obtenu ici. Visez moins de 700 Mo.</li>
      </ol>
    </div>

    <div v-else class="mt-3 text-[13px] text-texte">
      <p>Trois voies, de la plus simple à la plus autonome. Toutes produisent un .srt ou un .vtt.</p>
      <ul class="mt-2 ml-4 list-disc space-y-2">
        <li>
          <b>Par YouTube, sans rien installer.</b> Mettez la vidéo en ligne en <i>non répertoriée</i>,
          attendez les sous-titres automatiques français, ouvrez
          <i>Sous-titres → Français (généré automatiquement) → Modifier</i>, corrigez les erreurs,
          puis <i>Actions → Télécharger → .srt</i>. Supprimez ensuite la vidéo de YouTube : elle
          n’a servi qu’à la transcription.
        </li>
        <li>
          <b>Par Subtitle Edit</b> (Windows, gratuit,
          <a href="https://www.nikse.dk/subtitleedit" target="_blank" rel="noopener noreferrer" :class="lien">nikse.dk/subtitleedit</a>)
          : <i>Video → Audio to text (Whisper)</i>, modèle <i>small</i> ou <i>medium</i>, langue
          français. Tout se passe sur votre machine — la voie à retenir si le contenu ne doit pas
          transiter par un service tiers.
        </li>
        <li>
          <b>Par MacWhisper</b> (macOS) : glissez la vidéo, langue français, <i>Export → SRT</i>.
        </li>
      </ul>
      <p class="mt-2">
        Dans tous les cas, <b>relisez</b>. Une transcription automatique se trompe sur les noms
        propres, les marques et les mots ivoiriens. Le script s’affiche sous la vidéo et se clique
        pour s’y déplacer : une erreur y est aussi visible qu’une faute sur la page publique.
      </p>
      <p class="mt-2 text-discret">
        Inutile de reformater quoi que ce soit : le découpage en passages lisibles, la conversion
        des horodatages et le nettoyage des balises se font au dépôt.
      </p>
    </div>
  </details>
</template>
