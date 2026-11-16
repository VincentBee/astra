/** La flotte est-elle encore en route à `now` ? */
// Un segment immobile (from = to) n'est jamais « en route », même si un autre
// téléphone, à l'heure un peu différente, l'a figé dans son futur proche.
export const moving = (f, now) => f.arrive > now && (f.from.x !== f.to.x || f.from.y !== f.to.y);
