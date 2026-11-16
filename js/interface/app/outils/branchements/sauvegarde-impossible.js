import { onSaveFailed } from '../../../../reseau/save/index.js';
import { toast } from '../toast.js';

// Mémoire du téléphone pleine malgré le ménage de l'historique (D-415) : le joueur est prévenu.
onSaveFailed((kind, n) => {
  if (kind === 'history') return toast(`Mémoire du téléphone pleine : ${n} ancienne${n > 1 ? 's' : ''} partie${n > 1 ? 's' : ''} n’${n > 1 ? 'ont' : 'a'} pas pu être gardée${n > 1 ? 's' : ''}.`, 8000);
  toast('Sauvegarde impossible : la mémoire du téléphone est pleine. La partie continue, mais elle ne sera pas gardée si tu fermes l’appli.', 8000);
  return document.visibilityState !== 'hidden'; // appli cachée : pas de toast, on redira au prochain échec
});
