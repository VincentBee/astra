import { decode, inviteGid } from '../../../invite.js';
import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';
import { show } from '../outils/show.js';
import { startJoin } from '../rejoindre/start-join.js';

export async function boot() {
  const hash = location.hash.slice(1);
  if (hash) {
    // La partie de l'hôte (`?g=`, D-260) suit le code jusqu'à session.answer.
    const gid = inviteGid(location.href);
    const invite = gid ? `?g=${gid}#${hash}` : hash;
    history.replaceState(null, '', location.pathname);
    try {
      const { kind } = await decode(hash);
      if (kind === 'o') {
        if ($('name').value.trim()) return startJoin(invite);
        $('home-note').textContent = 'Invitation reçue. Choisis ton nom, puis appuie sur « Rejoindre une partie ».';
        $('home-note').hidden = false;
        etat.pendingInvite = invite; // consommé au premier appui sur « Rejoindre » (#69) ; garde le `?g=` (D-260)
        return show('home');
      }
      $('home-note').textContent =
        "Ce lien est la réponse d'un joueur : colle-la dans l'écran d'invitation de ta partie en cours, sur le téléphone qui l'a invité.";
      $('home-note').hidden = false;
    } catch (e) {
      $('home-note').textContent = e.message;
      $('home-note').hidden = false;
    }
  }
  show('home');
}
