export const SAVE_KEY = 'astra.save'; // la partie en cours (elle seule, D-415)

export const GAME_KEY = 'astra.save.'; // + gid : une partie de l'historique, autre que celle en cours

export const INDEX_KEY = 'astra.games'; // historique : { gid: savedAt }, parties autres que celle en cours

export const OLD_KEY = 'astra.saves'; // ancien historique d'un seul bloc (avant D-415), repris puis effacé

export const ID_KEY = 'astra.identity'; // mon identité dans la partie en cours

export const IDS_KEY = 'astra.identities'; // historique : { gid: identité }

export const KEEP = 10; // nombre de parties gardées, partie en cours comprise

export const RETELL = 60_000; // échecs à la suite : on prévient de nouveau au plus une fois par minute
