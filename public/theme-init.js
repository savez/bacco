// Applica il tema prima del primo render, per evitare il flash del tema sbagliato
// (costituzione, principio V). Deve restare un file esterno: uno script inline
// violerebbe la Content-Security-Policy (nessun 'unsafe-inline').
(function () {
  try {
    var pref = localStorage.getItem('bacco-theme') || 'system'
    var wantsDark =
      pref === 'dark' ||
      (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    if (wantsDark) {
      document.documentElement.classList.add('dark')
    }
  } catch {
    // localStorage non disponibile (modalità privata, storage bloccato): si resta
    // sul tema chiaro di default, nessun errore bloccante.
  }
})()
