import { inviteLink } from '../../../../reseau/invite/index.js';
import { etat } from '../../etat.js';
import { copy } from '../../outils/copy.js';
import { $ } from '../../outils/dollar.js';

$('btn-copy-offer').onclick = () => copy(inviteLink(etat.offerCode, etat.session.state?.gid), 'Lien copié. Envoie-le au joueur.');
