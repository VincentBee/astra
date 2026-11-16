import { answerInvite } from '../../../peer.js';
import { inviteGid } from '../../../invite.js';

/** Invité : lit l'invitation et renvoie la réponse à montrer à l'hôte. */
export async function answer(offer) {
  this.pendingAnswer?.cancel();
  const ans = await answerInvite(offer);
  this.inviteGid = inviteGid(offer); // la partie de l'hôte, si le lien la dit (D-260)
  this.pendingAnswer = ans;
  this.status = 'answering';
  ans.link.then(
    (link) => this.onFirstLink(link),
    (e) => {
      if (this.pendingAnswer !== ans) return;
      this.pendingAnswer = null;
      this.status = 'failed';
      this.failure = e.message;
      this.changed();
    },
  );
  return ans.code;
}
