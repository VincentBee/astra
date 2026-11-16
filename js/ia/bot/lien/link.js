/**
 * Copie d'une fiche pour une autre Session du même téléphone (D-370) : tout est recopié comme
 * par le réseau (JSON), sauf les entrées du journal des ordres, partagées. Une entrée ne change
 * plus une fois l'ordre fini : elle est gelée, et aucune Session ne peut la modifier chez une
 * autre (une tentative lève une erreur). La dernière entrée peut être celle de l'ordre en cours
 * de l'expéditeur (encore modifiable) : elle est recopiée. Le journal fait jusqu'à 1 500
 * entrées, la fiche sans lui quelques Ko : c'était l'essentiel du travail (issue #39).
 * Règle dont dépend le gel : l'entrée de l'ordre en cours (`entry`, la seule qu'on modifie) est
 * toujours la dernière du journal de son joueur (touch l'ajoute une fois, à la fin). Si cela
 * change, une écriture dans une entrée gelée lèvera une erreur (modules en mode strict) : on le
 * verra tout de suite, rien ne sera corrompu en silence.
 */
/** `fullCopy` : tout recopier en JSON, comme avant D-370 (tests : la partie doit être la même). */
export const LINK = { fullCopy: false };
