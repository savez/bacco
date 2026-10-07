<script setup>
// Invito a sostenere il progetto. È un semplice link: nessuna richiesta di rete parte
// dall'app e nessun dato del registro lascia il dispositivo.
const SUPPORT_URL = 'https://buymeacoffee.com/goeokwihgz'
</script>

<template>
  <a
    :href="SUPPORT_URL"
    target="_blank"
    rel="noopener noreferrer"
    class="flex items-center gap-3 rounded-3xl border-2 border-luppolo bg-doga p-4 shadow-lg ring-1 ring-inset ring-luppolo/30 ring-offset-4 ring-offset-doga transition-transform active:scale-[0.98]"
  >
    <span
      class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-luppolo text-doga shadow-inner"
      aria-hidden="true"
    >
      <!-- Calice e boccale che brindano, come l'icona dell'app. -->
      <svg viewBox="0 0 32 32" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 9h8c0 5-1.6 7.5-4 7.5S5 14 5 9Z" fill="currentColor" fill-opacity=".35" />
        <path d="M9 16.5V24M6 24h6" />
        <rect x="16.5" y="11" width="8" height="13" rx="1.5" fill="currentColor" fill-opacity=".35" />
        <path d="M24.5 14h1.5a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1.5" />
        <path d="M16 3.5v2.5M12.5 4.5l1.2 2M19.5 4.5l-1.2 2" />
      </svg>
    </span>
    <span class="min-w-0 flex-1">
      <span class="block text-sm text-cenere">Ti piace Bacco?</span>
      <span class="block text-base font-bold leading-snug text-gesso sm:text-lg">Offrimi una birra o un vino</span>
    </span>
    <span class="shrink-0 rounded-full bg-luppolo px-3 py-2.5 sm:px-4 text-sm font-bold text-doga">
      Sostieni <span aria-hidden="true">→</span>
    </span>
    <span class="sr-only">(si apre in una nuova scheda)</span>
  </a>
</template>
