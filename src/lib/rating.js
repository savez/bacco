// Livelli del punteggio 1-5 (data-model.md). Testi fissi, non modificabili dall'utente.
export const RATING_LEVELS = [
  {
    value: 1,
    label: 'Difettoso',
    description: 'Presenza di difetti evidenti (es. sentore di tappo, ossidazione eccessiva).',
  },
  {
    value: 2,
    label: 'Non armonico / Bassa qualità',
    description: 'Bevanda squilibrata o di qualità percepita inferiore.',
  },
  {
    value: 3,
    label: 'Piacevole / Corretto',
    description: 'Esperienza gradevole senza particolari lodi o critiche.',
  },
  {
    value: 4,
    label: 'Ottimo / Molto tipico',
    description:
      "Rappresentativa dello stile o dell'annata, equilibrata e più piacevole della media.",
  },
  {
    value: 5,
    label: 'Eccellente / Memorabile',
    description:
      'Esperienza straordinaria, da ricordare per complessità, eleganza o significato personale.',
  },
]

/** @param {number} value @returns {{value:number,label:string,description:string}|undefined} */
export function getRatingLevel(value) {
  return RATING_LEVELS.find((l) => l.value === value)
}
