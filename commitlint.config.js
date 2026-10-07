export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Messaggi in italiano: la regola sul maiuscolo/minuscolo del soggetto sarebbe troppo rigida.
    'subject-case': [0],
    'header-max-length': [2, 'always', 120],
    // I body generati da Dependabot (link ai changelog) superano sempre i 100 caratteri.
    'body-max-line-length': [0],
  },
}
