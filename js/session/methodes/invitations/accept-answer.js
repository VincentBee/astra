export async function acceptAnswer(answer) {
  if (!this.invite) throw Object.assign(new Error('Cette invitation a déjà servi.'), { used: true });
  const invite = this.invite;
  const link = await invite.accept(answer);
  if (this.invite === invite) this.invite = null;
  this.attach(link, null);
  return link;
}
