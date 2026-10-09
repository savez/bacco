import { ref, computed } from 'vue'

/**
 * Stato condiviso a livello di modulo: un solo banner visibile alla volta.
 * Priorità più alta = più importante; un banner più prioritario mette in coda
 * quello attualmente visibile, che riappare quando la coda si svuota.
 * Valori di priorità usati nell'app: errori 100, promemoria backup 50,
 * aggiornamento app 40, conferme ("Bottiglia salvata") 30, installazione 10.
 *
 * Tono: 'success' (predefinito, le conferme), 'info' (aggiornamento, backup, offline pronto),
 * 'error'. Durata: una conferma senza azioni sparisce dopo 3 s; un messaggio con azioni resta
 * finché non si sceglie (salvo `timeout` esplicito, es. Annulla dopo Stappa); un errore resta
 * finché non si chiude.
 */
const CONFIRM_TIMEOUT_MS = 3000
const queue = ref([])
const current = computed(() => queue.value[0] ?? null)
let timeoutHandle

function sortQueue() {
  queue.value.sort((a, b) => b.priority - a.priority)
}

function scheduleAutoDismiss() {
  clearTimeout(timeoutHandle)
  const top = current.value
  if (top && top.timeout) {
    timeoutHandle = setTimeout(() => dismissBanner(top.id), top.timeout)
  }
}

/**
 * @param {{id:string, message:string, actions?:{label:string,onClick:()=>void}[],
 *   tone?:'success'|'info'|'error', timeout?:number, priority?:number}} banner
 */
export function showBanner({ id, message, actions = [], tone = 'success', timeout, priority = 0 }) {
  queue.value = queue.value.filter((b) => b.id !== id)
  const resolvedTimeout = timeout ?? (actions.length === 0 && tone !== 'error' ? CONFIRM_TIMEOUT_MS : undefined)
  queue.value.push({ id, message, actions, tone, timeout: resolvedTimeout, priority })
  sortQueue()
  scheduleAutoDismiss()
}

/** @param {string} id */
export function dismissBanner(id) {
  queue.value = queue.value.filter((b) => b.id !== id)
  scheduleAutoDismiss()
}

/** Composable: il banner attualmente visibile (computed ref, o null). */
export function useBanner() {
  return { current }
}
