// Toutes les fenêtres se ferment d'un toucher sur le fond sombre ou avec Échap (comme leur croix).
// Échap ferme seulement celle du dessus (#72) : toutes les fenêtres ont le même z-index (style.css,
// `.sheet`), donc celle qui se voit devant est la dernière ouverte dans l'ordre du HTML. Un deuxième
// Échap ferme la suivante. Le « retour » en partie (D-417) ferme la même : `topSheet`.
for (const sheet of document.querySelectorAll('.sheet')) {
  sheet.addEventListener('click', (e) => {
    if (e.target === sheet) sheet.querySelector('.close-btn')?.click();
  });
}
