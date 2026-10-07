## Cosa cambia

(breve descrizione del cambiamento)

## Perché

(motivazione: bug fix, nuova funzione, miglioria UX, refactor…)

## Test plan

- [ ] `docker compose exec dev npm run lint` verde
- [ ] `docker compose exec dev npm test` verde
- [ ] `docker compose exec dev npm run build` verde
- [ ] Provato a mano su http://localhost:5173 (tema chiaro e scuro, larghezza telefono)
- [ ] (se PWA / service worker) provato con `docker compose up --build web`
- [ ] Nessun dato del registro esce dal dispositivo (vedi [costituzione](.specify/memory/constitution.md))

## Tipo di cambiamento

- [ ] Bug fix (non breaking)
- [ ] Nuova funzione (non breaking)
- [ ] Breaking change
- [ ] Refactor / chore
- [ ] Documentazione

## Note per la review

(scelte di compromesso, screenshot, issue collegate)
