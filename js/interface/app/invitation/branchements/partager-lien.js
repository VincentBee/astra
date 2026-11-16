import { inviteLink } from '../../../../invite.js';
import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { share } from '../../outils/share.js';

$('btn-share-offer').onclick = () => share(inviteLink(etat.offerCode, etat.session.state?.gid), 'Rejoins ma partie Astra');
