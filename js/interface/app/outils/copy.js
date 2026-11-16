import { toast } from './toast.js';

export async function copy(text, okMessage) {
  try {
    await navigator.clipboard.writeText(text);
    toast(okMessage);
  } catch {
    toast('Copie impossible ici : appuie longuement sur le texte pour le copier.');
  }
}
